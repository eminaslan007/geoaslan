import { auth } from './firebase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Backend API çağrıları için wrapper
 * Firebase Auth token'ını otomatik olarak header'a ekler
 */
async function apiRequest(endpoint: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
    };

    // Firebase'den JWT token al
    const currentUser = auth.currentUser;
    if (currentUser) {
        const token = await currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.error || 'Bir hata oluştu.');
    }

    return data;
}

// Maps API
export const mapsAPI = {
    list: () => apiRequest('/api/maps'),
    get: (id: string) => apiRequest(`/api/maps/${id}`),
};

// Game API
export const gameAPI = {
    start: (mapId: string, mode: string) =>
        apiRequest('/api/game/start', {
            method: 'POST',
            body: JSON.stringify({ mapId, mode }),
        }),

    guess: (gameId: string, guessLat: number, guessLng: number) =>
        apiRequest('/api/game/guess', {
            method: 'POST',
            body: JSON.stringify({ gameId, guessLat, guessLng }),
        }),

    finish: (gameId: string) =>
        apiRequest('/api/game/finish', {
            method: 'POST',
            body: JSON.stringify({ gameId }),
        }),

    get: (id: string) => apiRequest(`/api/game/${id}`),

    history: () => apiRequest('/api/game/user/history'),
};
