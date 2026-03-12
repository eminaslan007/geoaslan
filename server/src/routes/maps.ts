import { Router, Request, Response } from 'express';
import { getMapList, getMapById } from '../data/locations';

const router = Router();

/**
 * GET /api/maps
 * Tüm haritaların listesi (konumlar hariç)
 */
router.get('/', (_req: Request, res: Response) => {
    try {
        const maps = getMapList();
        res.json({ maps });
    } catch (error) {
        console.error('Maps listesi hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
});

/**
 * GET /api/maps/:id
 * Tekil harita detayı (konumlar hariç)
 */
router.get('/:id', (req: Request, res: Response) => {
    try {
        const map = getMapById(req.params.id);
        if (!map) {
            return res.status(404).json({ error: 'Harita bulunamadı.' });
        }
        res.json({ map });
    } catch (error) {
        console.error('Map detay hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
});

export default router;
