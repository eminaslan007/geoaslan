'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import { getMedal } from '@/lib/scoring';

interface GameHistory {
    id: string;
    mapId: string;
    mode: string;
    totalScore: number;
    status: string;
    createdAt: any;
}

interface ProfileStats {
    totalGames: number;
    highestScore: number;
    username: string;
    email: string;
}

export default function ProfilePage() {
    const { user, loading: authLoading } = useAuth();
    const [games, setGames] = useState<GameHistory[]>([]);
    const [profile, setProfile] = useState<ProfileStats | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }

        if (user) {
            const fetchData = async () => {
                try {
                    // Firestore'dan kullanıcı profilini çek
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        setProfile({
                            totalGames: data.totalGames || 0,
                            highestScore: data.highestScore || 0,
                            username: data.username || user.username || '',
                            email: data.email || user.email || '',
                        });
                    } else {
                        setProfile({
                            totalGames: 0,
                            highestScore: 0,
                            username: user.username || '',
                            email: user.email || '',
                        });
                    }

                    // Firestore'dan oyun geçmişini çek
                    const gamesRef = collection(db, 'games');
                    const q = query(
                        gamesRef,
                        where('userId', '==', user.uid),
                        where('status', '==', 'finished'),
                        orderBy('createdAt', 'desc'),
                        limit(20)
                    );
                    const snapshot = await getDocs(q);
                    const gamesList: GameHistory[] = [];
                    snapshot.forEach(d => {
                        const data = d.data();
                        gamesList.push({
                            id: d.id,
                            mapId: data.mapId,
                            mode: data.mode,
                            totalScore: data.totalScore || 0,
                            status: data.status,
                            createdAt: data.createdAt,
                        });
                    });
                    setGames(gamesList);
                } catch (err) {
                    console.error('Profil verisi yüklenemedi:', err);
                }
                setLoading(false);
            };
            fetchData();
        }
    }, [user, authLoading, router]);

    if (authLoading || !user) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
                <div style={{ color: 'var(--text-secondary)' }}>Yükleniyor...</div>
            </div>
        );
    }

    const displayName = profile?.username || user.username || user.email?.split('@')[0] || '';
    const displayEmail = profile?.email || user.email || '';
    const totalGames = profile?.totalGames || 0;
    const highestScore = profile?.highestScore || 0;

    const mapLabels: Record<string, string> = {
        world: '🌍 Dünya',
        turkey: '🇹🇷 Türkiye',
        europe: '🇪🇺 Avrupa',
        usa: '🇺🇸 ABD',
    };

    const modeLabels: Record<string, string> = {
        classic: 'Classic',
        no_move: 'No Move',
        nmpz: 'NMPZ',
    };

    const medalInfo = getMedal(highestScore);

    return (
        <>
            <Navbar />
            <main style={{
                minHeight: '100vh',
                paddingTop: '90px',
                padding: '90px 24px 40px',
                background: 'radial-gradient(ellipse at center top, rgba(245, 166, 35, 0.05) 0%, transparent 60%)',
            }}>
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    {/* Profil Kartı */}
                    <div className="glass-card animate-fadeIn" style={{
                        padding: '40px',
                        textAlign: 'center',
                        marginBottom: '32px',
                    }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            background: 'var(--gradient-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px',
                            fontSize: '36px',
                            fontWeight: 800,
                            color: '#fff',
                        }}>
                            {(displayName || 'U').charAt(0).toUpperCase()}
                        </div>

                        <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '4px' }}>{displayName}</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>{displayEmail}</p>

                        {/* İstatistikler */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                            <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Toplam Oyun</div>
                                <div style={{ fontSize: '28px', fontWeight: 800 }}>{totalGames}</div>
                            </div>
                            <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>En Yüksek Skor</div>
                                <div className="gradient-text" style={{ fontSize: '28px', fontWeight: 800 }}>{highestScore.toLocaleString('tr-TR')}</div>
                            </div>
                            <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Madalya</div>
                                <div style={{ fontSize: '28px' }}>{medalInfo ? `${medalInfo.emoji}` : '—'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Madalya İlerlemesi */}
                    <div className="glass-card animate-slideUp" style={{ padding: '32px', marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>🏆 Madalya İlerlemesi</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                            {[
                                { name: 'Bronz', emoji: '🥉', threshold: 10000, color: '#CD7F32' },
                                { name: 'Gümüş', emoji: '🥈', threshold: 15000, color: '#C0C0C0' },
                                { name: 'Altın', emoji: '🥇', threshold: 20000, color: '#FFD700' },
                                { name: 'Platin', emoji: '💎', threshold: 24000, color: '#E5E4E2' },
                            ].map((medal) => {
                                const achieved = highestScore >= medal.threshold;
                                return (
                                    <div
                                        key={medal.name}
                                        style={{
                                            padding: '16px',
                                            borderRadius: '12px',
                                            textAlign: 'center',
                                            background: achieved ? `${medal.color}15` : 'var(--bg-secondary)',
                                            border: `1px solid ${achieved ? medal.color + '40' : 'transparent'}`,
                                            opacity: achieved ? 1 : 0.5,
                                        }}
                                    >
                                        <div style={{ fontSize: '28px', marginBottom: '4px' }}>{medal.emoji}</div>
                                        <div style={{ fontSize: '13px', fontWeight: 600, color: achieved ? medal.color : 'var(--text-secondary)' }}>{medal.name}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>{medal.threshold.toLocaleString('tr-TR')}+</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Son Oyunlar */}
                    <div className="glass-card animate-slideUp" style={{ overflow: 'hidden', animationDelay: '0.2s' }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>📜 Son Oyunlar</h2>
                        </div>

                        {loading ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Yükleniyor...</div>
                        ) : games.length === 0 ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                Henüz oyun oynamamışsın. <br />
                                <button className="btn-primary" onClick={() => router.push('/play')} style={{ marginTop: '16px', padding: '10px 24px', fontSize: '14px' }}>
                                    İlk Oyununu Başlat 🎮
                                </button>
                            </div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                        <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Harita</th>
                                        <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Mod</th>
                                        <th style={{ padding: '12px 18px', textAlign: 'right', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Puan</th>
                                        <th style={{ padding: '12px 18px', textAlign: 'right', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Madalya</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {games.map((game) => {
                                        const gameMedal = getMedal(game.totalScore);
                                        return (
                                            <tr key={game.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                <td style={{ padding: '12px 18px', fontSize: '14px' }}>
                                                    {mapLabels[game.mapId] || game.mapId}
                                                </td>
                                                <td style={{ padding: '12px 18px' }}>
                                                    <span className={`mode-badge mode-${game.mode}`} style={{ fontSize: '10px' }}>
                                                        {modeLabels[game.mode] || game.mode}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 18px', textAlign: 'right', fontWeight: 700 }}>
                                                    <span className="gradient-text">{game.totalScore.toLocaleString('tr-TR')}</span>
                                                </td>
                                                <td style={{ padding: '12px 18px', textAlign: 'right', fontSize: '20px' }}>
                                                    {gameMedal ? gameMedal.emoji : '—'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </main>
        </>
    );
}
