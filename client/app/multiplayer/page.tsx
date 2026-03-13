'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/lib/auth';
import { useSocket, getSocket } from '@/hooks/useSocket';

const MAPS = [
    { id: 'world', name: 'Dünya', emoji: '🌍' },
    { id: 'turkey', name: 'Türkiye', emoji: '🇹🇷' },
    { id: 'europe', name: 'Avrupa', emoji: '🇪🇺' },
    { id: 'usa', name: 'ABD', emoji: '🇺🇸' },
];

export default function MultiplayerLobbyPage() {
    const { user, loading: authLoading } = useAuth();
    const { connected, emit } = useSocket();
    const router = useRouter();

    const [selectedMap, setSelectedMap] = useState('world');
    const [maxPlayers, setMaxPlayers] = useState(2); // 2 = 1v1, 3 = üçlü, 4 = dörtlü

    const [searching, setSearching] = useState(false);
    const [searchTime, setSearchTime] = useState(0);

    // Auth kontrolü
    useEffect(() => {
        if (!authLoading && !user) router.push('/login');
    }, [user, authLoading, router]);

    // ── Socket olayları ──
    useEffect(() => {
        const socket = getSocket();

        const onMatchFound = (data: { roomId: string }) => {
            console.log('🎉 EŞLEŞME BULUNDU! Odaya yönlendiriliyor:', data.roomId);
            router.push(`/multiplayer/${data.roomId}`);

            // Eğer router 2 saniye içinde değişmezse zorunlu yönlendir (Garanti yöntem)
            setTimeout(() => {
                if (window.location.pathname !== `/multiplayer/${data.roomId}`) {
                    console.log('⚠️ Router gecikti, zorunlu yönlendirme yapılıyor...');
                    window.location.href = `/multiplayer/${data.roomId}`;
                }
            }, 2000);
        };

        console.log('📡 MatchFound listener eklendi');
        socket.on('match_found', onMatchFound);

        return () => {
            console.log('📡 MatchFound listener kaldırıldı');
            socket.off('match_found', onMatchFound);
        };
    }, [router]);

    // Arama sayacı
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
            username: (user as { username?: string }).username || user.email?.split('@')[0] || 'Oyuncu',
            mapId: selectedMap,
            mode: 'classic',
            maxPlayers, // Seçilen oyuncu sayısını gönder
        });
    }, [user, connected, selectedMap, maxPlayers, emit]);

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
                <div style={{ maxWidth: '640px', margin: '0 auto' }}>

                    {/* Başlık */}
                    <div className="animate-fadeIn" style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <span style={{ fontSize: '64px', display: 'block', marginBottom: '16px' }}>🎮</span>
                        <h1 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '8px' }}>
                            <span className="gradient-text">Çok Oyunculu</span>
                        </h1>
                        <p style={{ color: 'var(--text-secondary)' }}>Eşleştirme kuyruğuna katıl!</p>
                    </div>

                    {searching ? (
                        <div className="glass-card animate-fadeIn" style={{ padding: '48px', textAlign: 'center' }}>
                            <div style={{
                                width: '80px', height: '80px', borderRadius: '50%',
                                border: '4px solid rgba(245, 166, 35, 0.2)',
                                borderTopColor: 'var(--accent-gold)',
                                animation: 'spin 1s linear infinite',
                                margin: '0 auto 24px',
                            }} />
                            <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>
                                Rakipler Aranıyor...
                            </h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>
                                {maxPlayers} Kişilik Mod • {MAPS.find(m => m.id === selectedMap)?.emoji} {MAPS.find(m => m.id === selectedMap)?.name} haritası
                            </p>
                            <p style={{ color: 'var(--accent-gold)', fontSize: '24px', fontWeight: 700, marginBottom: '24px' }}>
                                {Math.floor(searchTime / 60).toString().padStart(2, '0')}:{(searchTime % 60).toString().padStart(2, '0')}
                            </p>
                            <button className="btn-secondary" onClick={handleCancel} style={{ padding: '12px 32px' }}>✕ İptal Et</button>
                            <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                        </div>
                    ) : (
                        <div className="animate-slideUp">

                            {/* Kişi Sayısı Seçimi */}
                            <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
                                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '16px' }}>
                                    👥 Oyun Modu
                                </label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    {[2, 3, 4].map(n => (
                                        <button
                                            key={n}
                                            onClick={() => setMaxPlayers(n)}
                                            style={{
                                                flex: 1, padding: '16px', borderRadius: '12px',
                                                border: maxPlayers === n ? '2px solid var(--accent-gold)' : '1px solid var(--glass-border)',
                                                background: maxPlayers === n ? 'rgba(245, 166, 35, 0.08)' : 'var(--bg-secondary)',
                                                color: maxPlayers === n ? 'var(--accent-gold)' : 'var(--text-secondary)',
                                                fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center',
                                            }}
                                        >
                                            <div style={{ fontSize: '22px' }}>
                                                {n === 2 ? '👤👤' : n === 3 ? '👤👤👤' : '👤👤👤👤'}
                                            </div>
                                            <div style={{ fontSize: '14px', marginTop: '4px' }}>{n} Kişi</div>
                                            <div style={{ fontSize: '11px', opacity: 0.6 }}>
                                                {n === 2 ? '1v1' : n === 3 ? 'Üçlü' : 'Dörtlü'}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Harita Seçimi */}
                            <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
                                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '16px' }}>
                                    🗺️ Harita
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                                    {MAPS.map(map => (
                                        <button
                                            key={map.id}
                                            onClick={() => setSelectedMap(map.id)}
                                            style={{
                                                padding: '18px 10px', cursor: 'pointer', textAlign: 'center',
                                                borderRadius: '12px',
                                                border: selectedMap === map.id ? '2px solid var(--accent-gold)' : '1px solid var(--glass-border)',
                                                background: selectedMap === map.id ? 'rgba(245, 166, 35, 0.06)' : 'var(--bg-secondary)',
                                                color: 'var(--text-primary)',
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            <div style={{ fontSize: '26px', marginBottom: '4px' }}>{map.emoji}</div>
                                            <div style={{ fontSize: '12px', fontWeight: 600 }}>{map.name}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Kurallar */}
                            <div className="glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
                                <h3 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    📜 Kurallar
                                </h3>
                                <ul style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 2, paddingLeft: '20px' }}>
                                    <li>Oyuncular aynı 5 konumu görür</li>
                                    <li>Her tur için 90 saniye süre var</li>
                                    <li>En yakın tahmin → en yüksek puan</li>
                                    <li>5 tur sonunda en çok puanı toplayan kazanır 🏆</li>
                                </ul>
                            </div>

                            <div style={{ textAlign: 'center' }}>
                                <button
                                    className="btn-primary pulse-btn"
                                    onClick={handleFindMatch}
                                    disabled={!connected}
                                    style={{
                                        padding: '18px 64px',
                                        fontSize: '20px',
                                        fontWeight: 800,
                                        width: '100%',
                                        opacity: connected ? 1 : 0.5,
                                    }}
                                >
                                    ⚔️ OYUNA BAŞLA
                                </button>
                                {!connected && (
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '8px' }}>
                                        Sunucuya bağlanılıyor...
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </main>
        </>
    );
}
