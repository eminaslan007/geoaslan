import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /api/auth/me
 * Firebase token'dan kullanıcı bilgilerini getir
 * Not: Kullanıcı profili artık Firestore'da tutuluyor (frontend tarafında)
 *      Bu endpoint, backend'in kullanıcıyı tanıması için kullanılır
 */
router.get('/me', requireAuth as any, (req: AuthRequest, res: Response) => {
    try {
        // Firebase token'dan gelen bilgiler
        res.json({
            user: {
                uid: req.userId,
                email: req.userEmail,
            },
        });
    } catch (error) {
        console.error('Me hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
});

export default router;
