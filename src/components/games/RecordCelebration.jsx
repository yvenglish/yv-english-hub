import { useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UI_TEXTS } from '../../data/uiTexts';

const COLORS = ['#F0E66E', '#F09A4A', '#D96745', '#8B5A9E', '#2ed573', '#5ee2ff', '#ffffff'];
const DURATION_MS = 4500;

// Chuva de confete em tela cheia (canvas). Para sozinha depois de alguns segundos.
export function Confetti() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    // Metade cai do topo, metade explode do centro
    const pieces = Array.from({ length: 180 }, (_, i) => {
      const burst = i % 2 === 0;
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 8;
      return {
        x: burst ? canvas.width / 2 : Math.random() * canvas.width,
        y: burst ? canvas.height / 2.6 : -20 - Math.random() * canvas.height * 0.5,
        vx: burst ? Math.cos(angle) * speed : (Math.random() - 0.5) * 2,
        vy: burst ? Math.sin(angle) * speed - 4 : 2 + Math.random() * 3,
        w: 6 + Math.random() * 6, h: 8 + Math.random() * 10,
        rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
        color: COLORS[i % COLORS.length]
      };
    });

    const start = performance.now();
    let last = start;
    let raf;
    const draw = (now) => {
      const dt = Math.min(3, (now - last) / 16.7);
      last = now;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const fade = Math.max(0, 1 - Math.max(0, now - start - (DURATION_MS - 1200)) / 1200);
      pieces.forEach(p => {
        p.vy += 0.15 * dt;
        p.vx *= 0.99;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot)));
        ctx.restore();
      });
    };
    const loop = (now) => {
      draw(now);
      if (now - start < DURATION_MS) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 2600 }} />;
}

// Tela de "Novo recorde!": fundo dourado, troféu pulando, confete e o quanto o aluno superou o recorde anterior.
export default function RecordCelebration({ score, previous, primaryLabel, onPrimary, secondaryLabel, onSecondary }) {
  const { activeCourse } = useAuth();
  const h = UI_TEXTS[activeCourse];

  return (
    <div data-result-modal style={{ position: 'fixed', inset: 0, zIndex: 2500, display: 'grid', placeItems: 'center', padding: 20, background: 'radial-gradient(circle at 50% 35%, rgba(255,214,90,0.55), rgba(217,103,69,0.35) 35%, rgba(20,10,30,0.92) 75%)', backdropFilter: 'blur(6px)' }}>
      <style>{`
        @keyframes record-trophy { 0%, 100% { transform: translateY(0) rotate(-6deg) scale(1); } 50% { transform: translateY(-14px) rotate(6deg) scale(1.08); } }
        @keyframes record-in { from { transform: scale(0.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes record-shine { from { background-position: -200% 0; } to { background-position: 200% 0; } }
        @keyframes record-rays { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
      `}</style>
      <Confetti />
      <div style={{ position: 'relative', width: '100%', maxWidth: 440, textAlign: 'center', padding: '44px 32px 32px', borderRadius: 32, background: 'linear-gradient(160deg, #3a2410, #2a1220 60%, #1c0f24)', border: '2px solid #F0C87A', boxShadow: '0 0 0 6px rgba(240,200,122,0.15), 0 30px 80px rgba(0,0,0,0.5), 0 0 60px rgba(240,200,122,0.35)', overflow: 'hidden', animation: 'record-in 0.45s cubic-bezier(.2,1.4,.4,1)' }}>
        {/* Raios girando atrás do troféu */}
        <div style={{ position: 'absolute', left: '50%', top: 110, width: 420, height: 420, background: 'repeating-conic-gradient(rgba(240,200,122,0.16) 0deg 12deg, transparent 12deg 24deg)', borderRadius: '50%', animation: 'record-rays 14s linear infinite', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <span style={{ fontSize: '5.5rem', display: 'block', lineHeight: 1, animation: 'record-trophy 1.2s ease-in-out infinite', filter: 'drop-shadow(0 8px 20px rgba(240,200,122,0.6))' }}>🏆</span>
          <h2 style={{ margin: '18px 0 6px', fontFamily: '"Playfair Display", serif', fontSize: '2.4rem', lineHeight: 1.05, background: 'linear-gradient(90deg, #F0C87A, #fff6c8, #F09A4A, #F0C87A)', backgroundSize: '200% 100%', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', animation: 'record-shine 2.5s linear infinite' }}>{h.recordTitle}</h2>
          <p style={{ margin: '0 0 18px', color: 'rgba(255,255,255,0.8)' }}>{h.recordSubtitle}</p>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14, marginBottom: 26 }}>
            <span style={{ display: 'grid', padding: '10px 16px', borderRadius: 16, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.65)' }}>
              <small style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h.recordBefore}</small>
              <strong style={{ fontSize: '1.4rem', textDecoration: 'line-through' }}>{previous}</strong>
            </span>
            <span style={{ fontSize: '1.4rem', color: '#F0C87A' }}>→</span>
            <span style={{ display: 'grid', padding: '10px 20px', borderRadius: 16, background: 'linear-gradient(135deg, #F0C87A, #F09A4A)', color: '#2a1220', boxShadow: '0 8px 24px rgba(240,154,74,0.45)' }}>
              <small style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>{h.recordNow}</small>
              <strong style={{ fontSize: '2rem' }}>{score}</strong>
            </span>
          </div>
          <p style={{ margin: '0 0 22px', color: '#2ed573', fontWeight: 800 }}>{h.recordGain(score - previous)}</p>
          <div style={{ display: 'grid', gap: 10 }}>
            <button onClick={onPrimary} style={{ padding: 16, borderRadius: 999, border: 'none', background: '#F0C87A', color: '#2a1220', fontWeight: 900, fontSize: '1.05rem', cursor: 'pointer' }}>{primaryLabel}</button>
            {onSecondary && <button onClick={onSecondary} style={{ padding: 14, borderRadius: 999, border: '1px solid rgba(240,200,122,0.4)', background: 'transparent', color: '#F0C87A', fontWeight: 800, cursor: 'pointer' }}>{secondaryLabel}</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
