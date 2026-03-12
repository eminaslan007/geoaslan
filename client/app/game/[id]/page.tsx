'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { gameAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc, increment, serverTimestamp } from 'firebase/firestore';
import StreetView from '@/components/StreetView';

// MiniMap ve GameSummary client-only (Leaflet SSR desteklemez)
const MiniMap = dynamic(() => import('@/components/MiniMap'), { ssr: false });
const GameSummary = dynamic(() => import('@/components/GameSummary'), { ssr: false });

interface RoundInfo {
    roundNumber: number;
    actualLocation: { lat: number; lng: number };
    guessLocation: { lat: number; lng: number } | null;
    distanceKm: number | null;
    score: number | null;
}

export default function GamePage() {
    const params = useParams();
    const router = useRouter();
    const gameId = params.id as string;
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [gameMode, setGameMode] = useState<'classic' | 'no_move' | 'nmpz'>('classic');
    const [mapId, setMapId] = useState('');
    const [currentRound, setCurrentRound] = useState(1);
    const [totalScore, setTotalScore] = useState(0);
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

    // Round result state
    const [showResult, setShowResult] = useState(false);
    const [roundResult, setRoundResult] = useState<{
        roundScore: number;
        distanceKm: number;
        actualLocation: { lat: number; lng: number };
        guessLocation: { lat: number; lng: number };
        isLastRound: boolean;
        nextLocation?: { lat: number; lng: number };
    } | null>(null);

    // Game summary state
    const [showSummary, setShowSummary] = useState(false);
    const [summaryData, setSummaryData] = useState<{
        totalScore: number;
        rounds: RoundInfo[];
        averageDistanceKm: number;
    } | null>(null);

    const [guessing, setGuessing] = useState(false);

    // Oyun bilgisini yükle
    useEffect(() => {
        gameAPI.get(gameId)
            .then(data => {
                setGameMode(data.game.mode);
                setMapId(data.game.mapId);
                setCurrentRound(data.game.currentRound);
                setTotalScore(data.game.totalScore);
                if (data.currentLocation) {
                    setCurrentLocation(data.currentLocation);
                }
                if (data.game.status === 'finished') {
                    handleViewSummary();
                }
            })
            .catch(() => router.push('/play'))
            .finally(() => setLoading(false));
    }, [gameId]);

    // Tahmin gönder
    const handleGuess = useCallback(async (lat: number, lng: number) => {
        if (guessing) return;
        setGuessing(true);

        try {
            const data = await gameAPI.guess(gameId, lat, lng);
            setRoundResult({
                roundScore: data.roundScore,
                distanceKm: data.distanceKm,
                actualLocation: data.actualLocation,
                guessLocation: data.guessLocation,
                isLastRound: data.isLastRound,
                nextLocation: data.nextLocation,
            });
            setTotalScore(data.totalScore);
            setShowResult(true);
        } catch (err: any) {
            console.error('Tahmin hatası:', err);
        } finally {
            setGuessing(false);
        }
    }, [gameId, guessing]);

    // Sonraki tura geç
    const handleNextRound = useCallback(() => {
        if (roundResult?.nextLocation) {
            setCurrentLocation(roundResult.nextLocation);
            setCurrentRound(prev => prev + 1);
            setShowResult(false);
            setRoundResult(null);
        }
    }, [roundResult]);

    // Özet ekranını göster + Firestore'a kaydet
    const handleViewSummary = useCallback(async () => {
        try {
            const data = await gameAPI.finish(gameId);
            setSummaryData({
                totalScore: data.totalScore,
                rounds: data.rounds,
                averageDistanceKm: data.averageDistanceKm,
            });
            setShowSummary(true);

            // Firestore'a oyun sonucu kaydet
            if (user) {
                try {
                    // Oyun dökümanı yaz
                    await setDoc(doc(db, 'games', gameId), {
                        userId: user.uid,
                        mapId: data.mapId || mapId,
                        mode: data.mode || gameMode,
                        totalScore: data.totalScore,
                        status: 'finished',
                        averageDistanceKm: data.averageDistanceKm,
                        rounds: data.rounds.map((r: any) => ({
                            roundNumber: r.roundNumber,
                            actualLat: r.actualLocation?.lat,
                            actualLng: r.actualLocation?.lng,
                            guessLat: r.guessLocation?.lat,
                            guessLng: r.guessLocation?.lng,
                            distanceKm: r.distanceKm,
                            score: r.score,
                        })),
                        createdAt: serverTimestamp(),
                    });

                    // Kullanıcı istatistiklerini güncelle (yoksa oluştur)
                    const userRef = doc(db, 'users', user.uid);
                    const userSnap = await getDoc(userRef);
                    const currentHighest = userSnap.exists() ? (userSnap.data().highestScore || 0) : 0;

                    await setDoc(userRef, {
                        totalGames: increment(1),
                        ...(data.totalScore > currentHighest ? { highestScore: data.totalScore } : {}),
                    }, { merge: true });
                } catch (fsErr) {
                    console.error('Firestore kayıt hatası:', fsErr);
                }
            }
        } catch (err: any) {
            console.error('Finish hatası:', err);
        }
    }, [gameId, user, mapId, gameMode]);

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-primary)',
                color: 'var(--text-secondary)',
                fontSize: '18px',
                flexDirection: 'column',
                gap: '16px',
            }}>
                <div style={{ fontSize: '48px' }}>🦁</div>
                <div>Oyun yükleniyor...</div>
            </div>
        );
    }

    // Özet ekranı
    if (showSummary && summaryData) {
        return (
            <GameSummary
                totalScore={summaryData.totalScore}
                rounds={summaryData.rounds}
                mapId={mapId}
                mode={gameMode}
                averageDistanceKm={summaryData.averageDistanceKm}
                onPlayAgain={() => router.push('/play')}
                onGoHome={() => router.push('/')}
            />
        );
    }

    const modeLabels: Record<string, string> = {
        classic: 'Classic',
        no_move: 'No Move',
        nmpz: 'NMPZ',
    };

    return (
        <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
            {/* Street View Panorama */}
            {currentLocation && (
                <StreetView
                    lat={currentLocation.lat}
                    lng={currentLocation.lng}
                    mode={gameMode}
                />
            )}

            {/* Game HUD - Üst Bilgi Çubuğu */}
            <div className="game-hud">
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    maxWidth: '100%',
                }}>
                    {/* Sol - Logo ve mod */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '24px' }}>🦁</span>
                        <span className={`mode-badge mode-${gameMode}`} style={{ fontSize: '11px' }}>
                            {modeLabels[gameMode]}
                        </span>
                    </div>

                    {/* Orta - Tur bilgisi */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'rgba(10, 10, 15, 0.7)',
                        backdropFilter: 'blur(10px)',
                        padding: '8px 20px',
                        borderRadius: '20px',
                        border: '1px solid rgba(245, 166, 35, 0.2)',
                    }}>
                        {[1, 2, 3, 4, 5].map((round) => (
                            <div
                                key={round}
                                style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    background: round < currentRound
                                        ? 'var(--gradient-primary)'
                                        : round === currentRound
                                            ? 'rgba(245, 166, 35, 0.2)'
                                            : 'rgba(255, 255, 255, 0.06)',
                                    color: round <= currentRound ? '#fff' : 'var(--text-secondary)',
                                    border: round === currentRound ? '2px solid var(--accent-gold)' : 'none',
                                }}
                            >
                                {round}
                            </div>
                        ))}
                    </div>

                    {/* Sağ - Puan */}
                    <div style={{
                        background: 'rgba(10, 10, 15, 0.7)',
                        backdropFilter: 'blur(10px)',
                        padding: '8px 20px',
                        borderRadius: '12px',
                        border: '1px solid rgba(245, 166, 35, 0.2)',
                    }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Puan: </span>
                        <span className="gradient-text" style={{ fontSize: '18px', fontWeight: 800 }}>
                            {totalScore.toLocaleString('tr-TR')}
                        </span>
                    </div>
                </div>
            </div>

            {/* Mini Harita - tüm durumlar için tek bileşen */}
            <MiniMap
                onGuess={handleGuess}
                guessDisabled={guessing || showResult}
                showResult={showResult}
                actualLocation={roundResult?.actualLocation || null}
                guessLocation={roundResult?.guessLocation || null}
                distanceKm={roundResult?.distanceKm ?? null}
                roundScore={roundResult?.roundScore ?? null}
                isLastRound={roundResult?.isLastRound}
                onNextRound={handleNextRound}
                onViewSummary={handleViewSummary}
            />
        </div>
    );
}
