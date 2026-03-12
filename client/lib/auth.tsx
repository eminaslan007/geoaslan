'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    signOut,
    User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

/**
 * Kullanıcı profil tipi
 */
interface User {
    uid: string;
    email: string;
    username: string;
    totalGames: number;
    highestScore: number;
}

interface AuthContextType {
    user: User | null;
    firebaseUser: FirebaseUser | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, username: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Firestore'dan kullanıcı profili al
 */
async function getUserProfile(uid: string): Promise<User | null> {
    try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
            const data = userDoc.data();
            return {
                uid,
                email: data.email || '',
                username: data.username || '',
                totalGames: data.totalGames || 0,
                highestScore: data.highestScore || 0,
            };
        }
        return null;
    } catch {
        return null;
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [loading, setLoading] = useState(true);

    // Firebase Auth oturum dinleyici
    useEffect(() => {
        if (!auth) {
            console.warn('Firebase auth başlatılamadı, lütfen .env ayarlarınızı kontrol edin.');
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
            setFirebaseUser(fbUser);

            if (fbUser) {
                // Firestore'dan profili çek
                const profile = await getUserProfile(fbUser.uid);
                if (profile) {
                    setUser(profile);
                } else {
                    // Profil Firestore'da yoksa basit bilgi göster
                    setUser({
                        uid: fbUser.uid,
                        email: fbUser.email || '',
                        username: fbUser.displayName || '',
                        totalGames: 0,
                        highestScore: 0,
                    });
                }
            } else {
                setUser(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    /**
     * Email/şifre ile giriş yap
     */
    const login = async (email: string, password: string) => {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const profile = await getUserProfile(cred.user.uid);
        if (profile) setUser(profile);
    };

    /**
     * Yeni kullanıcı kaydı
     * 1. Firebase Auth'da hesap oluştur
     * 2. Firestore'a profil yaz
     */
    const register = async (email: string, username: string, password: string) => {
        const cred = await createUserWithEmailAndPassword(auth, email, password);

        // Firebase Auth profilinde displayName kaydet
        await updateProfile(cred.user, { displayName: username });

        // Firestore'a kullanıcı profili yaz
        await setDoc(doc(db, 'users', cred.user.uid), {
            email,
            username,
            totalGames: 0,
            highestScore: 0,
            createdAt: serverTimestamp(),
        });

        setUser({
            uid: cred.user.uid,
            email,
            username,
            totalGames: 0,
            highestScore: 0,
        });
    };

    /**
     * Çıkış yap
     */
    const logout = async () => {
        await signOut(auth);
        setUser(null);
        setFirebaseUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, firebaseUser, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth bir AuthProvider içinde kullanılmalıdır.');
    }
    return context;
}
