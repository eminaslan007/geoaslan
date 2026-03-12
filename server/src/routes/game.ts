import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase, saveDatabase } from '../db/database';
import { getRandomLocations } from '../data/locations';
import { haversineDistance, calculateScore, getMedal } from '../services/scoring';
import { optionalAuth, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * POST /api/game/start
 * Yeni oyun oturumu başlat
 * Body: { mapId: string, mode: 'classic' | 'no_move' | 'nmpz' }
 */
router.post('/start', optionalAuth as any, (req: AuthRequest, res: Response) => {
    try {
        const { mapId, mode } = req.body;

        // Validasyon
        if (!mapId) {
            return res.status(400).json({ error: 'Harita seçimi zorunludur.' });
        }

        const validModes = ['classic', 'no_move', 'nmpz'];
        const gameMode = mode && validModes.includes(mode) ? mode : 'classic';

        // 5 rastgele konum seç
        let locations;
        try {
            locations = getRandomLocations(mapId, 5);
        } catch {
            return res.status(404).json({ error: 'Geçersiz harita ID.' });
        }

        if (locations.length < 5) {
            return res.status(400).json({ error: 'Bu haritada yeterli konum yok.' });
        }

        const gameId = uuidv4();
        const db = getDatabase();

        // Oyun oturumunu oluştur
        db.run(
            `INSERT INTO games (id, user_id, map_id, mode, locations) VALUES (?, ?, ?, ?, ?)`,
            [gameId, req.userId || null, mapId, gameMode, JSON.stringify(locations)]
        );

        // Her tur için round kaydı oluştur
        locations.forEach((loc, index) => {
            db.run(
                `INSERT INTO rounds (game_id, round_number, actual_lat, actual_lng) VALUES (?, ?, ?, ?)`,
                [gameId, index + 1, loc.lat, loc.lng]
            );
        });

        saveDatabase();

        // İlk tur konumunu döndür
        res.status(201).json({
            gameId,
            mode: gameMode,
            mapId,
            currentRound: 1,
            totalRounds: 5,
            location: locations[0], // İlk turun konumu
        });
    } catch (error) {
        console.error('Game start hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
});

/**
 * POST /api/game/guess
 * Tur tahmini gönder
 * Body: { gameId: string, guessLat: number, guessLng: number }
 */
router.post('/guess', optionalAuth as any, (req: AuthRequest, res: Response) => {
    try {
        const { gameId, guessLat, guessLng } = req.body;

        if (!gameId || guessLat === undefined || guessLng === undefined) {
            return res.status(400).json({ error: 'gameId, guessLat ve guessLng zorunludur.' });
        }

        const db = getDatabase();

        // Oyun durumunu kontrol et
        const gameResult = db.exec(
            `SELECT id, user_id, current_round, total_score, status, locations, map_id, mode FROM games WHERE id = '${gameId.replace(/'/g, "''")}'`
        );

        if (gameResult.length === 0 || gameResult[0].values.length === 0) {
            return res.status(404).json({ error: 'Oyun bulunamadı.' });
        }

        const game = {
            id: gameResult[0].values[0][0] as string,
            userId: gameResult[0].values[0][1] as number | null,
            currentRound: gameResult[0].values[0][2] as number,
            totalScore: gameResult[0].values[0][3] as number,
            status: gameResult[0].values[0][4] as string,
            locations: JSON.parse(gameResult[0].values[0][5] as string),
            mapId: gameResult[0].values[0][6] as string,
            mode: gameResult[0].values[0][7] as string,
        };

        if (game.status !== 'active') {
            return res.status(400).json({ error: 'Bu oyun zaten tamamlanmış.' });
        }

        // Mevcut turun bilgisini al
        const roundResult = db.exec(
            `SELECT id, actual_lat, actual_lng, guessed FROM rounds WHERE game_id = '${gameId.replace(/'/g, "''")}' AND round_number = ${game.currentRound}`
        );

        if (roundResult.length === 0 || roundResult[0].values.length === 0) {
            return res.status(400).json({ error: 'Tur bulunamadı.' });
        }

        const round = {
            id: roundResult[0].values[0][0] as number,
            actualLat: roundResult[0].values[0][1] as number,
            actualLng: roundResult[0].values[0][2] as number,
            guessed: roundResult[0].values[0][3] as number,
        };

        if (round.guessed) {
            return res.status(400).json({ error: 'Bu tur için zaten tahmin yapılmış.' });
        }

        // Mesafe ve puan hesapla
        const distanceKm = haversineDistance(round.actualLat, round.actualLng, guessLat, guessLng);
        const score = calculateScore(distanceKm);
        const newTotalScore = game.totalScore + score;

        // Round'u güncelle
        db.run(
            `UPDATE rounds SET guess_lat = ?, guess_lng = ?, distance_km = ?, score = ?, guessed = 1 WHERE id = ?`,
            [guessLat, guessLng, distanceKm, score, round.id]
        );

        const isLastRound = game.currentRound >= 5;

        if (isLastRound) {
            // Oyunu bitir
            db.run(
                `UPDATE games SET total_score = ?, status = 'finished', current_round = ? WHERE id = ?`,
                [newTotalScore, game.currentRound, game.id]
            );
        } else {
            // Sonraki tura geç
            db.run(
                `UPDATE games SET total_score = ?, current_round = ? WHERE id = ?`,
                [newTotalScore, game.currentRound + 1, game.id]
            );
        }

        saveDatabase();

        // Yanıt
        const response: any = {
            roundNumber: game.currentRound,
            actualLocation: { lat: round.actualLat, lng: round.actualLng },
            guessLocation: { lat: guessLat, lng: guessLng },
            distanceKm: Math.round(distanceKm * 100) / 100,
            roundScore: score,
            totalScore: newTotalScore,
            isLastRound,
        };

        if (!isLastRound) {
            // Sonraki tur konumunu ekle
            response.nextLocation = game.locations[game.currentRound]; // 0-indexed, current round zaten +1
            response.nextRound = game.currentRound + 1;
        }

        res.json(response);
    } catch (error) {
        console.error('Game guess hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
});

/**
 * POST /api/game/finish
 * Oyunu bitir ve istatistikleri kaydet
 * Body: { gameId: string }
 */
router.post('/finish', optionalAuth as any, (req: AuthRequest, res: Response) => {
    try {
        const { gameId } = req.body;

        if (!gameId) {
            return res.status(400).json({ error: 'gameId zorunludur.' });
        }

        const db = getDatabase();

        // Oyun bilgilerini al
        const gameResult = db.exec(
            `SELECT id, user_id, map_id, mode, total_score, status FROM games WHERE id = '${gameId.replace(/'/g, "''")}'`
        );

        if (gameResult.length === 0 || gameResult[0].values.length === 0) {
            return res.status(404).json({ error: 'Oyun bulunamadı.' });
        }

        const game = {
            id: gameResult[0].values[0][0] as string,
            userId: gameResult[0].values[0][1] as number | null,
            mapId: gameResult[0].values[0][2] as string,
            mode: gameResult[0].values[0][3] as string,
            totalScore: gameResult[0].values[0][4] as number,
            status: gameResult[0].values[0][5] as string,
        };

        // Tüm turları getir
        const roundsResult = db.exec(
            `SELECT round_number, actual_lat, actual_lng, guess_lat, guess_lng, distance_km, score FROM rounds WHERE game_id = '${gameId.replace(/'/g, "''")}' ORDER BY round_number`
        );

        const rounds = roundsResult.length > 0 ? roundsResult[0].values.map(row => ({
            roundNumber: row[0] as number,
            actualLocation: { lat: row[1] as number, lng: row[2] as number },
            guessLocation: row[3] !== null ? { lat: row[3] as number, lng: row[4] as number } : null,
            distanceKm: row[5] as number | null,
            score: row[6] as number | null,
        })) : [];

        // Kullanıcı istatistiklerini güncelle
        if (game.userId) {
            db.run(`UPDATE users SET total_games = total_games + 1 WHERE id = ?`, [game.userId]);

            // En yüksek skor güncelleme
            const userResult = db.exec(`SELECT highest_score FROM users WHERE id = ${game.userId}`);
            if (userResult.length > 0 && userResult[0].values.length > 0) {
                const currentHighest = userResult[0].values[0][0] as number;
                if (game.totalScore > currentHighest) {
                    db.run(`UPDATE users SET highest_score = ? WHERE id = ?`, [game.totalScore, game.userId]);
                }
            }
        }

        // Oyunu finished olarak işaretle (eğer henüz yapılmadıysa)
        if (game.status !== 'finished') {
            db.run(`UPDATE games SET status = 'finished' WHERE id = ?`, [game.id]);
        }

        saveDatabase();

        // Ortalama mesafe hesapla
        const guessedRounds = rounds.filter(r => r.distanceKm !== null);
        const avgDistance = guessedRounds.length > 0
            ? guessedRounds.reduce((sum, r) => sum + (r.distanceKm || 0), 0) / guessedRounds.length
            : 0;

        const medal = getMedal(game.totalScore);

        res.json({
            gameId: game.id,
            mapId: game.mapId,
            mode: game.mode,
            totalScore: game.totalScore,
            maxScore: 25000,
            averageDistanceKm: Math.round(avgDistance * 100) / 100,
            medal,
            rounds,
        });
    } catch (error) {
        console.error('Game finish hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
});

/**
 * GET /api/game/:id
 * Aktif oyun durumunu getir
 */
router.get('/:id', optionalAuth as any, (req: AuthRequest, res: Response) => {
    try {
        const gameId = req.params.id;
        const db = getDatabase();

        const gameResult = db.exec(
            `SELECT id, map_id, mode, current_round, total_score, status, locations FROM games WHERE id = '${gameId.replace(/'/g, "''")}'`
        );

        if (gameResult.length === 0 || gameResult[0].values.length === 0) {
            return res.status(404).json({ error: 'Oyun bulunamadı.' });
        }

        const row = gameResult[0].values[0];
        const game = {
            id: row[0] as string,
            mapId: row[1] as string,
            mode: row[2] as string,
            currentRound: row[3] as number,
            totalScore: row[4] as number,
            status: row[5] as string,
            locations: JSON.parse(row[6] as string),
        };

        // Tamamlanmış turları getir
        const roundsResult = db.exec(
            `SELECT round_number, actual_lat, actual_lng, guess_lat, guess_lng, distance_km, score, guessed FROM rounds WHERE game_id = '${gameId.replace(/'/g, "''")}' ORDER BY round_number`
        );

        const rounds = roundsResult.length > 0 ? roundsResult[0].values.map(r => ({
            roundNumber: r[0] as number,
            actualLocation: { lat: r[1] as number, lng: r[2] as number },
            guessLocation: r[3] !== null ? { lat: r[3] as number, lng: r[4] as number } : null,
            distanceKm: r[5] as number | null,
            score: r[6] as number | null,
            guessed: r[7] as number,
        })) : [];

        const response: any = {
            game: {
                id: game.id,
                mapId: game.mapId,
                mode: game.mode,
                currentRound: game.currentRound,
                totalScore: game.totalScore,
                status: game.status,
                totalRounds: 5,
            },
            rounds,
        };

        // Aktif oyunsa mevcut turun konumunu da gönder
        if (game.status === 'active') {
            response.currentLocation = game.locations[game.currentRound - 1];
        }

        res.json(response);
    } catch (error) {
        console.error('Game get hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
});

/**
 * GET /api/game/user/history
 * Kullanıcının oyun geçmişi
 */
router.get('/user/history', optionalAuth as any, (req: AuthRequest, res: Response) => {
    try {
        if (!req.userId) {
            return res.status(401).json({ error: 'Giriş yapmanız gerekiyor.' });
        }

        const db = getDatabase();
        const result = db.exec(
            `SELECT id, map_id, mode, total_score, status, created_at FROM games WHERE user_id = ${req.userId} ORDER BY created_at DESC LIMIT 20`
        );

        const games = result.length > 0 ? result[0].values.map(row => ({
            id: row[0],
            mapId: row[1],
            mode: row[2],
            totalScore: row[3],
            status: row[4],
            createdAt: row[5],
            medal: getMedal(row[3] as number),
        })) : [];

        res.json({ games });
    } catch (error) {
        console.error('Game history hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
});

export default router;
