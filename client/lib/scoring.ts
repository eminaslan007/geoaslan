/**
 * Client-side puan hesaplama (sonuç animasyonu için)
 */

export function haversineDistance(
    lat1: number, lng1: number,
    lat2: number, lng2: number
): number {
    const R = 6371;
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

export function calculateScore(distanceKm: number): number {
    if (distanceKm < 0.15) return 5000;
    const score = 5000 * Math.exp(-distanceKm / 2000);
    return Math.round(Math.max(0, Math.min(5000, score)));
}

export function getMedal(totalScore: number): { name: string; emoji: string; color: string } | null {
    if (totalScore >= 24000) return { name: 'Platin', emoji: '💎', color: '#E5E4E2' };
    if (totalScore >= 20000) return { name: 'Altın', emoji: '🥇', color: '#FFD700' };
    if (totalScore >= 15000) return { name: 'Gümüş', emoji: '🥈', color: '#C0C0C0' };
    if (totalScore >= 10000) return { name: 'Bronz', emoji: '🥉', color: '#CD7F32' };
    return null;
}

export function formatDistance(km: number): string {
    if (km < 1) return `${Math.round(km * 1000)} m`;
    if (km < 100) return `${km.toFixed(1)} km`;
    return `${Math.round(km).toLocaleString('tr-TR')} km`;
}
