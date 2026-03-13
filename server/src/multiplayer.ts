import { Server, Socket } from 'socket.io';
import { getRandomLocations } from './data/locations';
import { haversineDistance, calculateScore } from './services/scoring';
import { v4 as uuidv4 } from 'uuid';

/**
 * Multiplayer Sistemi
 * - 1v1 Otomatik Eşleşme (2 kişi)
 * - Özel Oda (2-4 kişi, kod ile)
 */

// Oyuncu bilgisi
interface Player {
    socketId: string;
    uid: string;
    username: string;
    score: number;
    currentGuess: { lat: number; lng: number } | null;
    guessedThisRound: boolean;
    readyForNext: boolean;
    isHost: boolean;
}

// Oda bilgisi
interface Room {
    id: string;
    code: string;          // 6 haneli insana okunabilir kod (özel odalar için)
    mapId: string;
    mode: string;
    players: Map<string, Player>;
    locations: { lat: number; lng: number }[];
    currentRound: number;
    totalRounds: number;
    maxPlayers: number;    // 2 = 1v1, 3 = üçlü mod
    status: 'lobby' | 'playing' | 'round_result' | 'finished';
    roundTimer: ReturnType<typeof setTimeout> | null;
    isPrivate: boolean;    // true = özel oda (kod ile girilen)
}

// Eşleşme kuyruğundaki oyuncu (1v1 için)
interface QueueEntry {
    socketId: string;
    uid: string;
    username: string;
    mapId: string;
    mode: string;
    maxPlayers: number;
}

// Aktif odalar ve kuyruk
const rooms = new Map<string, Room>();
const matchQueue: QueueEntry[] = [];
const playerRooms = new Map<string, string>(); // socketId -> roomId
const codesToRooms = new Map<string, string>(); // code -> roomId

/**
 * 6 haneli benzersiz oda kodu üret
 */
function generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // karışık olmayan karakterler
    let code = '';
    do {
        code = '';
        for (let i = 0; i < 6; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
    } while (codesToRooms.has(code));
    return code;
}

/**
 * Odanın lobby durumunu tüm oyunculara gönder
 */
function broadcastLobbyState(io: Server, roomId: string): void {
    const room = rooms.get(roomId);
    if (!room) return;

    io.to(roomId).emit('lobby_update', {
        roomId: room.id,
        code: room.code,
        mapId: room.mapId,
        mode: room.mode,
        maxPlayers: room.maxPlayers,
        players: Array.from(room.players.values()).map(p => ({
            uid: p.uid,
            username: p.username,
            isHost: p.isHost,
        })),
        canStart: room.players.size >= 2,
    });
}

/**
 * Socket.IO multiplayer kurulumu
 */
export function setupMultiplayer(io: Server): void {
    io.on('connection', (socket: Socket) => {
        console.log(`🔌 Oyuncu bağlandı: ${socket.id}`);

        // ==========================================
        // 1v1 OTOMATİK EŞLEŞME (mevcut sistem)
        // ==========================================

        socket.on('find_match', (data: { uid: string; username: string; mapId: string; mode: string; maxPlayers?: number }) => {
            const { uid, username, mapId, mode, maxPlayers = 2 } = data; // varsayılan 2 (1v1)

            // Varsa eski arayışı sil
            const existingIdx = matchQueue.findIndex(q => q.uid === uid);
            if (existingIdx !== -1) matchQueue.splice(existingIdx, 1);

            // Uygun rakipleri bul (Aynı harita, aynı mod ve aynı kişi sayısı isteyen, kendi değil)
            const potentialOpponents = matchQueue.filter(
                q => q.mapId === mapId && q.mode === mode && q.maxPlayers === maxPlayers && q.uid !== uid
            );

            // Gerekli rakip sayısı = Seçilen oyuncu sayısı - 1 (kendisi)
            const neededOpponents = maxPlayers - 1;

            if (potentialOpponents.length >= neededOpponents) {
                // Yeterli rakip bulundu! Rakipleri kuyruktan çek
                const selectedOpponents = potentialOpponents.slice(0, neededOpponents);

                // Seçilenleri asıl kuyruktan sil
                selectedOpponents.forEach(opp => {
                    const idx = matchQueue.findIndex(q => q.socketId === opp.socketId);
                    if (idx !== -1) matchQueue.splice(idx, 1);
                });

                const roomId = uuidv4();
                const code = generateRoomCode();
                const locations = getRandomLocations(mapId, 5);

                const room: Room = {
                    id: roomId,
                    code,
                    mapId,
                    mode,
                    players: new Map(),
                    locations,
                    currentRound: 1,
                    totalRounds: 5,
                    maxPlayers,
                    status: 'playing',
                    roundTimer: null,
                    isPrivate: false,
                };

                // Kendisini odaya ekle
                room.players.set(socket.id, {
                    socketId: socket.id, uid, username,
                    score: 0, currentGuess: null, guessedThisRound: false, readyForNext: false, isHost: true,
                });

                // Diğerlerini odaya ekle
                const matchPlayersResponse = [{ uid, username }];

                selectedOpponents.forEach(opp => {
                    room.players.set(opp.socketId, {
                        socketId: opp.socketId, uid: opp.uid, username: opp.username,
                        score: 0, currentGuess: null, guessedThisRound: false, readyForNext: false, isHost: false,
                    });
                    matchPlayersResponse.push({ uid: opp.uid, username: opp.username });
                });

                rooms.set(roomId, room);
                codesToRooms.set(code, roomId);

                // Tüm oyuncuları socket odasına (roomId) al ve haber ver
                const matchInfo = {
                    roomId, mapId, mode, maxPlayers,
                    players: matchPlayersResponse,
                };

                // Kendi işlemleri
                playerRooms.set(socket.id, roomId);
                socket.join(roomId);
                socket.emit('match_found', matchInfo);

                // Diğer oyuncuların işlemleri
                selectedOpponents.forEach(opp => {
                    playerRooms.set(opp.socketId, roomId);
                    const opponentSocket = io.sockets.sockets.get(opp.socketId);
                    if (opponentSocket) {
                        opponentSocket.join(roomId);
                        opponentSocket.emit('match_found', matchInfo);
                    }
                });

                console.log(`⚔️ Otomatik Eşleşme Bulundu (${maxPlayers} Kişi) — Oda: ${roomId} | Katılanlar: ${matchPlayersResponse.map(p => p.username).join(', ')}`);

                setTimeout(() => startRound(io, roomId), 3500);
            } else {
                matchQueue.push({ socketId: socket.id, uid, username, mapId, mode, maxPlayers });
                socket.emit('match_queued', { position: matchQueue.length });
                console.log(`🔍 Otomatik Kuyrukta (${maxPlayers} Kişi): ${username} (Bekleyen uygun kişi: ${potentialOpponents.length}/${neededOpponents})`);
            }
        });

        socket.on('cancel_match', () => {
            const idx = matchQueue.findIndex(q => q.socketId === socket.id);
            if (idx !== -1) {
                matchQueue.splice(idx, 1);
                socket.emit('match_cancelled');
            }
        });

        // ==========================================
        // ÖZEL ODA SİSTEMİ (2-4 kişi)
        // ==========================================

        /**
         * Özel oda oluştur
         */
        socket.on('create_room', (data: {
            uid: string;
            username: string;
            mapId: string;
            mode: string;
            maxPlayers: number;
        }) => {
            console.log(`🚨 SERVER ALDI: create_room`, data);
            try {
                const { uid, username, mapId, mode, maxPlayers } = data;

                // Önceki odadan çıkar
                leaveCurrentRoom(io, socket);

                const roomId = uuidv4();
                const code = generateRoomCode();
                const locations = getRandomLocations(mapId, 5);

                const room: Room = {
                    id: roomId,
                    code,
                    mapId,
                    mode,
                    players: new Map(),
                    locations,
                    currentRound: 1,
                    totalRounds: 5,
                    maxPlayers: Math.min(Math.max(maxPlayers, 2), 4),
                    status: 'lobby',
                    roundTimer: null,
                    isPrivate: true,
                };

                room.players.set(socket.id, {
                    socketId: socket.id, uid, username,
                    score: 0, currentGuess: null, guessedThisRound: false, readyForNext: false, isHost: true,
                });

                rooms.set(roomId, room);
                codesToRooms.set(code, roomId);
                playerRooms.set(socket.id, roomId);

                socket.join(roomId);

                console.log(`🏠 Özel oda oluşturuldu: ${code} (${maxPlayers} kişilik) — Host: ${username}`);

                socket.emit('room_created', { roomId, code });
                broadcastLobbyState(io, roomId);
            } catch (err) {
                console.error(`❌ create_room HATASI:`, err);
                socket.emit('join_error', { message: 'Oda oluşturulurken bir hata oluştu.' });
            }
        });

        /**
         * Özel odaya kod ile katıl
         */
        socket.on('join_private_room', (data: { uid: string; username: string; code: string }) => {
            const { uid, username, code } = data;

            const roomId = codesToRooms.get(code.toUpperCase());
            if (!roomId) {
                socket.emit('join_error', { message: 'Oda bulunamadı. Kodu kontrol et.' });
                return;
            }

            const room = rooms.get(roomId);
            if (!room) {
                socket.emit('join_error', { message: 'Oda artık mevcut değil.' });
                return;
            }

            if (room.status !== 'lobby') {
                socket.emit('join_error', { message: 'Oyun zaten başladı.' });
                return;
            }

            if (room.players.size >= room.maxPlayers) {
                socket.emit('join_error', { message: 'Oda dolu.' });
                return;
            }

            // Zaten bu odada mı?
            let alreadyIn = false;
            room.players.forEach(p => { if (p.uid === uid) alreadyIn = true; });
            if (alreadyIn) {
                socket.emit('join_error', { message: 'Zaten bu odasındasın.' });
                return;
            }

            leaveCurrentRoom(io, socket);

            room.players.set(socket.id, {
                socketId: socket.id, uid, username,
                score: 0, currentGuess: null, guessedThisRound: false, readyForNext: false, isHost: false,
            });
            playerRooms.set(socket.id, roomId);
            socket.join(roomId);

            console.log(`👥 ${username} odaya katıldı: ${code} (${room.players.size}/${room.maxPlayers})`);

            socket.emit('room_joined', { roomId });
            broadcastLobbyState(io, roomId);
        });

        /**
         * Oda ayarlarını güncelle (yalnızca host)
         */
        socket.on('update_room', (data: { mapId?: string; mode?: string; maxPlayers?: number }) => {
            const roomId = playerRooms.get(socket.id);
            if (!roomId) return;

            const room = rooms.get(roomId);
            if (!room || room.status !== 'lobby') return;

            const player = room.players.get(socket.id);
            if (!player?.isHost) return;

            if (data.mapId) room.mapId = data.mapId;
            if (data.mode) room.mode = data.mode;
            if (data.maxPlayers) {
                room.maxPlayers = Math.min(Math.max(data.maxPlayers, 2), 4);
                // Yeni konumları da al
                room.locations = getRandomLocations(room.mapId, 5);
            }

            broadcastLobbyState(io, roomId);
        });

        /**
         * Oyunu başlat (yalnızca host, min 2 kişi)
         */
        socket.on('start_game', () => {
            const roomId = playerRooms.get(socket.id);
            if (!roomId) return;

            const room = rooms.get(roomId);
            if (!room || room.status !== 'lobby') return;

            const player = room.players.get(socket.id);
            if (!player?.isHost) return;

            if (room.players.size < 2) {
                socket.emit('start_error', { message: 'En az 2 kişi gerekli.' });
                return;
            }

            // Yeni konumlar al
            room.locations = getRandomLocations(room.mapId, 5);
            room.currentRound = 1;
            room.status = 'playing';

            const playerList = Array.from(room.players.values()).map(p => ({
                uid: p.uid,
                username: p.username,
            }));

            io.to(roomId).emit('game_starting', { players: playerList, mapId: room.mapId, mode: room.mode });

            console.log(`▶️ Özel oda başladı: ${room.code} — ${room.players.size} oyuncu`);

            setTimeout(() => startRound(io, roomId), 3500);
        });

        // ==========================================
        // ORTAK: ODAYA YENİDEN KATILMA
        // ==========================================

        socket.on('join_room', (data: { roomId: string; uid: string }) => {
            const room = rooms.get(data.roomId);
            if (!room) return;

            room.players.forEach((player, oldSocketId) => {
                if (player.uid === data.uid) {
                    if (oldSocketId !== socket.id) {
                        room.players.delete(oldSocketId);
                        player.socketId = socket.id;
                        room.players.set(socket.id, player);
                        playerRooms.delete(oldSocketId);
                        playerRooms.set(socket.id, data.roomId);
                        console.log(`🔄 Socket güncellendi: ${player.username}`);
                    }
                    socket.join(data.roomId);
                    socket.emit('room_joined', { roomId: data.roomId });
                }
            });
        });

        // ==========================================
        // OYUN ETKİNLİKLERİ
        // ==========================================

        socket.on('submit_guess', (data: { lat: number; lng: number }) => {
            const roomId = playerRooms.get(socket.id);
            if (!roomId) return;

            const room = rooms.get(roomId);
            if (!room || room.status !== 'playing') return;

            const player = room.players.get(socket.id);
            if (!player || player.guessedThisRound) return;

            player.currentGuess = { lat: data.lat, lng: data.lng };
            player.guessedThisRound = true;

            // Diğer oyunculara bildir
            const guessedCount = Array.from(room.players.values()).filter(p => p.guessedThisRound).length;
            socket.to(roomId).emit('player_guessed', {
                uid: player.uid,
                username: player.username,
                guessedCount,
                totalPlayers: room.players.size,
            });

            const allGuessed = guessedCount === room.players.size;
            if (allGuessed) {
                if (room.roundTimer) {
                    clearTimeout(room.roundTimer);
                    room.roundTimer = null;
                }
                resolveRound(io, roomId);
            }
        });

        socket.on('ready_next_round', () => {
            const roomId = playerRooms.get(socket.id);
            if (!roomId) return;

            const room = rooms.get(roomId);
            if (!room || room.status !== 'round_result') return;

            const player = room.players.get(socket.id);
            if (player) player.readyForNext = true;

            const allReady = Array.from(room.players.values()).every(p => p.readyForNext);
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

            const qIdx = matchQueue.findIndex(q => q.socketId === socket.id);
            if (qIdx !== -1) matchQueue.splice(qIdx, 1);

            const roomId = playerRooms.get(socket.id);
            if (roomId) {
                const room = rooms.get(roomId);
                if (room) {
                    const leavingPlayer = room.players.get(socket.id);

                    if (room.status === 'lobby') {
                        // Lobi: oyuncuyu çıkar, eğer host çıktıysa yeni host ata
                        room.players.delete(socket.id);
                        playerRooms.delete(socket.id);

                        if (room.players.size === 0) {
                            // Oda boşaldı, temizle
                            codesToRooms.delete(room.code);
                            rooms.delete(roomId);
                        } else {
                            // Host çıktıysa yeni host ata
                            if (leavingPlayer?.isHost) {
                                const firstPlayer = room.players.values().next().value;
                                if (firstPlayer) firstPlayer.isHost = true;
                            }
                            broadcastLobbyState(io, roomId);
                        }
                    } else if (room.status !== 'finished') {
                        // Oyun sürerken kopma
                        socket.to(roomId).emit('player_disconnected', {
                            uid: leavingPlayer?.uid,
                            username: leavingPlayer?.username,
                        });

                        // 1v1 ise oyunu bitir
                        if (room.maxPlayers === 2) {
                            room.status = 'finished';
                            if (room.roundTimer) clearTimeout(room.roundTimer);
                        } else {
                            // 3+ kişilik: devam et (kopan oyuncu boş tahmin ver)
                            room.players.delete(socket.id);
                            playerRooms.delete(socket.id);

                            if (room.players.size < 2) {
                                room.status = 'finished';
                                if (room.roundTimer) clearTimeout(room.roundTimer);
                                io.to(roomId).emit('game_aborted', { reason: 'Yeterli oyuncu kalmadı.' });
                            } else if (room.status === 'playing') {
                                // Kalan oyuncuların hepsi tahmin ettiyse turu bitir
                                const allGuessed = Array.from(room.players.values()).every(p => p.guessedThisRound);
                                if (allGuessed) resolveRound(io, roomId);
                            } else if (room.status === 'round_result') {
                                // Kalan oyuncuların hepsi hazırsa devam et
                                const allReady = Array.from(room.players.values()).every(p => p.readyForNext);
                                if (allReady) {
                                    room.currentRound++;
                                    if (room.currentRound > room.totalRounds) finishGame(io, roomId);
                                    else startRound(io, roomId);
                                }
                            }
                        }
                    }
                }
                playerRooms.delete(socket.id);
            }
        });
    });
}

/**
 * Oyuncuyu mevcut odasından çıkar
 */
function leaveCurrentRoom(io: Server, socket: Socket): void {
    const currentRoomId = playerRooms.get(socket.id);
    if (!currentRoomId) return;

    const room = rooms.get(currentRoomId);
    if (room && room.status === 'lobby') {
        room.players.delete(socket.id);
        playerRooms.delete(socket.id);
        socket.leave(currentRoomId);

        if (room.players.size === 0) {
            codesToRooms.delete(room.code);
            rooms.delete(currentRoomId);
        } else {
            broadcastLobbyState(io, currentRoomId);
        }
    }
}

/**
 * Turu başlat
 */
function startRound(io: Server, roomId: string): void {
    const room = rooms.get(roomId);
    if (!room) return;

    room.status = 'playing';

    room.players.forEach(player => {
        player.currentGuess = null;
        player.guessedThisRound = false;
        player.readyForNext = false;
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

    // Yüksek puandan düşüğe sırala
    results.sort((a, b) => b.roundScore - a.roundScore);

    const isLastRound = room.currentRound >= room.totalRounds;

    io.to(roomId).emit('round_result', {
        round: room.currentRound,
        actualLocation,
        results,
        isLastRound,
    });

    if (isLastRound) {
        setTimeout(() => finishGame(io, roomId), 500);
    }
}

/**
 * Oyunu bitir — sıralamayı belirle
 */
function finishGame(io: Server, roomId: string): void {
    const room = rooms.get(roomId);
    if (!room) return;

    room.status = 'finished';
    if (room.roundTimer) clearTimeout(room.roundTimer);

    const players = Array.from(room.players.values());
    const sorted = players.sort((a, b) => b.score - a.score);

    // Birinci ile ikinci arasında fark varsa kazanan var, yoksa beraberlik (eşit puan)
    const winner = (sorted.length >= 2 && sorted[0].score > sorted[1].score)
        ? sorted[0].uid
        : (sorted.length === 1 ? sorted[0].uid : null);

    io.to(roomId).emit('game_over', {
        winner,
        players: sorted.map((p, idx) => ({
            uid: p.uid,
            username: p.username,
            totalScore: p.score,
            rank: idx + 1,
        })),
    });

    // Odayı 30 saniye sonra temizle
    setTimeout(() => {
        if (room) {
            room.players.forEach((_, socketId) => playerRooms.delete(socketId));
            codesToRooms.delete(room.code);
            rooms.delete(roomId);
        }
    }, 30000);
}
