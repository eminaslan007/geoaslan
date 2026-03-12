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
}

interface RoundResultData {
    uid: string;
    username: string;
    guessLocation: { lat: number; lng: number } | null;
    distanceKm: number;
    roundScore: number;
    totalScore: number;
}

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
    const [opponentGuessed, setOpponentGuessed] = useState(false);
    const [timeLeft, setTimeLeft] = useState(90);

    // Tur sonucu
    const [showResult, setShowResult] = useState(false);
    const [roundResults, setRoundResults] = useState<RoundResultData[]>([]);
    const [actualLocation, setActualLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [isLastRound, setIsLastRound] = useState(false);

    // Oyun sonu
    const [gameOver, setGameOver] = useState(false);
    const [gameOverData, setGameOverData] = useState<{ winner: string | null; players: PlayerInfo[] } | null>(null);

    // Rakip kopma
    const [opponentDisconnected, setOpponentDisconnected] = useState(false);

    // ============ SOCKET OLAYLARI ============

    // Odaya katıl (sayfa yüklendiğinde)
    useEffect(() => {
        if (!connected || !user) return;
        emit('join_room', { roomId, uid: user.uid });
    }, [connected, user, roomId, emit]);

    // Event listener'ları doğrudan socketRef ile kaydet
    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;

        const onRoundStart = (data: any) => {
            console.log('🎯 round_start alındı:', data.round);
            setCurrentRound(data.round);
            setCurrentLocation(data.location);
            setPlayers(data.players);
            setMyGuessSubmitted(false);
            setOpponentGuessed(false);
            setShowResult(false);
            setRoundResults([]);
            setActualLocation(null);
            setTimeLeft(90);
        };

        const onOpponentGuessed = () => {
            console.log('✓ Rakip tahmin etti');
            setOpponentGuessed(true);
        };

        const onRoundResult = (data: any) => {
            console.log('📊 round_result alındı:', data);
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

        const onGameOver = (data: any) => {
            console.log('🏆 game_over:', data);
            setGameOverData(data);
            setGameOver(true);
        };

        const onOpponentDisconnected = () => {
            console.log('🚪 Rakip ayrıldı');
            setOpponentDisconnected(true);
        };

        socket.on('round_start', onRoundStart);
        socket.on('opponent_guessed', onOpponentGuessed);
        socket.on('round_result', onRoundResult);
        socket.on('game_over', onGameOver);
        socket.on('opponent_disconnected', onOpponentDisconnected);

        return () => {
            socket.off('round_start', onRoundStart);
            socket.off('opponent_guessed', onOpponentGuessed);
            socket.off('round_result', onRoundResult);
            socket.off('game_over', onGameOver);
            socket.off('opponent_disconnected', onOpponentDisconnected);
        };
    }, [socketRef.current]);

    // Geri sayım timer
    useEffect(() => {
        if (showResult || gameOver || timeLeft <= 0 || currentRound === 0) return;
        const timer = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) {
                    clearInterval(timer);
                    return 0;
                }
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

    // ============ HELPER ============

    const myResult = roundResults.find(r => r.uid === user?.uid);
    const opponentResult = roundResults.find(r => r.uid !== user?.uid);
    const myPlayer = players.find(p => p.uid === user?.uid);
    const opponentPlayer = players.find(p => p.uid !== user?.uid);

    // ============ OYUN SONU EKRANI ============

    if (gameOver && gameOverData) {
        const iWon = gameOverData.winner === user?.uid;
        const isDraw = gameOverData.winner === null;

        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-primary)',
                padding: '24px',
            }}>
                <div className="glass-card animate-fadeIn" style={{ padding: '48px', maxWidth: '500px', width: '100%', textAlign: 'center' }}>
                    <div style={{ fontSize: '80px', marginBottom: '16px' }}>
                        {isDraw ? '🤝' : iWon ? '🏆' : '😔'}
                    </div>
                    <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>
                        <span className="gradient-text">
                            {isDraw ? 'Berabere!' : iWon ? 'Kazandın!' : 'Kaybettin!'}
                        </span>
                    </h1>

                    {/* Skor Tablosu */}
                    <div style={{ margin: '32px 0', display: 'flex', gap: '16px' }}>
                        {gameOverData.players.map((p, idx) => {
                            const isMe = p.uid === user?.uid;
                            const isWinner = p.uid === gameOverData.winner;
                            return (
                                <div key={p.uid} style={{
                                    flex: 1,
                                    padding: '20px',
                                    borderRadius: '12px',
                                    background: isWinner ? 'rgba(245, 166, 35, 0.1)' : 'var(--bg-secondary)',
                                    border: isWinner ? '2px solid var(--accent-gold)' : '1px solid transparent',
                                }}>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                        {isMe ? '🦁 Sen' : '⚔️ Rakip'}
                                    </div>
                                    <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>{p.username}</div>
                                    <div className="gradient-text" style={{ fontSize: '28px', fontWeight: 800 }}>
                                        {(p.totalScore || p.score || 0).toLocaleString('tr-TR')}
                                    </div>
                                    {isWinner && <div style={{ fontSize: '20px', marginTop: '4px' }}>🏆</div>}
                                </div>
                            );
                        })}
                    </div>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                        <button className="btn-primary" onClick={() => router.push('/multiplayer')} style={{ padding: '14px 32px', fontSize: '16px' }}>
                            ⚔️ Tekrar Oyna
                        </button>
                        <button className="btn-secondary" onClick={() => router.push('/play')} style={{ padding: '14px 32px', fontSize: '16px' }}>
                            🏠 Ana Sayfa
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ============ RAKİP KOPTU ============

    if (opponentDisconnected) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-primary)',
                padding: '24px',
            }}>
                <div className="glass-card animate-fadeIn" style={{ padding: '48px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
                    <div style={{ fontSize: '64px', marginBottom: '16px' }}>🚪</div>
                    <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Rakip Ayrıldı</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Rakibin bağlantısı koptu.</p>
                    <button className="btn-primary" onClick={() => router.push('/multiplayer')} style={{ padding: '14px 32px' }}>
                        Yeni Eşleşme Bul
                    </button>
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
            </div>
        );
    }

    // ============ TUR SONUCU OVERLAY ============

    const renderRoundResult = () => {
        if (!showResult || !myResult || !opponentResult || !actualLocation) return null;

        return (
            <div style={{
                position: 'absolute',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1100,
                width: '90%',
                maxWidth: '600px',
            }}>
                <div className="glass-card" style={{ padding: '24px' }}>
                    <h3 style={{ textAlign: 'center', fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>
                        Tur {currentRound} Sonucu
                    </h3>

                    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                        {/* Benim sonucum */}
                        <div style={{
                            flex: 1,
                            padding: '16px',
                            borderRadius: '10px',
                            background: myResult.roundScore >= opponentResult.roundScore ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                            border: `1px solid ${myResult.roundScore >= opponentResult.roundScore ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)'}`,
                            textAlign: 'center',
                        }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>🦁 Sen</div>
                            <div className="gradient-text" style={{ fontSize: '22px', fontWeight: 800 }}>{myResult.roundScore.toLocaleString('tr-TR')}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{myResult.distanceKm.toLocaleString('tr-TR')} km</div>
                        </div>

                        {/* Rakip sonucu */}
                        <div style={{
                            flex: 1,
                            padding: '16px',
                            borderRadius: '10px',
                            background: opponentResult.roundScore >= myResult.roundScore ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                            border: `1px solid ${opponentResult.roundScore >= myResult.roundScore ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)'}`,
                            textAlign: 'center',
                        }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>⚔️ {opponentResult.username}</div>
                            <div className="gradient-text" style={{ fontSize: '22px', fontWeight: 800 }}>{opponentResult.roundScore.toLocaleString('tr-TR')}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{opponentResult.distanceKm.toLocaleString('tr-TR')} km</div>
                        </div>
                    </div>

                    {/* Toplam Skor */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', padding: '0 8px' }}>
                        <span>Toplam: <strong style={{ color: 'var(--text-primary)' }}>{myResult.totalScore.toLocaleString('tr-TR')}</strong></span>
                        <span>Toplam: <strong style={{ color: 'var(--text-primary)' }}>{opponentResult.totalScore.toLocaleString('tr-TR')}</strong></span>
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
                    {/* Sol — Ben */}
                    <div style={{
                        background: 'rgba(10, 10, 15, 0.85)',
                        backdropFilter: 'blur(10px)',
                        padding: '6px 10px',
                        borderRadius: '10px',
                        border: '1px solid rgba(76, 175, 80, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        minWidth: 0,
                        flex: '0 1 auto',
                    }}>
                        <span style={{ fontSize: '14px' }}>🦁</span>
                        <span className="gradient-text" style={{ fontSize: '14px', fontWeight: 800 }}>
                            {(myPlayer?.score || 0).toLocaleString('tr-TR')}
                        </span>
                        {myGuessSubmitted && <span style={{ fontSize: '12px' }}>✓</span>}
                    </div>

                    {/* Orta — Tur ve Süre */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(10, 10, 15, 0.85)',
                        backdropFilter: 'blur(10px)',
                        padding: '6px 12px',
                        borderRadius: '16px',
                        border: '1px solid rgba(245, 166, 35, 0.2)',
                        flex: '0 1 auto',
                    }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                            {currentRound}/5
                        </span>
                        <div style={{
                            paddingLeft: '6px',
                            borderLeft: '1px solid rgba(255,255,255,0.1)',
                            fontSize: '14px',
                            fontWeight: 700,
                            color: timeLeft <= 10 ? '#F44336' : timeLeft <= 30 ? '#FF9800' : 'var(--text-primary)',
                        }}>
                            ⏱ {timeLeft}s
                        </div>
                    </div>

                    {/* Sağ — Rakip */}
                    <div style={{
                        background: 'rgba(10, 10, 15, 0.85)',
                        backdropFilter: 'blur(10px)',
                        padding: '6px 10px',
                        borderRadius: '10px',
                        border: '1px solid rgba(244, 67, 54, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        minWidth: 0,
                        flex: '0 1 auto',
                    }}>
                        <span style={{ fontSize: '14px' }}>⚔️</span>
                        <span className="gradient-text" style={{ fontSize: '14px', fontWeight: 800 }}>
                            {(opponentPlayer?.score || 0).toLocaleString('tr-TR')}
                        </span>
                        {opponentGuessed && <span style={{ fontSize: '12px' }}>✓</span>}
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
                opponentGuessLocation={showResult ? (opponentResult?.guessLocation || null) : null}
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
                    padding: '12px 24px',
                    borderRadius: '12px',
                    border: '1px solid rgba(245, 166, 35, 0.3)',
                    fontSize: '14px',
                    color: 'var(--text-secondary)',
                }}>
                    ✅ Tahmin gönderildi — {opponentGuessed ? 'Sonuç hesaplanıyor...' : 'Rakibin tahmini bekleniyor...'}
                </div>
            )}

            {/* Tur Sonucu Overlay */}
            {renderRoundResult()}
        </div>
    );
}
