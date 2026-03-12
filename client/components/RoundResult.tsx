'use client';

import { formatDistance } from '@/lib/scoring';

interface RoundResultProps {
    roundNumber: number;
    roundScore: number;
    distanceKm: number;
    totalScore: number;
    isLastRound: boolean;
    onNextRound: () => void;
    onViewSummary: () => void;
}

export default function RoundResult({
    roundNumber,
    roundScore,
    distanceKm,
    totalScore,
    isLastRound,
    onNextRound,
    onViewSummary,
}: RoundResultProps) {
    const scorePercentage = (roundScore / 5000) * 100;

    return (
        <div className="result-overlay animate-fadeIn">
            <div className="glass-card" style={{
                padding: '40px',
                maxWidth: '480px',
                width: '90%',
                textAlign: 'center',
            }}>
                {/* Tur başlığı */}
                <div style={{ marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {roundNumber}. Tur Sonucu
                </div>

                {/* Puan */}
                <div className="animate-countUp" style={{
                    fontSize: '56px',
                    fontWeight: 800,
                    marginBottom: '8px',
                }}>
                    <span className="gradient-text">{roundScore.toLocaleString('tr-TR')}</span>
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
                    / 5.000 puan
                </div>

                {/* Puan çubuğu */}
                <div className="score-bar" style={{ marginBottom: '24px' }}>
                    <div className="score-bar-fill" style={{ width: `${scorePercentage}%` }} />
                </div>

                {/* Mesafe */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '32px',
                    padding: '16px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '12px',
                }}>
                    <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Mesafe</div>
                        <div style={{ fontSize: '20px', fontWeight: 700 }}>{formatDistance(distanceKm)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Toplam Puan</div>
                        <div style={{ fontSize: '20px', fontWeight: 700 }} className="gradient-text">{totalScore.toLocaleString('tr-TR')}</div>
                    </div>
                </div>

                {/* Buton */}
                {isLastRound ? (
                    <button className="btn-primary" onClick={onViewSummary} style={{ width: '100%', padding: '14px', fontSize: '16px' }}>
                        Sonuçları Gör 🏆
                    </button>
                ) : (
                    <button className="btn-primary" onClick={onNextRound} style={{ width: '100%', padding: '14px', fontSize: '16px' }}>
                        Sonraki Tur →
                    </button>
                )}
            </div>
        </div>
    );
}
