import { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UI_TEXTS } from '../../data/uiTexts';
import { shuffle } from '../../data/games';
import GameHeader from '../games/GameHeader';

const LANES = [14, 38, 62, 86];         // posição horizontal (%) dos asteroides
const BASE_FALL_SECONDS = 9;           // tempo para cair no nível 1
const LEVEL_GOAL = (level) => level * 50; // objetivo de pontos de cada nível
const LIVES = 3;

// Blast (como o do Quizlet): a tradução aparece no topo e os asteroides caem com as opções.
// Toque no certo: pontos + bônus de tempo, multiplicados pela sequência de acertos.
// Errar ou deixar o certo cair custa uma vida e zera a sequência. Cada nível tem um objetivo de pontos.
export default function BlastMode({ deck, globalWords, onFinish }) {
  const { updateFlashcardProgress, activeCourse } = useAuth();
  const h = UI_TEXTS[activeCourse];

  const [level, setLevel] = useState(1);
  const [levelPoints, setLevelPoints] = useState(0);
  const [total, setTotal] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [lives, setLives] = useState(LIVES);
  const [wave, setWave] = useState(null);       // { word, options: [{ text, lane, delay }], startedAt, id }
  const [hit, setHit] = useState(null);         // { lane, ok, points }
  const [overlay, setOverlay] = useState({ type: 'start' }); // start | levelDone | gameOver
  const order = useRef(shuffle(deck.words));
  const turn = useRef(0);

  const fallSeconds = Math.max(4, BASE_FALL_SECONDS * Math.pow(0.85, level - 1));

  const translations = useMemo(() => {
    const own = [...new Set(deck.words.map(w => w.term))];
    return own.length >= 4 ? own : [...new Set([...own, ...globalWords.map(w => w.term)])];
  }, [deck, globalWords]);

  const newWave = () => {
    if (turn.current >= order.current.length) {
      order.current = shuffle(deck.words);
      turn.current = 0;
    }
    const word = order.current[turn.current++];
    const wrong = shuffle(translations.filter(t => t !== word.term)).slice(0, 3);
    const lanes = shuffle(LANES);
    const options = shuffle([word.term, ...wrong]).map((text, i) => ({ text, lane: lanes[i], delay: i * 0.25 }));
    setHit(null);
    setWave({ word, options, startedAt: Date.now(), id: Math.random() });
  };

  // Telas de "Nível N / Objetivo" e "Nível concluído" somem sozinhas
  useEffect(() => {
    if (!overlay || overlay.type === 'gameOver') return;
    const timer = setTimeout(() => {
      if (overlay.type === 'start' || overlay.type === 'levelStart') {
        setOverlay(null);
        newWave();
      } else if (overlay.type === 'levelDone') {
        setOverlay({ type: 'levelStart' });
      }
    }, overlay.type === 'levelDone' ? 2000 : 1800);
    return () => clearTimeout(timer);
  }, [overlay]); // eslint-disable-line react-hooks/exhaustive-deps

  const loseLife = () => {
    setMultiplier(1);
    const left = lives - 1;
    setLives(left);
    if (left <= 0) {
      setWave(null);
      setOverlay({ type: 'gameOver' });
      return false;
    }
    return true;
  };

  const tap = (option) => {
    if (!wave || hit) return;
    const ok = option.text === wave.word.term;
    updateFlashcardProgress(wave.word.id, ok ? 2 : 0);
    if (!ok) {
      setHit({ lane: option.lane, ok: false });
      if (loseLife()) setTimeout(newWave, 700);
      return;
    }
    const elapsed = (Date.now() - wave.startedAt) / 1000;
    const timeBonus = Math.max(0, Math.round((1 - elapsed / fallSeconds) * 10));
    const points = Math.round((5 + timeBonus) * multiplier);
    const nextLevelPoints = levelPoints + points;
    setHit({ lane: option.lane, ok: true, points });
    setTotal(t => t + points);
    setMultiplier(m => Math.min(3, Math.round((m + 0.2) * 10) / 10));
    if (nextLevelPoints >= LEVEL_GOAL(level)) {
      setTimeout(() => {
        setWave(null);
        setOverlay({ type: 'levelDone', gained: nextLevelPoints });
        setLevel(level + 1);
        setLevelPoints(0);
      }, 600);
    } else {
      setLevelPoints(nextLevelPoints);
      setTimeout(newWave, 600);
    }
  };

  // O asteroide certo chegou ao fim da tela sem ser atingido. Conta por cronômetro (e não pelo fim
  // da animação) para funcionar mesmo quando o navegador pausa animações.
  const hitRef = useRef(hit);
  hitRef.current = hit;
  useEffect(() => {
    if (!wave || overlay) return;
    const correct = wave.options.find(o => o.text === wave.word.term);
    const timer = setTimeout(() => {
      if (hitRef.current) return;
      setHit({ lane: correct.lane, ok: false });
      if (loseLife()) setTimeout(newWave, 500);
    }, (fallSeconds + correct.delay) * 1000);
    return () => clearTimeout(timer);
  }, [wave, overlay]); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = () => onFinish({ score: total, total, blastScore: total });

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <style>{`
        @keyframes blast-fall { from { top: -22%; } to { top: 100%; } }
        @keyframes blast-shake { 0%,100% { margin-left: 0; } 25% { margin-left: -8px; } 75% { margin-left: 8px; } }
        .asteroid { position: absolute; transform: translate(-50%, -50%); width: 104px; height: 104px; border-radius: 46% 54% 50% 50%; display: grid; place-items: center; text-align: center; padding: 10px; color: #fff; font-weight: 700; font-size: 0.85rem; line-height: 1.15; cursor: pointer; border: none;
          background: radial-gradient(circle at 35% 30%, #6b63d9, #3a2f9c 60%, #241b6b); box-shadow: inset -6px -8px 0 rgba(0,0,0,0.25), 0 0 18px rgba(120,110,255,0.35); animation-name: blast-fall; animation-timing-function: linear; animation-fill-mode: both; transition: transform 0.4s, opacity 0.4s, box-shadow 0.2s; }
        .asteroid.popped { transform: translate(-50%, -50%) scale(1.6); opacity: 0; box-shadow: 0 0 30px #2ed573; }
      `}</style>
      <GameHeader title={`🚀 ${h.modeBlast}`} progress={`${'❤️'.repeat(lives)}${'🤍'.repeat(LIVES - lives)}`} onExit={() => (total > 0 ? finish() : onFinish({ earlyExit: true, studiedCount: 0 }))} exitLabel={h.exit} />

      <div style={{ borderRadius: 24, overflow: 'hidden', border: '1px solid var(--line)', background: 'radial-gradient(circle at 80% 10%, rgba(120,110,255,0.25), transparent 50%), linear-gradient(180deg, #0e0b2e, #161044)' }}>
        <div style={{ background: '#211a8a', color: '#fff', textAlign: 'center', padding: '18px 12px', fontSize: '1.4rem', fontWeight: 800, minHeight: 64 }}>
          {wave && !overlay ? wave.word.translation : ''}
        </div>

        <div style={{ position: 'relative', height: 440, overflow: 'hidden' }}>
          {wave && !overlay && wave.options.map(o => {
            const isHit = hit && hit.lane === o.lane;
            return (
              <button
                key={`${wave.id}-${o.lane}`}
                className={`asteroid${isHit && hit.ok ? ' popped' : ''}`}
                onClick={() => tap(o)}
                style={{
                  left: `${o.lane}%`,
                  animationDuration: `${fallSeconds}s`, animationDelay: `${o.delay}s`,
                  animationPlayState: hit ? 'paused' : 'running',
                  ...(isHit && !hit.ok ? { boxShadow: '0 0 0 4px #ff4757, 0 0 24px #ff4757' } : {}),
                  ...(hit && !hit.ok && o.text === wave.word.term && !isHit ? { boxShadow: '0 0 0 4px #2ed573' } : {})
                }}
              >
                {o.text}
              </button>
            );
          })}
          {hit?.ok && <span style={{ position: 'absolute', left: `${hit.lane}%`, top: '45%', transform: 'translateX(-50%)', color: '#F0C87A', fontWeight: 900, fontSize: '1.6rem', pointerEvents: 'none' }}>+{hit.points}</span>}

          {overlay && (
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center', color: '#fff', padding: 20 }}>
              {overlay.type === 'gameOver' ? (
                <div style={{ display: 'grid', gap: 10, justifyItems: 'center' }}>
                  <span style={{ fontSize: '3rem' }}>💥</span>
                  <strong style={{ fontSize: '2rem', color: '#F0C87A' }}>{h.blastGameOver}</strong>
                  <span style={{ fontSize: '1.2rem' }}>{h.blastTotal(total)}</span>
                  <button onClick={finish} style={{ marginTop: 10, padding: '14px 28px', borderRadius: 999, border: 'none', background: '#F0C87A', color: '#1a1240', fontWeight: 800, cursor: 'pointer' }}>{h.next}</button>
                </div>
              ) : overlay.type === 'levelDone' ? (
                <div style={{ display: 'grid', gap: 6 }}>
                  <strong style={{ fontSize: '2.2rem', color: '#F0C87A' }}>{h.blastLevelDone(level - 1)}</strong>
                  <span style={{ fontSize: '1.2rem' }}>{h.blastTotal(total)}</span>
                  <span style={{ fontSize: '1.2rem', opacity: 0.8 }}>+{overlay.gained}</span>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 6 }}>
                  <strong style={{ fontSize: '2.4rem', color: '#F0C87A' }}>{h.blastLevel(level)}</strong>
                  <span style={{ fontSize: '1.1rem', opacity: 0.85 }}>{h.blastGoal(LEVEL_GOAL(level))}</span>
                  {overlay.type === 'start' && <span style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: 8 }}>{h.blastHint}</span>}
                </div>
              )}
            </div>
          )}
          <span style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%) rotate(-45deg)', fontSize: '2.6rem', pointerEvents: 'none' }}>🚀</span>
        </div>

        {/* Rodapé: nível + barra do objetivo e sequência */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '12px 16px', color: '#fff', background: 'rgba(0,0,0,0.25)' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: '#F0C87A', fontSize: '0.85rem' }}><span>{level}</span><span>{levelPoints}/{LEVEL_GOAL(level)}</span></div>
            <div style={{ height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.15)', overflow: 'hidden', marginTop: 4 }}>
              <div style={{ width: `${Math.min(100, (levelPoints / LEVEL_GOAL(level)) * 100)}%`, height: '100%', background: '#F0C87A', transition: 'width 0.3s' }} />
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontWeight: 800, color: '#c9a7ff', fontSize: '0.85rem' }}>{h.blastStreak} ×{multiplier}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
