'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { mapsAPI, gameAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface GameMapInfo {
    id: string;
    name: string;
    description: string;
    difficulty: string;
    region: string;
    emoji: string;
    locationCount: number;
}

const MODES = [
    {
        id: 'classic',
        name: 'Classic',
        emoji: '🟢',
        desc: 'Serbestçe hareket edebilirsin. Etrafa bak, yürü ve ipuçlarını topla.',
        badgeClass: 'mode-classic',
    },
    {
        id: 'no_move',
        name: 'No Move',
        emoji: '🟠',
        desc: 'Sadece etrafına bakabilirsin ama ilerleyemezsin. Daha zor!',
        badgeClass: 'mode-no_move',
    },
    {
        id: 'nmpz',
        name: 'NMPZ',
        emoji: '🔴',
        desc: 'Hareket, bakış ve zoom kapalı. Sadece gördüğünle tahmin et!',
        badgeClass: 'mode-nmpz',
    },
];

export default function PlayPage() {
    const [maps, setMaps] = useState<GameMapInfo[]>([]);
    const [selectedMap, setSelectedMap] = useState<string>('');
    const [selectedMode, setSelectedMode] = useState<string>('classic');
    const [loading, setLoading] = useState(true);
    const [starting, setStarting] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    // Giriş yapmamış kullanıcıları login'e yönlendir
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (!user) return;
        mapsAPI.list()
            .then(data => {
                setMaps(data.maps);
                if (data.maps.length > 0) setSelectedMap(data.maps[0].id);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [user]);

    const handleStart = async () => {
        if (!selectedMap) return;
        setStarting(true);
        setError('');

        try {
            const data = await gameAPI.start(selectedMap, selectedMode);
            router.push(`/game/${data.gameId}`);
        } catch (err: any) {
            setError(err.message);
            setStarting(false);
        }
    };

    const difficultyColors: Record<string, string> = {
        easy: '#4CAF50',
        medium: '#FF9800',
        hard: '#F44336',
    };

    const difficultyLabels: Record<string, string> = {
        easy: 'Kolay',
        medium: 'Orta',
        hard: 'Zor',
    };

    return (
        <>
            <Navbar />
            <main style={{
                minHeight: '100vh',
                paddingTop: '90px',
                padding: '90px 24px 40px',
                background: 'radial-gradient(ellipse at center top, rgba(245, 166, 35, 0.05) 0%, transparent 60%)',
            }}>
                <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                    {/* Başlık */}
                    <div className="animate-fadeIn" style={{ textAlign: 'center', marginBottom: '48px' }}>
                        <h1 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '8px' }}>
                            <span className="gradient-text">Oyun Ayarları</span>
                        </h1>
                        <p style={{ color: 'var(--text-secondary)' }}>Harita ve mod seç, maceraya başla!</p>
                    </div>

                    {error && (
                        <div style={{
                            padding: '12px 16px',
                            background: 'rgba(244, 67, 54, 0.1)',
                            border: '1px solid rgba(244, 67, 54, 0.3)',
                            borderRadius: '8px',
                            color: '#F44336',
                            fontSize: '14px',
                            marginBottom: '24px',
                            textAlign: 'center',
                        }}>
                            {error}
                        </div>
                    )}

                    {/* Harita Seçimi */}
                    <div className="animate-slideUp" style={{ marginBottom: '40px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>🗺️ Harita Seçimi</h2>

                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Haritalar yükleniyor...</div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                                {maps.map((map) => (
                                    <button
                                        key={map.id}
                                        onClick={() => setSelectedMap(map.id)}
                                        className="glass-card"
                                        style={{
                                            padding: '24px',
                                            cursor: 'pointer',
                                            textAlign: 'center',
                                            border: selectedMap === map.id
                                                ? '2px solid var(--accent-gold)'
                                                : '1px solid var(--glass-border)',
                                            boxShadow: selectedMap === map.id ? 'var(--shadow-glow)' : 'none',
                                            background: selectedMap === map.id ? 'rgba(245, 166, 35, 0.06)' : 'var(--glass-bg)',
                                            transition: 'all 0.3s ease',
                                        }}
                                    >
                                        <div style={{ fontSize: '40px', marginBottom: '8px' }}>{map.emoji}</div>
                                        <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>{map.name}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{map.description}</div>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', fontSize: '11px' }}>
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: '10px',
                                                background: `${difficultyColors[map.difficulty]}20`,
                                                color: difficultyColors[map.difficulty],
                                                fontWeight: 600,
                                            }}>
                                                {difficultyLabels[map.difficulty]}
                                            </span>
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: '10px',
                                                background: 'rgba(255,255,255,0.06)',
                                                color: 'var(--text-secondary)',
                                            }}>
                                                {map.locationCount} konum
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Mod Seçimi */}
                    <div className="animate-slideUp" style={{ marginBottom: '40px', animationDelay: '0.2s' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>🎮 Oyun Modu</h2>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                            {MODES.map((mode) => (
                                <button
                                    key={mode.id}
                                    onClick={() => setSelectedMode(mode.id)}
                                    className="glass-card"
                                    style={{
                                        padding: '24px',
                                        cursor: 'pointer',
                                        textAlign: 'center',
                                        border: selectedMode === mode.id
                                            ? '2px solid var(--accent-gold)'
                                            : '1px solid var(--glass-border)',
                                        boxShadow: selectedMode === mode.id ? 'var(--shadow-glow)' : 'none',
                                        background: selectedMode === mode.id ? 'rgba(245, 166, 35, 0.06)' : 'var(--glass-bg)',
                                        transition: 'all 0.3s ease',
                                    }}
                                >
                                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>{mode.emoji}</div>
                                    <span className={`mode-badge ${mode.badgeClass}`} style={{ marginBottom: '8px' }}>{mode.name}</span>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '12px', lineHeight: 1.5 }}>{mode.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Başlat Butonu */}
                    <div className="animate-slideUp" style={{ textAlign: 'center', animationDelay: '0.4s' }}>
                        <button
                            className="btn-primary animate-pulse-glow"
                            onClick={handleStart}
                            disabled={!selectedMap || starting}
                            style={{
                                padding: '18px 64px',
                                fontSize: '20px',
                                fontWeight: 800,
                                opacity: (!selectedMap || starting) ? 0.6 : 1,
                            }}
                        >
                            {starting ? '🦁 Oyun Başlatılıyor...' : '🦁 Oyunu Başlat'}
                        </button>
                    </div>
                </div>
            </main>
        </>
    );
}
