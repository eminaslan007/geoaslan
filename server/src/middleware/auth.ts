import { Request, Response, NextFunction } from 'express';
import admin from '../firebase-admin';

/**
 * Firebase Auth token'ından alınan kullanıcı bilgisi
 */
export interface AuthRequest extends Request {
    userId?: string;
    userEmail?: string;
}

/**
 * İsteğe bağlı auth — token varsa doğrula, yoksa devam et
 * Giriş yapmamış kullanıcılar da oyun oynayabilir
 */
export async function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = await admin.auth().verifyIdToken(token);
        req.userId = decoded.uid;
        req.userEmail = decoded.email;
    } catch {
        // Token geçersiz — yine devam et (opsiyonel auth)
    }

    next();
}

/**
 * Zorunlu auth — geçerli Firebase token gerektirir
 */
export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Oturum açmanız gerekiyor.' });
        return;
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = await admin.auth().verifyIdToken(token);
        req.userId = decoded.uid;
        req.userEmail = decoded.email;
        next();
    } catch {
        res.status(401).json({ error: 'Geçersiz veya süresi dolmuş oturum.' });
    }
}
