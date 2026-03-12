'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';

export default function Navbar() {
    const { user, logout } = useAuth();

    return (
        <nav style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            padding: '12px 24px',
            background: 'rgba(10, 10, 15, 0.8)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(245, 166, 35, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
        }}>
            <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '28px' }}>🦁</span>
                <span className="gradient-text" style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px' }}>
                    GeoAslan
                </span>
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {user ? (
                    <>
                        <Link href="/play" className="btn-secondary" style={{ padding: '8px 20px', fontSize: '14px' }}>
                            🗺️ Oyna
                        </Link>
                        <Link href="/multiplayer" className="btn-secondary" style={{ padding: '8px 20px', fontSize: '14px', border: '1px solid rgba(244, 67, 54, 0.3)' }}>
                            ⚔️ 1v1
                        </Link>
                        <Link href="/profile" className="btn-secondary" style={{ padding: '8px 20px', fontSize: '14px' }}>
                            👤 {user.username || user.email?.split('@')[0] || 'Profil'}
                        </Link>
                        <button
                            onClick={logout}
                            className="btn-secondary"
                            style={{ padding: '8px 20px', fontSize: '14px' }}
                        >
                            Çıkış
                        </button>
                    </>
                ) : (
                    <>
                        <Link href="/login" className="btn-secondary" style={{ padding: '8px 20px', fontSize: '14px' }}>
                            Giriş Yap
                        </Link>
                        <Link href="/register" className="btn-primary" style={{ padding: '8px 20px', fontSize: '14px' }}>
                            Kayıt Ol
                        </Link>
                    </>
                )}
            </div>
        </nav>
    );
}
