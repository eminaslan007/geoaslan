import * as admin from 'firebase-admin';

/**
 * Firebase Admin SDK başlatma
 * Backend'de token doğrulama için kullanılır
 */
if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey,
            }),
        });
        console.log('✅ Firebase Admin başlatıldı.');
    } else {
        // Service Account yoksa, varsayılan kimlik bilgileriyle dene
        // (Eğer lokal geliştirmede GOOGLE_APPLICATION_CREDENTIALS ayarlıysa)
        try {
            admin.initializeApp();
            console.log('✅ Firebase Admin (varsayılan kimlik) başlatıldı.');
        } catch {
            console.warn('⚠️ Firebase Admin başlatılamadı. Auth doğrulama çalışmayacak.');
        }
    }
}

export default admin;
