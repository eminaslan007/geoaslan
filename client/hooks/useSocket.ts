'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Singleton Socket — sayfa değişse bile aynı bağlantı korunur
 */
let sharedSocket: Socket | null = null;

function getOrCreateSocket(): Socket {
    if (!sharedSocket || sharedSocket.disconnected) {
        sharedSocket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
        });
    }
    return sharedSocket;
}

/** Global socket'e doğrudan erişim — listener kurulurken kullan */
export function getSocket(): Socket {
    return getOrCreateSocket();
}

/**
 * Socket.IO bağlantı hook'u
 * Tüm sayfalarda aynı socket kullanılır
 */
export function useSocket() {
    const socketRef = useRef<Socket | null>(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        const s = getOrCreateSocket();
        socketRef.current = s;
        setConnected(s.connected);

        const onConnect = () => {
            console.log('🔌 Socket bağlandı:', s.id);
            setConnected(true);
        };
        const onDisconnect = () => {
            console.log('🔌 Socket koptu');
            setConnected(false);
        };

        s.on('connect', onConnect);
        s.on('disconnect', onDisconnect);

        if (s.connected) setConnected(true);

        return () => {
            s.off('connect', onConnect);
            s.off('disconnect', onDisconnect);
            // Socket'i kapatma — singleton olarak kalsın
        };
    }, []);

    const emit = useCallback((event: string, data?: any) => {
        socketRef.current?.emit(event, data);
    }, []);

    // Doğrudan socket ref'i döndür — böylece listener'lar kararlı kalır
    return { socket: socketRef.current, socketRef, connected, emit };
}
