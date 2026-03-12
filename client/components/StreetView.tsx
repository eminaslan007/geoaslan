'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

interface StreetViewProps {
    lat: number;
    lng: number;
    mode: 'classic' | 'no_move' | 'nmpz';
}

declare global {
    interface Window {
        google: any;
        initStreetView: () => void;
    }
}

export default function StreetView({ lat, lng, mode }: StreetViewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const panoramaRef = useRef<any>(null);
    const svServiceRef = useRef<any>(null);
    const [status, setStatus] = useState<'loading' | 'ready' | 'no_coverage'>('loading');

    // En yakın panoramayı bul ve göster
    const findAndShowPanorama = useCallback((targetLat: number, targetLng: number) => {
        if (!window.google || !containerRef.current) return;

        setStatus('loading');

        // StreetViewService ile en yakın panoramayı ara
        if (!svServiceRef.current) {
            svServiceRef.current = new window.google.maps.StreetViewService();
        }

        const searchLocation = new window.google.maps.LatLng(targetLat, targetLng);

        svServiceRef.current.getPanorama(
            {
                location: searchLocation,
                radius: 50000,  // 50 km yarıçapında ara
                preference: window.google.maps.StreetViewPreference.NEAREST,
                source: window.google.maps.StreetViewSource.OUTDOOR,
            },
            (data: any, svStatus: any) => {
                if (svStatus === window.google.maps.StreetViewStatus.OK && data?.location?.latLng) {
                    const panoLocation = data.location.latLng;

                    if (!panoramaRef.current) {
                        // İlk kez panorama oluştur
                        const options: any = {
                            position: panoLocation,
                            pov: { heading: Math.random() * 360, pitch: 0 },
                            zoom: 1,
                            addressControl: false,
                            showRoadLabels: false,
                            fullscreenControl: false,
                            motionTracking: false,
                            motionTrackingControl: false,
                            zoomControl: mode !== 'nmpz',
                            panControl: mode !== 'nmpz',
                            linksControl: mode === 'classic',
                            clickToGo: mode === 'classic',
                            scrollwheel: mode !== 'nmpz',
                            disableDefaultUI: true,
                        };

                        panoramaRef.current = new window.google.maps.StreetViewPanorama(
                            containerRef.current,
                            options
                        );

                        // NMPZ overlay
                        if (mode === 'nmpz' && containerRef.current) {
                            const overlay = document.createElement('div');
                            overlay.style.cssText = `
                                position: absolute;
                                top: 0; left: 0; right: 0; bottom: 0;
                                z-index: 10;
                                cursor: default;
                            `;
                            containerRef.current.style.position = 'relative';
                            containerRef.current.appendChild(overlay);
                        }
                    } else {
                        // Mevcut panoramayı güncelle
                        panoramaRef.current.setPano(data.location.pano);
                        panoramaRef.current.setPov({ heading: Math.random() * 360, pitch: 0 });
                    }

                    setStatus('ready');
                } else {
                    // Outdoor bulunamadı, DEFAULT source ile tekrar dene
                    svServiceRef.current.getPanorama(
                        {
                            location: searchLocation,
                            radius: 100000,  // 100 km
                            preference: window.google.maps.StreetViewPreference.NEAREST,
                        },
                        (data2: any, s2: any) => {
                            if (s2 === window.google.maps.StreetViewStatus.OK && data2?.location?.latLng) {
                                if (!panoramaRef.current) {
                                    panoramaRef.current = new window.google.maps.StreetViewPanorama(
                                        containerRef.current!,
                                        {
                                            position: data2.location.latLng,
                                            pov: { heading: Math.random() * 360, pitch: 0 },
                                            zoom: 1,
                                            addressControl: false,
                                            showRoadLabels: false,
                                            fullscreenControl: false,
                                            motionTracking: false,
                                            motionTrackingControl: false,
                                            zoomControl: mode !== 'nmpz',
                                            panControl: mode !== 'nmpz',
                                            linksControl: mode === 'classic',
                                            clickToGo: mode === 'classic',
                                            scrollwheel: mode !== 'nmpz',
                                            disableDefaultUI: true,
                                        }
                                    );
                                } else {
                                    panoramaRef.current.setPano(data2.location.pano);
                                    panoramaRef.current.setPov({ heading: Math.random() * 360, pitch: 0 });
                                }
                                setStatus('ready');
                            } else {
                                console.warn('Street View coverage yok:', targetLat, targetLng);
                                setStatus('no_coverage');
                            }
                        }
                    );
                }
            }
        );
    }, [mode]);

    // Google Maps API yükle
    useEffect(() => {
        if (window.google && window.google.maps) {
            findAndShowPanorama(lat, lng);
            return;
        }

        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

        const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
        if (existingScript) {
            // Script yüklendikten sonra çalışacak
            const checkReady = setInterval(() => {
                if (window.google && window.google.maps) {
                    clearInterval(checkReady);
                    findAndShowPanorama(lat, lng);
                }
            }, 200);
            return () => clearInterval(checkReady);
        }

        window.initStreetView = () => findAndShowPanorama(lat, lng);

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initStreetView`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);

        return () => {
            window.initStreetView = () => { };
        };
    }, []);

    // Konum değişince yeni panorama bul
    useEffect(() => {
        if (window.google && window.google.maps) {
            findAndShowPanorama(lat, lng);
        }
    }, [lat, lng, findAndShowPanorama]);

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                height: '100vh',
                background: '#0a0a0f',
            }}
        >
            {/* Yükleniyor / hata göstergesi - panorama yüklenene kadar */}
            {status !== 'ready' && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: 'var(--text-secondary)',
                    fontSize: '18px',
                    flexDirection: 'column',
                    gap: '16px',
                    position: 'absolute',
                    inset: 0,
                    zIndex: 5,
                    background: '#0a0a0f',
                }}>
                    {status === 'loading' && (
                        <>
                            <div style={{ fontSize: '48px' }}>🌍</div>
                            <div>Street View yükleniyor...</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                {mode === 'classic' && '🟢 Classic Mod - Serbestçe hareket edebilirsiniz'}
                                {mode === 'no_move' && '🟠 No Move - Sadece etrafınıza bakabilirsiniz'}
                                {mode === 'nmpz' && '🔴 NMPZ - Hareket, bakış ve zoom kapalı'}
                            </div>
                        </>
                    )}
                    {status === 'no_coverage' && (
                        <>
                            <div style={{ fontSize: '48px' }}>📍</div>
                            <div>Bu konumda Street View bulunamadı</div>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                Koordinat: {lat.toFixed(4)}, {lng.toFixed(4)}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
