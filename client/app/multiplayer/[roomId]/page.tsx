'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/auth';
import { useSocket } from '@/hooks/useSocket';
import StreetView from '@/components/StreetView';

// Client-only bileşenler
const MiniMap = dynamic(() => import('@/components/MiniMap'), { ssr: false });

interface PlayerInfo {
    uid: string;
    username: string;
    score: number;
    totalScore?: number;
    rank?: number;
}

interface RoundResultData {
    uid: string;
    username: string;
    guessLocation: { lat: number; lng: number } | null;
    distanceKm: number;
    roundScore: number;
    totalScore: number;
}

// Oyuncu başına renk (1. sarı/altın, 2. kırmızı, 3. mavi, 4. yeşil)
const PLAYER_COLORS = [
    { primary: 'rgba(245, 166, 35, 0.3)', border: 'rgba(245, 166, 35, 0.5)', text: '#F5A623', emoji: '🥇' },
    { primary: 'rgba(244, 67, 54, 0.3)', border: 'rgba(244, 67, 54, 0.5)', text: '#F44336', emoji: '🥈' },
    { primary: 'rgba(33, 150, 243, 0.3)', border: 'rgba(33, 150, 243, 0.5)', text: '#2196F3', emoji: '🥉' },
    { primary: 'rgba(76, 175, 80, 0.3)', border: 'rgba(76, 175, 80, 0.5)', text: '#4CAF50', emoji: '🎮' },
];

export default function MultiplayerGamePage() {
    const params = useParams();
    const router = useRouter();
    const roomId = params.roomId as string;
    const { user } = useAuth();
    const { socketRef, connected, emit } = useSocket();

    // Oyun durumu
    const [currentRound, setCurrentRound] = useState(0);
    const [totalRounds] = useState(5);
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [players, setPlayers] = useState<PlayerInfo[]>([]);
    const [guessing, setGuessing] = useState(false);
    const [myGuessSubmitted, setMyGuessSubmitted] = useState(false);
    const [guessedPlayers, setGuessedPlayers] = useState<{ uid: string; username: string }[]>([]);
    const [timeLeft, setTimeLeft] = useState(90);

    // Tur sonucu
    const [showResult, setShowResult] = useState(false);
    const [roundResults, setRoundResults] = useState<RoundResultData[]>([]);
    const [actualLocation, setActualLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [isLastRound, setIsLastRound] = useState(false);

    // Oyun sonu
    const [gameOver, setGameOver] = useState(false);
    const [gameOverData, setGameOverData] = useState<{ winner: string | null; players: PlayerInfo[] } | null>(null);

    // Kopma bildirimi
    const [disconnectMsg, setDisconnectMsg] = useState<string | null>(null);

    // ============ SOCKET OLAYLARI ============

    useEffect(() => {
        if (!connected || !user) return;
        emit('join_room', { roomId, uid: user.uid });
    }, [connected, user, roomId, emit]);

    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;

        const onRoundStart = (data: { round: number; location: { lat: number; lng: number }; players: PlayerInfo[] }) => {
            setCurrentRound(data.round);
            setCurrentLocation(data.location);
            setPlayers(data.players);
            setMyGuessSubmitted(false);
            setGuessedPlayers([]);
            setShowResult(false);
            setRoundResults([]);
            setActualLocation(null);
            setTimeLeft(90);
        };

        const onPlayerGuessed = (data: { uid: string; username: string; guessedCount: number; totalPlayers: number }) => {
            setGuessedPlayers(prev => {
                if (prev.find(p => p.uid === data.uid)) return prev;
                return [...prev, { uid: data.uid, username: data.username }];
            });
        };

        // Geriye dönük uyumluluk — 1v1 sistemi de çalışsın
        const onOpponentGuessed = () => {
            setGuessedPlayers(prev => {
                // rakibin uid'ini bilmiyoruz, sadece sayıyı artır
                const fakeEntry = { uid: '__opponent__', username: 'Rakip' };
                if (prev.find(p => p.uid === '__opponent__')) return prev;
                return [...prev, fakeEntry];
            });
        };

        const onRoundResult = (data: { results: RoundResultData[]; actualLocation: { lat: number; lng: number }; isLastRound: boolean }) => {
            setRoundResults(data.results);
            setActualLocation(data.actualLocation);
            setIsLastRound(data.isLastRound);
            setShowResult(true);
            setPlayers(data.results.map((r: RoundResultData) => ({
                uid: r.uid,
                username: r.username,
                score: r.totalScore,
            })));
        };

        const onGameOver = (data: { winner: string | null; players: PlayerInfo[] }) => {
            setGameOverData(data);
            setGameOver(true);
        };

        const onPlayerDisconnected = (data: { uid: string; username: string }) => {
            setDisconnectMsg(`${data.username || 'Bir oyuncu'} ayrıldı`);
            setTimeout(() => setDisconnectMsg(null), 3000);
        };

        const onOpponentDisconnected = () => {
            setDisconnectMsg('Rakip ayrıldı');
            setTimeout(() => setDisconnectMsg(null), 3000);
        };

        const onGameAborted = (data: { reason: string }) => {
            setDisconnectMsg(data.reason);
        };

        socket.on('round_start', onRoundStart);
        socket.on('player_guessed', onPlayerGuessed);
        socket.on('opponent_guessed', onOpponentGuessed);
        socket.on('round_result', onRoundResult);
        socket.on('game_over', onGameOver);
        socket.on('player_disconnected', onPlayerDisconnected);
        socket.on('opponent_disconnected', onOpponentDisconnected);
        socket.on('game_aborted', onGameAborted);

        return () => {
            socket.off('round_start', onRoundStart);
            socket.off('player_guessed', onPlayerGuessed);
            socket.off('opponent_guessed', onOpponentGuessed);
            socket.off('round_result', onRoundResult);
            socket.off('game_over', onGameOver);
            socket.off('player_disconnected', onPlayerDisconnected);
            socket.off('opponent_disconnected', onOpponentDisconnected);
            socket.off('game_aborted', onGameAborted);
        };
    }, [socketRef.current]);

    // Geri sayım timer
    useEffect(() => {
        if (showResult || gameOver || timeLeft <= 0 || currentRound === 0) return;
        const timer = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) { clearInterval(timer); return 0; }
                return t - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [showResult, gameOver, currentRound, timeLeft]);

    // ============ OYUNCU İŞLEMLERİ ============

    const handleGuess = useCallback(async (lat: number, lng: number) => {
        if (guessing || myGuessSubmitted) return;
        setGuessing(true);
        emit('submit_guess', { lat, lng });
        setMyGuessSubmitted(true);
        setGuessing(false);
    }, [guessing, myGuessSubmitted, emit]);

    const handleNextRound = useCallback(() => {
        emit('ready_next_round');
        setShowResult(false);
    }, [emit]);

    // ============ OYUN SONU EKRANI ============

    if (gameOver && gameOverData) {
        const myData = gameOverData.players.find(p => p.uid === user?.uid);
        const myRank = myData?.rank ?? gameOverData.players.length;
        const iWon = gameOverData.winner === user?.uid;
        const isDraw = gameOverData.winner === null;

        const rankEmoji = myRank === 1 ? '🏆' : myRank === 2 ? '🥈' : myRank === 3 ? '🥉' : '🎮';
        const rankMsg = isDraw ? 'Berabere!' : iWon ? 'Kazandın! 🎉' : `${myRank}. oldun`;

        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-primary)',
                padding: '24px',
            }}>
                <div className="glass-card animate-fadeIn" style={{ padding: '48px', maxWidth: '560px', width: '100%', textAlign: 'center' }}>
                    <div style={{ fontSize: '80px', marginBottom: '16px' }}>{rankEmoji}</div>
                    <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>
                        <span className="gradient-text">{rankMsg}</span>
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
                        {gameOverData.players.length} oyuncunun yarıştığı oyun tamamlandı
                    </p>

                    {/* Skor Tablosu */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
                        {gameOverData.players.map((p, idx) => {
                            const isMe = p.uid === user?.uid;
                            const isWinner = p.uid === gameOverData.winner;
                            const color = PLAYER_COLORS[idx] || PLAYER_COLORS[0];
                            const rankLabels = ['🥇 1.', '🥈 2.', '🥉 3.', '🎮 4.'];
                            return (
                                <div key={p.uid} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '16px',
                                    padding: '16px 20px',
                                    borderRadius: '12px',
                                    background: isWinner ? 'rgba(245, 166, 35, 0.08)' : 'var(--bg-secondary)',
                                    border: isMe ? '2px solid var(--accent-gold)' : isWinner ? '1px solid rgba(245, 166, 35, 0.3)' : '1px solid transparent',
                                }}>
                                    <div style={{ fontSize: '20px', minWidth: '32px' }}>{rankLabels[idx] || `${idx + 1}.`}</div>
                                    <div style={{ flex: 1, textAlign: 'left' }}>
                                        <div style={{ fontWeight: 700, fontSize: '16px' }}>
                                            {p.username}
                                            {isMe && <span style={{ color: 'var(--accent-gold)', fontSize: '12px', marginLeft: '6px' }}>(Sen)</span>}
                                        </div>
                                    </div>
                                    <div className="gradient-text" style={{ fontSize: '22px', fontWeight: 800 }}>
                                        {(p.totalScore || 0).toLocaleString('tr-TR')}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                        <button className="btn-primary" onClick={() => router.push('/multiplayer')} style={{ padding: '14px 32px', fontSize: '16px' }}>
                            🎮 Tekrar Oyna
                        </button>
                        <button className="btn-secondary" onClick={() => router.push('/play')} style={{ padding: '14px 32px', fontSize: '16px' }}>
                            🏠 Ana Sayfa
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ============ BEKLEME ============

    if (currentRound === 0 || !currentLocation) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-primary)',
                gap: '16px',
            }}>
                <div style={{ fontSize: '48px' }}>⚔️</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '18px' }}>Oyun başlıyor...</div>
                {players.length > 0 && (
                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                        {players.map((p, i) => (
                            <div key={p.uid} style={{
                                padding: '8px 16px', borderRadius: '8px',
                                background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                                fontSize: '14px', fontWeight: 600,
                            }}>
                                {p.uid === user?.uid ? '🦁' : ['⚔️', '🎮', '🎯'][i - 1] || '🎮'} {p.username}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // ============ YARDIMCI ============
    const myResult = roundResults.find(r => r.uid === user?.uid);
    const otherResults = roundResults.filter(r => r.uid !== user?.uid);
    const myPlayer = players.find(p => p.uid === user?.uid);

    // Sıralanmış oyuncular (puana göre)
    const sortedPlayers = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));

    const guessedCount = myGuessSubmitted
        ? guessedPlayers.filter(g => g.uid !== user?.uid).length + 1
        : guessedPlayers.filter(g => g.uid !== user?.uid).length;

    // ============ TUR SONUCU OVERLAY ============

    const renderRoundResult = () => {
        if (!showResult || !actualLocation || roundResults.length === 0) return null;

        const sortedResults = [...roundResults].sort((a, b) => b.roundScore - a.roundScore);

        return (
            <div style={{
                position: 'absolute',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1100,
                width: '94%',
                maxWidth: '680px',
            }}>
                <div className="glass-card" style={{ padding: '20px' }}>
                    <h3 style={{ textAlign: 'center', fontSize: '16px', fontWeight: 700, marginBottom: '14px' }}>
                        Tur {currentRound} Sonucu
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                        {sortedResults.map((r, idx) => {
                            const isMe = r.uid === user?.uid;
                            const color = PLAYER_COLORS[idx] || PLAYER_COLORS[0];
                            return (
                                <div key={r.uid} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '10px 14px',
                                    borderRadius: '10px',
                                    background: color.primary,
                                    border: `1px solid ${color.border}`,
                                }}>
                                    <div style={{ fontSize: '16px' }}>{color.emoji}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: '14px' }}>
                                            {r.username}
                                            {isMe && <span style={{ color: 'var(--accent-gold)', fontSize: '11px', marginLeft: '4px' }}>(Sen)</span>}
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                            {r.guessLocation ? `${r.distanceKm.toLocaleString('tr-TR')} km uzakta` : 'Tahmin yapılmadı'}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 800, fontSize: '18px', color: color.text }}>
                                            +{r.roundScore.toLocaleString('tr-TR')}
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                            Toplam: {r.totalScore.toLocaleString('tr-TR')}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <button
                        className="btn-primary"
                        onClick={handleNextRound}
                        style={{ width: '100%', padding: '12px', fontSize: '15px' }}
                    >
                        {isLastRound ? '🏆 Sonuçları Gör' : '➡️ Sonraki Tur'}
                    </button>
                </div>
            </div>
        );
    };

    // ============ ANA OYUN EKRANI ============

    return (
        <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
            {/* Street View */}
            {currentLocation && (
                <StreetView
                    lat={currentLocation.lat}
                    lng={currentLocation.lng}
                    mode="classic"
                />
            )}

            {/* HUD - Üst Bilgi */}
            <div className="game-hud">
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    gap: '6px',
                    flexWrap: 'wrap',
                }}>
                    {/* Oyuncu Skorcerler */}
                    <div style={{ display: 'flex', gap: '6px', flex: '1', flexWrap: 'wrap' }}>
                        {sortedPlayers.map((p, idx) => {
                            const isMe = p.uid === user?.uid;
                            const hasGuessed = isMe ? myGuessSubmitted : guessedPlayers.some(g => g.uid === p.uid);
                            const color = PLAYER_COLORS[idx] || PLAYER_COLORS[0];
                            return (
                                <div key={p.uid} style={{
                                    background: 'rgba(10, 10, 15, 0.85)',
                                    backdropFilter: 'blur(10px)',
                                    padding: '6px 10px',
                                    borderRadius: '10px',
                                    border: `1px solid ${color.border}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    minWidth: 0,
                                }}>
                                    <span style={{ fontSize: '13px' }}>{isMe ? '🦁' : ['⚔️', '🎯', '🎮'][idx - 1] || '🎮'}</span>
                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {isMe ? 'Sen' : p.username}
                                    </span>
                                    <span style={{ fontSize: '13px', fontWeight: 800, color: color.text }}>
                                        {(p.score || 0).toLocaleString('tr-TR')}
                                    </span>
                                    {hasGuessed && <span style={{ fontSize: '11px', color: '#4CAF50' }}>✓</span>}
                                </div>
                            );
                        })}
                    </div>

                    {/* Tur ve Süre */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(10, 10, 15, 0.85)',
                        backdropFilter: 'blur(10px)',
                        padding: '6px 12px',
                        borderRadius: '16px',
                        border: '1px solid rgba(245, 166, 35, 0.2)',
                        flexShrink: 0,
                    }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                            {currentRound}/{totalRounds}
                        </span>
                        <div style={{
                            paddingLeft: '6px',
                            borderLeft: '1px solid rgba(255,255,255,0.1)',
                            fontSize: '13px',
                            fontWeight: 700,
                            color: timeLeft <= 10 ? '#F44336' : timeLeft <= 30 ? '#FF9800' : 'var(--text-primary)',
                        }}>
                            ⏱ {timeLeft}s
                        </div>
                    </div>
                </div>
            </div>

            {/* Mini Harita */}
            <MiniMap
                onGuess={handleGuess}
                guessDisabled={guessing || myGuessSubmitted || showResult}
                showResult={showResult}
                actualLocation={showResult ? actualLocation : null}
                guessLocation={showResult ? (myResult?.guessLocation || null) : null}
                otherResults={showResult ? otherResults : null}
                distanceKm={showResult ? (myResult?.distanceKm ?? null) : null}
                roundScore={showResult ? (myResult?.roundScore ?? null) : null}
                isLastRound={isLastRound}
                onNextRound={handleNextRound}
                onViewSummary={handleNextRound}
            />

            {/* Tahmin gönderildi bildirimi */}
            {myGuessSubmitted && !showResult && (
                <div style={{
                    position: 'absolute',
                    bottom: '220px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 1050,
                    background: 'rgba(10, 10, 15, 0.9)',
                    backdropFilter: 'blur(10px)',
                    padding: '10px 20px',
                    borderRadius: '12px',
                    border: '1px solid rgba(245, 166, 35, 0.3)',
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                }}>
                    ✅ Tahmin gönderildi — {guessedCount}/{players.length} tahmin edildi
                </div>
            )}

            {/* Oyuncu ayrıldı bildirimi */}
            {disconnectMsg && (
                <div style={{
                    position: 'absolute',
                    top: '80px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 1200,
                    background: 'rgba(244, 67, 54, 0.9)',
                    backdropFilter: 'blur(10px)',
                    padding: '10px 20px',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#fff',
                    animation: 'fadeIn 0.3s ease',
                }}>
                    🚪 {disconnectMsg}
                </div>
            )}

            {/* Tur Sonucu Overlay */}
            {renderRoundResult()}
        </div>
    );
}
