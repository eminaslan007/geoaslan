'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { formatDistance } from '@/lib/scoring';

/** Map işlemlerini güvenli çalıştır — _leaflet_pos hatasını bastırır */
function safeMapAction(map: L.Map | null, containerEl: HTMLDivElement | null, action: (m: L.Map) => void): void {
    if (!map || !containerEl) return;
    try {
        // Container hâlâ DOM'da mı ve Leaflet panes geçerli mi?
        if (!containerEl.isConnected) return;
        const panes = (map as any)._panes;
        if (!panes) return;
        action(map);
    } catch {
        // _leaflet_pos veya benzeri hata — yoksay
    }
}

interface MiniMapProps {
    onGuess: (lat: number, lng: number) => void;
    guessDisabled?: boolean;
    showResult?: boolean;
    actualLocation?: { lat: number; lng: number } | null;
    guessLocation?: { lat: number; lng: number } | null;
    otherResults?: {
        uid: string;
        username: string;
        guessLocation: { lat: number; lng: number } | null;
        distanceKm: number;
    }[] | null;
    distanceKm?: number | null;
    roundScore?: number | null;
    isLastRound?: boolean;
    onNextRound?: () => void;
    onViewSummary?: () => void;
}

export default function MiniMap({
    onGuess,
    guessDisabled,
    showResult,
    actualLocation,
    guessLocation,
    otherResults,
    distanceKm,
    roundScore,
    isLastRound,
    onNextRound,
    onViewSummary,
}: MiniMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const resultLayersRef = useRef<L.Layer[]>([]);
    const [guess, setGuess] = useState<{ lat: number; lng: number } | null>(null);
    const [mapSize, setMapSize] = useState<'small' | 'large'>('small');

    // Harita başlatma
    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        const map = L.map(mapRef.current, {
            center: [35, 35],
            zoom: 3,
            zoomControl: false,
            attributionControl: false,
            worldCopyJump: true,
        });

        // Google Maps benzeri tile - ülke etiketli
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            subdomains: 'abcd',
        }).addTo(map);

        L.control.zoom({ position: 'topright' }).addTo(map);

        // Tıklama ile pin bırakma
        map.on('click', (e: L.LeafletMouseEvent) => {
            if (guessDisabled || showResult) return;

            const { lat, lng } = e.latlng;
            setGuess({ lat, lng });

            // Mevcut marker kaldır
            if (markerRef.current) {
                markerRef.current.remove();
            }

            // Pin stili - turuncu tahmin işareti
            const pinIcon = L.divIcon({
                className: '',
                html: `
          <div style="position: relative; width: 30px; height: 42px;">
            <svg width="30" height="42" viewBox="0 0 30 42" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 0C6.716 0 0 6.716 0 15c0 10.5 15 27 15 27s15-16.5 15-27C30 6.716 23.284 0 15 0z" fill="#FF6B35"/>
              <circle cx="15" cy="14" r="6" fill="white"/>
            </svg>
          </div>
        `,
                iconSize: [30, 42],
                iconAnchor: [15, 42],
            });

            markerRef.current = L.marker([lat, lng], { icon: pinIcon }).addTo(map);
        });

        mapInstanceRef.current = map;

        return () => {
            map.remove();
            mapInstanceRef.current = null;
        };
    }, []);

    // Sonuç gösterimi - tahmin sonrası çizgi ve gerçek konum
    useEffect(() => {
        if (!showResult || !actualLocation || !guessLocation || !mapInstanceRef.current) return;

        const map = mapInstanceRef.current;

        // Önceki işaretleri temizle
        resultLayersRef.current.forEach(layer => map.removeLayer(layer));
        resultLayersRef.current = [];
        if (markerRef.current) {
            markerRef.current.remove();
            markerRef.current = null;
        }

        // Haritayı büyüt
        setMapSize('large');

        // Tahmin pin'i (turuncu)
        const guessIcon = L.divIcon({
            className: '',
            html: `
        <div style="position: relative; width: 30px; height: 42px;">
          <svg width="30" height="42" viewBox="0 0 30 42" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 0C6.716 0 0 6.716 0 15c0 10.5 15 27 15 27s15-16.5 15-27C30 6.716 23.284 0 15 0z" fill="#FF6B35"/>
            <circle cx="15" cy="14" r="6" fill="white"/>
          </svg>
        </div>
      `,
            iconSize: [30, 42],
            iconAnchor: [15, 42],
        });

        // Gerçek konum pin'i (yeşil)
        const actualIcon = L.divIcon({
            className: '',
            html: `
        <div style="position: relative; width: 30px; height: 42px;">
          <svg width="30" height="42" viewBox="0 0 30 42" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 0C6.716 0 0 6.716 0 15c0 10.5 15 27 15 27s15-16.5 15-27C30 6.716 23.284 0 15 0z" fill="#4CAF50"/>
            <circle cx="15" cy="14" r="6" fill="white"/>
            <text x="15" y="17" text-anchor="middle" fill="#4CAF50" font-size="10" font-weight="bold">✓</text>
          </svg>
        </div>
      `,
            iconSize: [30, 42],
            iconAnchor: [15, 42],
        });

        const guessMarker = L.marker([guessLocation.lat, guessLocation.lng], { icon: guessIcon }).addTo(map);
        const actualMarker = L.marker([actualLocation.lat, actualLocation.lng], { icon: actualIcon }).addTo(map);

        // Noktalı çizgi
        const line = L.polyline(
            [[guessLocation.lat, guessLocation.lng], [actualLocation.lat, actualLocation.lng]],
            {
                color: '#FF6B35',
                weight: 3,
                dashArray: '10, 8',
                opacity: 0.9,
            }
        ).addTo(map);

        // Çizgi ortasına mesafe etiketi
        const midLat = (guessLocation.lat + actualLocation.lat) / 2;
        const midLng = (guessLocation.lng + actualLocation.lng) / 2;

        const distLabel = L.divIcon({
            className: '',
            html: `
        <div style="
          background: rgba(10, 10, 15, 0.9);
          backdrop-filter: blur(8px);
          border: 2px solid #FF6B35;
          border-radius: 20px;
          padding: 6px 16px;
          white-space: nowrap;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 700;
          color: #fff;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          text-align: center;
        ">
          📏 ${distanceKm !== null && distanceKm !== undefined ? formatDistance(distanceKm) : '?'}
        </div>
      `,
            iconSize: [0, 0],
            iconAnchor: [0, 0],
        });

        const distMarker = L.marker([midLat, midLng], { icon: distLabel, interactive: false }).addTo(map);

        const layers: L.Layer[] = [guessMarker, actualMarker, line, distMarker];

        // Rakibin tahminini göster (multiplayer)
        const allPoints: L.LatLngExpression[] = [
            [guessLocation.lat, guessLocation.lng],
            [actualLocation.lat, actualLocation.lng],
        ];

        if (otherResults && otherResults.length > 0) {
            otherResults.forEach((opp, idx) => {
                if (!opp.guessLocation) return;

                // Rakip Renkleri (Kırmızı tonları)
                const colors = ['#F44336', '#E91E63', '#9C27B0'];
                const color = colors[idx % colors.length];

                const opponentIcon = L.divIcon({
                    className: '',
                    html: `
                    <div style="position: relative; width: 30px; height: 42px;">
                      <svg width="30" height="42" viewBox="0 0 30 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15 0C6.716 0 0 6.716 0 15c0 10.5 15 27 15 27s15-16.5 15-27C30 6.716 23.284 0 15 0z" fill="${color}"/>
                        <circle cx="15" cy="14" r="6" fill="white"/>
                      </svg>
                      <div style="
                        position: absolute;
                        top: -20px;
                        left: 50%;
                        transform: translateX(-50%);
                        background: rgba(0,0,0,0.8);
                        color: #fff;
                        padding: 2px 6px;
                        border-radius: 4px;
                        font-size: 10px;
                        white-space: nowrap;
                        pointer-events: none;
                        border: 1px solid ${color};
                      ">${opp.username} (${formatDistance(opp.distanceKm)})</div>
                    </div>
                    `,
                    iconSize: [30, 42],
                    iconAnchor: [15, 42],
                });

                const opponentMarker = L.marker([opp.guessLocation.lat, opp.guessLocation.lng], { icon: opponentIcon }).addTo(map);

                const opponentLine = L.polyline(
                    [[opp.guessLocation.lat, opp.guessLocation.lng], [actualLocation.lat, actualLocation.lng]],
                    {
                        color: color,
                        weight: 2,
                        dashArray: '6, 6',
                        opacity: 0.7,
                    }
                ).addTo(map);

                layers.push(opponentMarker, opponentLine);
                allPoints.push([opp.guessLocation.lat, opp.guessLocation.lng]);
            });
        }

        resultLayersRef.current = layers;

        // Haritayı tüm noktaları kapsayacak şekilde ayarla
        const bounds = L.latLngBounds(allPoints);
        setTimeout(() => {
            safeMapAction(map, mapRef.current, (m) => {
                m.invalidateSize();
                m.fitBounds(bounds, { padding: [60, 60], maxZoom: 8 });
            });
        }, 300);

    }, [showResult, actualLocation, guessLocation, otherResults, distanceKm]);

    // Yeni tur başladığında haritayı sıfırla
    useEffect(() => {
        if (!showResult && mapInstanceRef.current) {
            const map = mapInstanceRef.current;
            // Sonuç katmanlarını temizle
            resultLayersRef.current.forEach(layer => map.removeLayer(layer));
            resultLayersRef.current = [];
            if (markerRef.current) {
                markerRef.current.remove();
                markerRef.current = null;
            }
            setGuess(null);
            setMapSize('small');
            setTimeout(() => {
                safeMapAction(map, mapRef.current, (m) => {
                    m.invalidateSize();
                    m.setView([35, 35], 3);
                });
            }, 100);
        }
    }, [showResult]);

    // Boyut değiştiğinde haritayı yeniden boyutlandır
    useEffect(() => {
        if (mapInstanceRef.current) {
            setTimeout(() => {
                try {
                    if (mapInstanceRef.current && mapRef.current) {
                        mapInstanceRef.current.invalidateSize();
                    }
                } catch { /* map already removed */ }
            }, 350);
        }
    }, [mapSize]);

    const isResultView = showResult && actualLocation && guessLocation;

    return (
        <div style={{
            position: 'fixed',
            bottom: isResultView ? '50%' : '24px',
            right: isResultView ? '50%' : '24px',
            transform: isResultView ? 'translate(50%, 50%)' : 'none',
            zIndex: isResultView ? 2000 : 1000,
            transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            width: isResultView ? '70vw' : mapSize === 'large' ? '420px' : '340px',
            maxWidth: isResultView ? '900px' : '420px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0',
        }}>
            {/* Sonuç overlay arka planı */}
            {isResultView && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(10, 10, 15, 0.75)',
                    backdropFilter: 'blur(6px)',
                    zIndex: -1,
                }} />
            )}

            {/* Puan kartı - sonuç görünümünde haritanın üstünde */}
            {isResultView && roundScore !== null && roundScore !== undefined && (
                <div className="animate-fadeIn" style={{
                    background: 'rgba(10, 10, 15, 0.95)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '16px 16px 0 0',
                    border: '1px solid rgba(245, 166, 35, 0.2)',
                    borderBottom: 'none',
                    padding: '20px 28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                            Tur Puanı
                        </div>
                        <div style={{ fontSize: '36px', fontWeight: 800 }}>
                            <span className="gradient-text">{roundScore.toLocaleString('tr-TR')}</span>
                            <span style={{ fontSize: '16px', color: 'var(--text-secondary)', fontWeight: 400 }}> / 5.000</span>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                            Mesafe
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#FF6B35' }}>
                            {distanceKm !== null && distanceKm !== undefined ? formatDistance(distanceKm) : '?'}
                        </div>
                    </div>
                </div>
            )}

            {/* Harita */}
            <div
                ref={mapRef}
                style={{
                    width: '100%',
                    height: isResultView ? '45vh' : '260px',
                    maxHeight: isResultView ? '500px' : '260px',
                    borderRadius: isResultView ? '0' : '16px',
                    border: `2px solid ${isResultView ? 'rgba(245, 166, 35, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                    borderTop: isResultView ? '1px solid rgba(255,255,255,0.06)' : undefined,
                    overflow: 'hidden',
                    boxShadow: isResultView ? 'none' : '0 8px 32px rgba(0,0,0,0.5)',
                    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
            />

            {/* Tahmin Et butonu - pin bıraktıktan sonra */}
            {guess && !guessDisabled && !showResult && (
                <button
                    className="btn-primary"
                    onClick={() => onGuess(guess.lat, guess.lng)}
                    style={{
                        width: '100%',
                        marginTop: '10px',
                        padding: '14px',
                        fontSize: '16px',
                        fontWeight: 700,
                        borderRadius: '12px',
                        boxShadow: '0 4px 20px rgba(245, 166, 35, 0.3)',
                    }}
                >
                    📍 Tahmin Et
                </button>
            )}

            {/* Sonraki Tur / Sonuçları Gör butonu */}
            {isResultView && (
                <div style={{
                    background: 'rgba(10, 10, 15, 0.95)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '0 0 16px 16px',
                    border: '1px solid rgba(245, 166, 35, 0.2)',
                    borderTop: 'none',
                    padding: '16px 28px',
                    textAlign: 'center',
                }}>
                    {isLastRound ? (
                        <button
                            className="btn-primary"
                            onClick={onViewSummary}
                            style={{
                                width: '100%',
                                padding: '14px',
                                fontSize: '16px',
                                fontWeight: 700,
                            }}
                        >
                            🏆 Sonuçları Gör
                        </button>
                    ) : (
                        <button
                            className="btn-primary"
                            onClick={onNextRound}
                            style={{
                                width: '100%',
                                padding: '14px',
                                fontSize: '16px',
                                fontWeight: 700,
                            }}
                        >
                            Sonraki Tur →
                        </button>
                    )}
                </div>
            )}

            {/* Büyüt/Küçült butonu (normal modda) */}
            {!isResultView && (
                <button
                    onClick={() => setMapSize(prev => prev === 'small' ? 'large' : 'small')}
                    style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        background: 'rgba(10, 10, 15, 0.85)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '8px',
                        color: '#fff',
                        padding: '6px 10px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        zIndex: 1000,
                        lineHeight: 1,
                    }}
                >
                    {mapSize === 'small' ? '⬆' : '⬇'}
                </button>
            )}
        </div>
    );
}
