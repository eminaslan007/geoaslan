import rateLimit from 'express-rate-limit';

/**
 * Genel API rate limiter
 * Dakikada 100 istek limiti
 */
export const generalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 dakika
    max: 100,
    message: { error: 'Çok fazla istek gönderdiniz. Lütfen bir dakika bekleyin.' },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Auth endpoint'leri için daha sıkı rate limiter
 * Dakikada 10 istek
 */
export const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { error: 'Çok fazla giriş denemesi. Lütfen bir dakika bekleyin.' },
    standardHeaders: true,
    legacyHeaders: false,
});
