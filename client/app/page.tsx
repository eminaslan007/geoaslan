'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/lib/auth';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Giriş yapmış kullanıcıları direkt /play'e yönlendir
  useEffect(() => {
    if (!loading && user) {
      router.replace('/play');
    }
  }, [user, loading, router]);

  // Yönlendirme sırasında boş ekran gösterme
  if (loading || user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ fontSize: '48px' }}>🦁</div>
      </div>
    );
  }
  return (
    <>
      <Navbar />
      <main style={{ minHeight: '100vh', paddingTop: '70px' }}>
        {/* Hero Section */}
        <section style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'calc(100vh - 70px)',
          textAlign: 'center',
          padding: '40px 24px',
          background: 'radial-gradient(ellipse at center top, rgba(245, 166, 35, 0.08) 0%, transparent 60%)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Background decorations */}
          <div style={{
            position: 'absolute',
            top: '10%',
            left: '10%',
            width: '300px',
            height: '300px',
            background: 'radial-gradient(circle, rgba(245, 166, 35, 0.05) 0%, transparent 70%)',
            borderRadius: '50%',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute',
            bottom: '20%',
            right: '15%',
            width: '200px',
            height: '200px',
            background: 'radial-gradient(circle, rgba(255, 107, 53, 0.05) 0%, transparent 70%)',
            borderRadius: '50%',
            pointerEvents: 'none',
          }} />

          {/* Logo */}
          <div className="animate-fadeIn" style={{ marginBottom: '24px' }}>
            <span style={{ fontSize: '80px', display: 'block', marginBottom: '16px' }}>🦁</span>
            <h1 style={{ fontSize: '64px', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1.1 }}>
              <span className="gradient-text">GeoAslan</span>
            </h1>
          </div>

          {/* Tagline */}
          <p className="animate-fadeIn" style={{
            fontSize: '20px',
            color: 'var(--text-secondary)',
            maxWidth: '600px',
            lineHeight: 1.7,
            marginBottom: '40px',
            animationDelay: '0.2s',
          }}>
            Dünya&apos;nın dört bir yanından Street View panoramalarını keşfet,
            konumunu harita üzerinde tahmin et ve puanını yükselt!
          </p>

          {/* CTA Buttons */}
          <div className="animate-fadeIn" style={{ display: 'flex', gap: '16px', animationDelay: '0.4s' }}>
            <Link href="/register" className="btn-primary animate-pulse-glow" style={{ padding: '16px 48px', fontSize: '18px', fontWeight: 700 }}>
              🦁 Kayıt Ol
            </Link>
            <Link href="/login" className="btn-secondary" style={{ padding: '16px 48px', fontSize: '18px' }}>
              Giriş Yap
            </Link>
          </div>

          {/* Features preview */}
          <div className="animate-slideUp" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '20px',
            marginTop: '80px',
            maxWidth: '900px',
            width: '100%',
            animationDelay: '0.6s',
          }}>
            {[
              { emoji: '🌍', title: 'Dünya Geneli', desc: '600+ konum ile dünyanın dört bir köşesini keşfet' },
              { emoji: '🎮', title: '3 Oyun Modu', desc: 'Classic, No Move ve NMPZ modlarıyla oyna' },
              { emoji: '🏆', title: 'Madalya Sistemi', desc: 'Bronz\'dan Platin\'e puanlarını yükselt' },
            ].map((feature) => (
              <div key={feature.title} className="glass-card" style={{ padding: '28px', textAlign: 'center' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>{feature.emoji}</div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>{feature.title}</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section style={{
          padding: '80px 24px',
          background: 'var(--bg-secondary)',
          borderTop: '1px solid rgba(255,255,255,0.04)',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '48px' }}>
              Nasıl <span className="gradient-text">Oynanır?</span>
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
              {[
                { step: '1', emoji: '📍', title: 'Konum Gör', desc: 'Rastgele bir Street View konumunda başla' },
                { step: '2', emoji: '🔍', title: 'İncele', desc: 'Etrafına bak, ipuçlarını topla' },
                { step: '3', emoji: '🎯', title: 'Tahmin Et', desc: 'Mini haritada konumunu işaretle' },
                { step: '4', emoji: '⭐', title: 'Puan Al', desc: 'Ne kadar yakınsan o kadar puan!' },
              ].map((item) => (
                <div key={item.step} style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'var(--gradient-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    fontSize: '24px',
                  }}>
                    {item.emoji}
                  </div>
                  <h4 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>{item.title}</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
