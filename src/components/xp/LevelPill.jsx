import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UI_TEXTS } from '../../data/uiTexts';
import { XP_VALUES, levelProgress } from '../../data/xp';
import { FEATURES } from '../../data/features';

// Ordem em que as fontes de XP aparecem na explicação
const SOURCES = ['daily', 'review_round', 'week_task', 'library_episode', 'voice_lab', 'extra_content', 'study', 'game', 'record', 'streak_goal']
  .filter(s => s !== 'voice_lab' || FEATURES.voiceLab);

// Selo de nível no menu (estrela + nível + barra até o próximo). Ao clicar, explica como ganhar XP.
export default function LevelPill() {
  const { userData, activeCourse } = useAuth();
  const h = UI_TEXTS[activeCourse];
  const [open, setOpen] = useState(false);
  const p = levelProgress(userData?.xp || 0);

  return (
    <>
      <div onClick={() => setOpen(true)} title={h.xpToNext(p.toNext, p.level + 1)} className="hover-scale streak-pill-container level-pill" style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.05)', padding: '6px 16px 6px 6px', borderRadius: 99, border: '1px solid rgba(240, 200, 122, 0.3)', cursor: 'pointer', transition: '0.2s' }}>
        <div className="streak-pill-svg-wrap" style={{ position: 'relative', width: 40, height: 40, display: 'grid', placeItems: 'center', borderRadius: '50%', background: 'linear-gradient(135deg, #F0C87A, #F09A4A)' }}>
          <span style={{ color: '#2a1220', fontWeight: 900, fontSize: '1rem' }}>{p.level}</span>
        </div>
        <div className="streak-pill-text level-pill-text" style={{ display: 'flex', flexDirection: 'column', minWidth: 56 }}>
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontWeight: 800 }}>{h.xpLevelShort}</span>
          <span style={{ display: 'block', height: 6, marginTop: 5, borderRadius: 99, background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
            <span style={{ display: 'block', width: `${p.pct}%`, height: '100%', background: 'linear-gradient(90deg, #F0C87A, #F09A4A)', borderRadius: 99 }} />
          </span>
        </div>
      </div>

      {open && (
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(20, 10, 20, 0.85)', backdropFilter: 'blur(12px)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--paper)', width: '100%', maxWidth: 400, maxHeight: '90vh', overflowY: 'auto', borderRadius: 28, position: 'relative', border: '1px solid #F0C87A', textAlign: 'center', padding: '36px 26px 26px' }}>
            <button onClick={() => setOpen(false)} aria-label="Fechar" style={{ position: 'absolute', top: 15, right: 15, background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            <div style={{ width: 76, height: 76, margin: '0 auto 12px', borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, #F0C87A, #F09A4A)', boxShadow: '0 10px 30px rgba(240,154,74,0.35)' }}>
              <span style={{ color: '#2a1220', fontWeight: 900, fontSize: '2rem' }}>{p.level}</span>
            </div>
            <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.9rem', color: 'var(--amber)', margin: '0 0 4px' }}>{h.xpLevel(p.level)}</h2>
            <p style={{ color: 'var(--muted)', margin: '0 0 16px' }}>{h.xpTotal(userData?.xp || 0)}</p>
            <div style={{ height: 10, borderRadius: 99, background: 'var(--line)', overflow: 'hidden', marginBottom: 6 }}>
              <div style={{ width: `${p.pct}%`, height: '100%', background: 'linear-gradient(90deg, #F0C87A, #F09A4A)', borderRadius: 99 }} />
            </div>
            <p style={{ color: 'var(--text)', fontSize: '0.9rem', fontWeight: 700, margin: '0 0 22px' }}>{h.xpToNext(p.toNext, p.level + 1)}</p>

            <h3 style={{ textAlign: 'left', color: 'var(--text)', fontSize: '1rem', margin: '0 0 10px' }}>{h.xpHowTitle}</h3>
            <div style={{ display: 'grid', gap: 6, textAlign: 'left' }}>
              {SOURCES.map(s => (
                <div key={s} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 12px', borderRadius: 12, background: 'var(--bg)', border: '1px solid var(--line)' }}>
                  <span style={{ color: 'var(--text)', fontSize: '0.9rem' }}>{h.xpSources[s]}</span>
                  <strong style={{ color: 'var(--amber)', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>+{XP_VALUES[s]} XP</strong>
                </div>
              ))}
            </div>
            <p style={{ color: 'var(--muted)', fontSize: '0.8rem', margin: '12px 0 0', textAlign: 'left' }}>{h.xpCapNote}</p>
          </div>
        </div>
      )}
    </>
  );
}
