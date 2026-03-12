'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/lib/auth';
import { useSocket } from '@/hooks/useSocket';

const MAPS = [
    { id: 'world', name: 'Dünya', emoji: '🌍' },
    { id: 'turkey', name: 'Türkiye', emoji: '🇹🇷' },
    { id: 'europe', name: 'Avrupa', emoji: '🇪🇺' },
    { id: 'usa', name: 'ABD', emoji: '🇺🇸' },
];

export default function MultiplayerLobbyPage() {
    const { user, loading: authLoading } = useAuth();
    const { socketRef, connected, emit } = useSocket();
    const router = useRouter();

    const [selectedMap, setSelectedMap] = useState('world');
    const [searching, setSearching] = useState(false);
    const [searchTime, setSearchTime] = useState(0);

    // Auth kontrolü
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    // Eşleşme ve kuyruk event'leri
    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;

        const onMatchFound = (data: any) => {
            console.log('⚔️ Eşleşme bulundu:', data);
            router.push(`/multiplayer/${data.roomId}`);
        };

        const onMatchQueued = () => {
            console.log('🔍 Kuyrukta bekleniyor...');
        };

        socket.on('match_found', onMatchFound);
        socket.on('match_queued', onMatchQueued);

        return () => {
            socket.off('match_found', onMatchFound);
            socket.off('match_queued', onMatchQueued);
        };
    }, [socketRef.current, router]);

    // Arama süresi timer
    useEffect(() => {
        let timer: ReturnType<typeof setInterval>;
        if (searching) {
            setSearchTime(0);
            timer = setInterval(() => setSearchTime(t => t + 1), 1000);
        }
        return () => clearInterval(timer);
    }, [searching]);

    const handleFindMatch = useCallback(() => {
        if (!user || !connected) return;
        setSearching(true);
        emit('find_match', {
            uid: user.uid,
            username: user.username || user.email?.split('@')[0] || 'Oyuncu',
            mapId: selectedMap,
            mode: 'classic',
        });
    }, [user, connected, selectedMap, emit]);

    const handleCancel = useCallback(() => {
        setSearching(false);
        emit('cancel_match');
    }, [emit]);

    if (authLoading || !user) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
                <div style={{ fontSize: '48px' }}>🦁</div>
            </div>
        );
    }

    return (
        <>
            <Navbar />
            <main style={{
                minHeight: '100vh',
                paddingTop: '90px',
                padding: '90px 24px 40px',
                background: 'radial-gradient(ellipse at center top, rgba(245, 166, 35, 0.05) 0%, transparent 60%)',
            }}>
                <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                    {/* Başlık */}
                    <div className="animate-fadeIn" style={{ textAlign: 'center', marginBottom: '48px' }}>
                        <span style={{ fontSize: '64px', display: 'block', marginBottom: '16px' }}>⚔️</span>
                        <h1 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '8px' }}>
                            <span className="gradient-text">Online Karşılaşma</span>
                        </h1>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            Rakibini bul, aynı konumları tahmin edin, en iyi puan kazanır!
                        </p>
                    </div>

                    {/* Arama Ekranı */}
                    {searching ? (
                        <div className="glass-card animate-fadeIn" style={{ padding: '48px', textAlign: 'center' }}>
                            {/* Dönen animasyon */}
                            <div style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '50%',
                                border: '4px solid rgba(245, 166, 35, 0.2)',
                                borderTopColor: 'var(--accent-gold)',
                                animation: 'spin 1s linear infinite',
                                margin: '0 auto 24px',
                            }} />

                            <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>
                                Rakip Aranıyor...
                            </h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>
                                {MAPS.find(m => m.id === selectedMap)?.emoji} {MAPS.find(m => m.id === selectedMap)?.name} haritasında
                            </p>
                            <p style={{ color: 'var(--accent-gold)', fontSize: '24px', fontWeight: 700, marginBottom: '24px' }}>
                                {Math.floor(searchTime / 60).toString().padStart(2, '0')}:{(searchTime % 60).toString().padStart(2, '0')}
                            </p>

                            <button
                                className="btn-secondary"
                                onClick={handleCancel}
                                style={{ padding: '12px 32px', fontSize: '14px' }}
                            >
                                ✕ İptal Et
                            </button>

                            <style jsx>{`
                                @keyframes spin {
                                    to { transform: rotate(360deg); }
                                }
                            `}</style>
                        </div>
                    ) : (
                        <>
                            {/* Harita Seçimi */}
                            <div className="animate-slideUp" style={{ marginBottom: '32px' }}>
                                <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>🗺️ Harita Seç</h2>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                                    {MAPS.map((map) => (
                                        <button
                                            key={map.id}
                                            onClick={() => setSelectedMap(map.id)}
                                            className="glass-card"
                                            style={{
                                                padding: '20px 12px',
                                                cursor: 'pointer',
                                                textAlign: 'center',
                                                border: selectedMap === map.id
                                                    ? '2px solid var(--accent-gold)'
                                                    : '1px solid var(--glass-border)',
                                                background: selectedMap === map.id ? 'rgba(245, 166, 35, 0.06)' : 'var(--glass-bg)',
                                                transition: 'all 0.3s ease',
                                            }}
                                        >
                                            <div style={{ fontSize: '28px', marginBottom: '4px' }}>{map.emoji}</div>
                                            <div style={{ fontSize: '13px', fontWeight: 600 }}>{map.name}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Kurallar */}
                            <div className="glass-card animate-slideUp" style={{ padding: '24px', marginBottom: '32px', animationDelay: '0.1s' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>📜 Kurallar</h3>
                                <ul style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 2, paddingLeft: '20px' }}>
                                    <li>İki oyuncu aynı 5 konumu görür</li>
                                    <li>Her tur için 90 saniye süre var</li>
                                    <li>En yakın tahmin → en çok puan</li>
                                    <li>5 tur sonunda toplam puanı yüksek olan kazanır 🏆</li>
                                </ul>
                            </div>

                            {/* Başlat Butonu */}
                            <div className="animate-slideUp" style={{ textAlign: 'center', animationDelay: '0.2s' }}>
                                <button
                                    className="btn-primary animate-pulse-glow"
                                    onClick={handleFindMatch}
                                    disabled={!connected}
                                    style={{
                                        padding: '18px 64px',
                                        fontSize: '20px',
                                        fontWeight: 800,
                                        opacity: connected ? 1 : 0.5,
                                    }}
                                >
                                    ⚔️ Rakip Bul
                                </button>
                                {!connected && (
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '8px' }}>
                                        Sunucuya bağlanılıyor...
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </main>
        </>
    );
}
