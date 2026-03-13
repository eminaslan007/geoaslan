import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './db/database';
import { generalLimiter, authLimiter } from './middleware/rateLimit';
import authRoutes from './routes/auth';
import mapsRoutes from './routes/maps';
import gameRoutes from './routes/game';
import { setupMultiplayer } from './multiplayer';

// Environment variables yükle
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

// HTTP server + Socket.IO
const httpServer = createServer(app);
const allowedOrigins = [CORS_ORIGIN, 'http://localhost:3000', 'http://localhost:3001'];

// Dinamik origin kontrolü (Vercel .app domainlerine izin ver)
const originDelegate = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) {
        return callback(null, true); // No origin is fine (e.g. from curl)
    }
    if (allowedOrigins.includes(origin)) {
        return callback(null, true);
    }
    if (origin.endsWith('.vercel.app')) {
        return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
};

const io = new Server(httpServer, {
    cors: {
        origin: originDelegate,
        credentials: true,
    },
});

// Middleware'ler
app.use(cors({
    origin: originDelegate,
    credentials: true,
}));
app.use(express.json());
app.use(generalLimiter);

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/maps', mapsRoutes);
app.use('/api/game', gameRoutes);

// Health check
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        message: 'GeoAslan API çalışıyor! 🦁',
        timestamp: new Date().toISOString(),
    });
});

// Multiplayer Socket.IO kurulumu
setupMultiplayer(io);

// Sunucuyu başlat
async function start() {
    try {
        // Veritabanını başlat
        await initDatabase();
        console.log('✅ Veritabanı başlatıldı.');

        httpServer.listen(PORT, () => {
            console.log(`🦁 GeoAslan API sunucusu ${PORT} portunda çalışıyor.`);
            console.log(`⚔️ Multiplayer (Socket.IO) aktif.`);
            console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
            console.log(`🗺️  Haritalar: http://localhost:${PORT}/api/maps`);
        });
    } catch (error) {
        console.error('❌ Sunucu başlatma hatası:', error);
        process.exit(1);
    }
}

start();
