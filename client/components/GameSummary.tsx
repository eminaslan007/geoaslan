'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { formatDistance, getMedal } from '@/lib/scoring';

interface RoundData {
    roundNumber: number;
    actualLocation: { lat: number; lng: number };
    guessLocation: { lat: number; lng: number } | null;
    distanceKm: number | null;
    score: number | null;
}

interface GameSummaryProps {
    totalScore: number;
    rounds: RoundData[];
    mapId: string;
    mode: string;
    averageDistanceKm: number;
    onPlayAgain: () => void;
    onGoHome: () => void;
}

export default function GameSummary({
    totalScore,
    rounds,
    mapId,
    mode,
    averageDistanceKm,
    onPlayAgain,
    onGoHome,
}: GameSummaryProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const medal = getMedal(totalScore);
    const scorePercentage = (totalScore / 25000) * 100;

    useEffect(() => {
        if (!mapRef.current) return;

        const map = L.map(mapRef.current, {
            center: [30, 0],
            zoom: 2,
            zoomControl: true,
            attributionControl: false,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
        }).addTo(map);

        const allPoints: L.LatLngExpression[] = [];

        rounds.forEach((round) => {
            if (!round.actualLocation) return;

            // Gerçek konum marker'ı
            const actualIcon = L.divIcon({
                className: '',
                html: `<div style="
          width: 28px; height: 28px;
          background: #4CAF50;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          display: flex; align-items: center; justify-content: center;
          color: white; font-size: 12px; font-weight: 700;
        ">${round.roundNumber}</div>`,
                iconSize: [28, 28],
                iconAnchor: [14, 14],
            });

            L.marker([round.actualLocation.lat, round.actualLocation.lng], { icon: actualIcon })
                .bindPopup(`<b>Tur ${round.roundNumber}</b><br>Puan: ${round.score?.toLocaleString('tr-TR')}<br>Mesafe: ${round.distanceKm ? formatDistance(round.distanceKm) : '-'}`)
                .addTo(map);

            allPoints.push([round.actualLocation.lat, round.actualLocation.lng]);

            // Tahmin marker'ı ve çizgi
            if (round.guessLocation) {
                const guessIcon = L.divIcon({
                    className: '',
                    html: `<div style="
            width: 20px; height: 20px;
            background: linear-gradient(135deg, #f5a623, #ff6b35);
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          "></div>`,
                    iconSize: [20, 20],
                    iconAnchor: [10, 10],
                });

                L.marker([round.guessLocation.lat, round.guessLocation.lng], { icon: guessIcon }).addTo(map);

                L.polyline(
                    [[round.actualLocation.lat, round.actualLocation.lng], [round.guessLocation.lat, round.guessLocation.lng]],
                    { color: '#f5a623', weight: 2, dashArray: '6, 6', opacity: 0.7 }
                ).addTo(map);

                allPoints.push([round.guessLocation.lat, round.guessLocation.lng]);
            }
        });

        if (allPoints.length > 0) {
            map.fitBounds(L.latLngBounds(allPoints), { padding: [30, 30] });
        }

        return () => { map.remove(); };
    }, [rounds]);

    const modeLabels: Record<string, string> = {
        classic: 'Classic',
        no_move: 'No Move',
        nmpz: 'NMPZ',
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg-primary)',
            padding: '80px 24px 40px',
        }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                {/* Başlık */}
                <div className="animate-fadeIn" style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '8px' }}>
                        {medal ? medal.emoji : '🎮'}
                    </div>
                    <h1 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '8px' }}>
                        Oyun Tamamlandı!
                    </h1>
                    {medal && (
                        <div className={`medal-badge medal-${medal.name.toLowerCase()}`} style={{ display: 'inline-flex', fontSize: '16px', padding: '8px 20px' }}>
                            {medal.emoji} {medal.name} Madalya
                        </div>
                    )}
                </div>

                {/* Özet kartları */}
                <div className="animate-slideUp" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '16px',
                    marginBottom: '32px',
                }}>
                    <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Toplam Puan</div>
                        <div className="gradient-text" style={{ fontSize: '32px', fontWeight: 800 }}>{totalScore.toLocaleString('tr-TR')}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>/ 25.000</div>
                        <div className="score-bar" style={{ marginTop: '12px' }}>
                            <div className="score-bar-fill" style={{ width: `${scorePercentage}%` }} />
                        </div>
                    </div>

                    <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Ort. Mesafe</div>
                        <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)' }}>{formatDistance(averageDistanceKm)}</div>
                    </div>

                    <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Mod</div>
                        <div style={{ fontSize: '20px', fontWeight: 700 }}>
                            <span className={`mode-badge mode-${mode}`}>{modeLabels[mode] || mode}</span>
                        </div>
                    </div>
                </div>

                {/* Harita */}
                <div className="glass-card animate-slideUp" style={{ padding: '4px', marginBottom: '32px', animationDelay: '0.2s' }}>
                    <div ref={mapRef} style={{ width: '100%', height: '350px', borderRadius: '12px' }} />
                </div>

                {/* Tur detayları */}
                <div className="glass-card animate-slideUp" style={{ marginBottom: '32px', overflow: 'hidden', animationDelay: '0.3s' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Tur</th>
                                <th style={{ padding: '14px 18px', textAlign: 'right', fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Mesafe</th>
                                <th style={{ padding: '14px 18px', textAlign: 'right', fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Puan</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rounds.map((round) => (
                                <tr key={round.roundNumber} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                    <td style={{ padding: '14px 18px', fontWeight: 500 }}>
                                        🏁 Tur {round.roundNumber}
                                    </td>
                                    <td style={{ padding: '14px 18px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                                        {round.distanceKm !== null ? formatDistance(round.distanceKm) : '-'}
                                    </td>
                                    <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 700 }}>
                                        <span className="gradient-text">{round.score !== null ? round.score.toLocaleString('tr-TR') : '-'}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Butonlar */}
                <div className="animate-slideUp" style={{ display: 'flex', gap: '16px', justifyContent: 'center', animationDelay: '0.4s' }}>
                    <button className="btn-primary" onClick={onPlayAgain} style={{ padding: '14px 40px' }}>
                        🔄 Tekrar Oyna
                    </button>
                    <button className="btn-secondary" onClick={onGoHome} style={{ padding: '14px 40px' }}>
                        🏠 Ana Sayfa
                    </button>
                </div>
            </div>
        </div>
    );
}
