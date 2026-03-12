import { Server, Socket } from 'socket.io';
import { getRandomLocations } from './data/locations';
import { haversineDistance, calculateScore } from './services/scoring';
import { v4 as uuidv4 } from 'uuid';

/**
 * Multiplayer (1v1) Sistemi
 * - Eşleşme kuyruğu
 * - Oda yönetimi
 * - Senkronize 5 tur oyun
 */

// Oyuncu bilgisi
interface Player {
    socketId: string;
    uid: string;
    username: string;
    score: number;
    currentGuess: { lat: number; lng: number } | null;
    guessedThisRound: boolean;
}

// Oda bilgisi
interface Room {
    id: string;
    mapId: string;
    mode: string;
    players: Map<string, Player>;
    locations: { lat: number; lng: number }[];
    currentRound: number;
    totalRounds: number;
    status: 'waiting' | 'playing' | 'round_result' | 'finished';
    roundTimer: ReturnType<typeof setTimeout> | null;
}

// Eşleşme kuyruğundaki oyuncu
interface QueueEntry {
    socketId: string;
    uid: string;
    username: string;
    mapId: string;
    mode: string;
}

// Aktif odalar ve kuyruk
const rooms = new Map<string, Room>();
const matchQueue: QueueEntry[] = [];
const playerRooms = new Map<string, string>(); // socketId -> roomId

/**
 * Socket.IO multiplayer kurulumu
 */
export function setupMultiplayer(io: Server): void {
    io.on('connection', (socket: Socket) => {
        console.log(`🔌 Oyuncu bağlandı: ${socket.id}`);

        // ==========================================
        // EŞLEŞME
        // ==========================================

        /**
         * Eşleşme kuyruğuna katıl
         */
        socket.on('find_match', (data: { uid: string; username: string; mapId: string; mode: string }) => {
            const { uid, username, mapId, mode } = data;

            // Zaten kuyrukta mı?
            const existingIdx = matchQueue.findIndex(q => q.uid === uid);
            if (existingIdx !== -1) {
                matchQueue.splice(existingIdx, 1);
            }

            // Aynı harita ve mod ile eşleşen birini ara
            const matchIdx = matchQueue.findIndex(
                q => q.mapId === mapId && q.mode === mode && q.uid !== uid
            );

            if (matchIdx !== -1) {
                // Eşleşme bulundu!
                const opponent = matchQueue.splice(matchIdx, 1)[0];
                const roomId = uuidv4();

                // Konumları oluştur
                const locations = getRandomLocations(mapId, 5);

                // Oda oluştur
                const room: Room = {
                    id: roomId,
                    mapId,
                    mode,
                    players: new Map(),
                    locations,
                    currentRound: 1,
                    totalRounds: 5,
                    status: 'playing',
                    roundTimer: null,
                };

                // Oyuncuları ekle
                room.players.set(socket.id, {
                    socketId: socket.id,
                    uid,
                    username,
                    score: 0,
                    currentGuess: null,
                    guessedThisRound: false,
                });

                room.players.set(opponent.socketId, {
                    socketId: opponent.socketId,
                    uid: opponent.uid,
                    username: opponent.username,
                    score: 0,
                    currentGuess: null,
                    guessedThisRound: false,
                });

                rooms.set(roomId, room);
                playerRooms.set(socket.id, roomId);
                playerRooms.set(opponent.socketId, roomId);

                // Socket odalarına katıl
                socket.join(roomId);
                const opponentSocket = io.sockets.sockets.get(opponent.socketId);
                opponentSocket?.join(roomId);

                console.log(`⚔️ Eşleşme: ${username} vs ${opponent.username} — Oda: ${roomId}`);

                // Her iki oyuncuya eşleşme bilgisi gönder
                const matchInfo = {
                    roomId,
                    mapId,
                    mode,
                    players: [
                        { uid, username },
                        { uid: opponent.uid, username: opponent.username },
                    ],
                };

                socket.emit('match_found', matchInfo);
                opponentSocket?.emit('match_found', matchInfo);

                // İlk turu başlat (navigasyon süresi için gecikme)
                setTimeout(() => {
                    startRound(io, roomId);
                }, 3500);

            } else {
                // Kuyruğa ekle
                matchQueue.push({ socketId: socket.id, uid, username, mapId, mode });
                socket.emit('match_queued', { position: matchQueue.length });
                console.log(`🔍 Kuyrukta: ${username} (${mapId}/${mode}) — Toplam: ${matchQueue.length}`);
            }
        });

        /**
         * Oyuncu oyun sayfasına geldiğinde odaya katıl
         * Singleton socket kullandığımız için aynı socket ID ile gelir
         * Ama yine de güvenlik için kontrol edelim
         */
        socket.on('join_room', (data: { roomId: string; uid: string }) => {
            const room = rooms.get(data.roomId);
            if (!room) return;

            // UID ile oyuncuyu bul
            let found = false;
            room.players.forEach((player, oldSocketId) => {
                if (player.uid === data.uid) {
                    found = true;
                    // Socket ID değiştiyse güncelle
                    if (oldSocketId !== socket.id) {
                        room.players.delete(oldSocketId);
                        player.socketId = socket.id;
                        room.players.set(socket.id, player);
                        playerRooms.delete(oldSocketId);
                        playerRooms.set(socket.id, data.roomId);
                        console.log(`🔄 Oyuncu socket güncellendi: ${player.username} (${oldSocketId} → ${socket.id})`);
                    }
                }
            });

            if (found) {
                socket.join(data.roomId);
                socket.emit('room_joined', { roomId: data.roomId });
                console.log(`🚪 Oyuncu odaya katıldı: ${socket.id} → ${data.roomId}`);
            }
        });

        /**
         * Eşleşme iptal
         */
        socket.on('cancel_match', () => {
            const idx = matchQueue.findIndex(q => q.socketId === socket.id);
            if (idx !== -1) {
                matchQueue.splice(idx, 1);
                socket.emit('match_cancelled');
            }
        });

        // ==========================================
        // OYUN
        // ==========================================

        /**
         * Tahmin gönder
         */
        socket.on('submit_guess', (data: { lat: number; lng: number }) => {
            const roomId = playerRooms.get(socket.id);
            if (!roomId) return;

            const room = rooms.get(roomId);
            if (!room || room.status !== 'playing') return;

            const player = room.players.get(socket.id);
            if (!player || player.guessedThisRound) return;

            player.currentGuess = { lat: data.lat, lng: data.lng };
            player.guessedThisRound = true;

            // Rakibe bildir
            socket.to(roomId).emit('opponent_guessed');

            // Her iki oyuncu da tahmin ettiyse → tur sonucu
            const allGuessed = Array.from(room.players.values()).every(p => p.guessedThisRound);
            if (allGuessed) {
                // Zamanlayıcıyı temizle
                if (room.roundTimer) {
                    clearTimeout(room.roundTimer);
                    room.roundTimer = null;
                }
                resolveRound(io, roomId);
            }
        });

        /**
         * Sonraki tura geç (hazır)
         */
        socket.on('ready_next_round', () => {
            const roomId = playerRooms.get(socket.id);
            if (!roomId) return;

            const room = rooms.get(roomId);
            if (!room || room.status !== 'round_result') return;

            // Her iki oyuncu da hazır olduğunda sonraki turu başlat
            const player = room.players.get(socket.id);
            if (player) {
                (player as any).readyForNext = true;
            }

            const allReady = Array.from(room.players.values()).every((p: any) => p.readyForNext);
            if (allReady) {
                room.currentRound++;
                if (room.currentRound > room.totalRounds) {
                    finishGame(io, roomId);
                } else {
                    startRound(io, roomId);
                }
            }
        });

        // ==========================================
        // BAĞLANTI KOPMA
        // ==========================================

        socket.on('disconnect', () => {
            console.log(`🔌 Oyuncu ayrıldı: ${socket.id}`);

            // Kuyruktan çıkar
            const qIdx = matchQueue.findIndex(q => q.socketId === socket.id);
            if (qIdx !== -1) matchQueue.splice(qIdx, 1);

            // Odadan çıkar
            const roomId = playerRooms.get(socket.id);
            if (roomId) {
                const room = rooms.get(roomId);
                if (room && room.status !== 'finished') {
                    // Rakibe bildir
                    socket.to(roomId).emit('opponent_disconnected');
                    room.status = 'finished';
                    if (room.roundTimer) clearTimeout(room.roundTimer);
                }
                playerRooms.delete(socket.id);
            }
        });
    });
}

/**
 * Turu başlat — her iki oyuncuya konum gönder
 */
function startRound(io: Server, roomId: string): void {
    const room = rooms.get(roomId);
    if (!room) return;

    room.status = 'playing';

    // Oyuncuları sıfırla
    room.players.forEach(player => {
        player.currentGuess = null;
        player.guessedThisRound = false;
        (player as any).readyForNext = false;
    });

    const location = room.locations[room.currentRound - 1];

    io.to(roomId).emit('round_start', {
        round: room.currentRound,
        totalRounds: room.totalRounds,
        location,
        players: Array.from(room.players.values()).map(p => ({
            uid: p.uid,
            username: p.username,
            score: p.score,
        })),
    });

    // 90 saniye süre sınırı
    room.roundTimer = setTimeout(() => {
        // Tahmin etmeyenlere boş tahmin ver
        room.players.forEach(player => {
            if (!player.guessedThisRound) {
                player.currentGuess = null;
                player.guessedThisRound = true;
            }
        });
        resolveRound(io, roomId);
    }, 90000);
}

/**
 * Tur sonucunu hesapla ve gönder
 */
function resolveRound(io: Server, roomId: string): void {
    const room = rooms.get(roomId);
    if (!room) return;

    room.status = 'round_result';
    const actualLocation = room.locations[room.currentRound - 1];

    const results: any[] = [];

    room.players.forEach(player => {
        let distanceKm = 0;
        let roundScore = 0;

        if (player.currentGuess) {
            distanceKm = haversineDistance(
                actualLocation.lat, actualLocation.lng,
                player.currentGuess.lat, player.currentGuess.lng
            );
            roundScore = calculateScore(distanceKm);
        }

        player.score += roundScore;

        results.push({
            uid: player.uid,
            username: player.username,
            guessLocation: player.currentGuess,
            distanceKm: Math.round(distanceKm * 100) / 100,
            roundScore,
            totalScore: player.score,
        });
    });

    const isLastRound = room.currentRound >= room.totalRounds;

    io.to(roomId).emit('round_result', {
        round: room.currentRound,
        actualLocation,
        results,
        isLastRound,
    });

    // Son tursa doğrudan oyunu bitir
    if (isLastRound) {
        setTimeout(() => finishGame(io, roomId), 500);
    }
}

/**
 * Oyunu bitir — kazananı belirle
 */
function finishGame(io: Server, roomId: string): void {
    const room = rooms.get(roomId);
    if (!room) return;

    room.status = 'finished';
    if (room.roundTimer) clearTimeout(room.roundTimer);

    const players = Array.from(room.players.values());
    const sorted = players.sort((a, b) => b.score - a.score);

    const winner = sorted[0].score > sorted[1].score ? sorted[0].uid : null; // null = berabere

    io.to(roomId).emit('game_over', {
        winner,
        players: sorted.map(p => ({
            uid: p.uid,
            username: p.username,
            totalScore: p.score,
        })),
    });

    // Odayı temizle (30 sn sonra)
    setTimeout(() => {
        room.players.forEach((_, socketId) => playerRooms.delete(socketId));
        rooms.delete(roomId);
    }, 30000);
}
