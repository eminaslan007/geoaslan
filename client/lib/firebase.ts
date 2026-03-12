import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

/**
 * Firebase yapılandırması
 * .env.local dosyasından oku
 */
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

// Build sırasında (SSR/SSG) Firebase başlatmayı atla - API key yoksa boş config
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (typeof window !== 'undefined' && firebaseConfig.apiKey) {
    // Client-side: Firebase'i başlat
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
} else if (getApps().length > 0) {
    // Zaten başlatılmış — tekrar kullan
    app = getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
} else {
    // SSR/build sırasında: boş placeholder oluştur
    // Bu sadece build sürecinde kullanılır, gerçek çağrılar client'ta olur
    app = null as any;
    auth = null as any;
    db = null as any;
}

export { auth, db };
export default app;
