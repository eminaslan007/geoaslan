'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/lib/auth';

export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await register(email, username, password);
            router.push('/play');
        } catch (err: any) {
            // Firebase hata mesajlarını Türkçe'ye çevir
            const code = err?.code || '';
            if (code === 'auth/email-already-in-use') {
                setError('Bu email adresi zaten kullanılıyor.');
            } else if (code === 'auth/weak-password') {
                setError('Şifre en az 6 karakter olmalıdır.');
            } else if (code === 'auth/invalid-email') {
                setError('Geçerli bir email adresi giriniz.');
            } else {
                setError(err.message || 'Kayıt yapılamadı.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Navbar />
            <main style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                background: 'radial-gradient(ellipse at center, rgba(245, 166, 35, 0.05) 0%, transparent 60%)',
            }}>
                <div className="glass-card animate-fadeIn" style={{ padding: '48px', maxWidth: '440px', width: '100%' }}>
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <span style={{ fontSize: '48px' }}>🦁</span>
                        <h1 style={{ fontSize: '28px', fontWeight: 800, marginTop: '12px' }}>
                            <span className="gradient-text">Kayıt Ol</span>
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '8px' }}>
                            GeoAslan ailesine katıl ve dünyayı keşfet
                        </p>
                    </div>

                    {error && (
                        <div style={{
                            padding: '12px 16px',
                            background: 'rgba(244, 67, 54, 0.1)',
                            border: '1px solid rgba(244, 67, 54, 0.3)',
                            borderRadius: '8px',
                            color: '#F44336',
                            fontSize: '14px',
                            marginBottom: '20px',
                        }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 500 }}>Email</label>
                            <input
                                type="email"
                                className="input-field"
                                placeholder="ornek@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 500 }}>Kullanıcı Adı</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="kullanici_adi"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                minLength={3}
                            />
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 500 }}>Şifre</label>
                            <input
                                type="password"
                                className="input-field"
                                placeholder="En az 6 karakter"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading}
                            style={{ width: '100%', padding: '14px', fontSize: '16px', opacity: loading ? 0.7 : 1 }}
                        >
                            {loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
                        </button>
                    </form>

                    <p style={{ textAlign: 'center', marginTop: '24px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                        Zaten hesabın var mı?{' '}
                        <Link href="/login" style={{ color: 'var(--accent-gold)', textDecoration: 'none', fontWeight: 600 }}>
                            Giriş Yap
                        </Link>
                    </p>
                </div>
            </main>
        </>
    );
}
