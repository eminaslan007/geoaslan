// Haversine formülü ile iki koordinat arasındaki mesafeyi km olarak hesaplar
export function haversineDistance(
    lat1: number, lng1: number,
    lat2: number, lng2: number
): number {
    const R = 6371; // Dünya'nın yarıçapı (km)
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(deg: number): number {
    return deg * (Math.PI / 180);
}

/**
 * Mesafeye göre puan hesaplama (0-5000)
 * 
 * Üstel azalan bir eğri kullanılır:
 * - 0 km (150m içi) = 5000 puan (tam isabet)
 * - 50 km  ≈ 4876 puan
 * - 200 km ≈ 4524 puan
 * - 500 km ≈ 3894 puan
 * - 1000 km ≈ 3033 puan
 * - 2000 km ≈ 1839 puan
 * - 5000 km ≈ 410 puan
 * - 10000 km ≈ 34 puan
 */
export function calculateScore(distanceKm: number): number {
    if (distanceKm < 0.15) return 5000;
    // Üstel azalan fonksiyon: score = 5000 * e^(-d/2000)
    const score = 5000 * Math.exp(-distanceKm / 2000);
    return Math.round(Math.max(0, Math.min(5000, score)));
}

/**
 * Puana göre madalya belirle
 */
export function getMedal(totalScore: number): string | null {
    if (totalScore >= 24000) return 'platinum';
    if (totalScore >= 20000) return 'gold';
    if (totalScore >= 15000) return 'silver';
    if (totalScore >= 10000) return 'bronze';
    return null;
}

/**
 * Madalya Türkçe isimleri
 */
export function getMedalName(medal: string | null): string {
    switch (medal) {
        case 'platinum': return 'Platin 💎';
        case 'gold': return 'Altın 🥇';
        case 'silver': return 'Gümüş 🥈';
        case 'bronze': return 'Bronz 🥉';
        default: return 'Yok';
    }
}
