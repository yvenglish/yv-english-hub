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
  const [shot, setShot] = useState(null);       // { x, y, id }: tiro da nave até o asteroide tocado
  const [aim, setAim] = useState(0);            // ângulo do canhão (graus)
  const fieldRef = useRef(null);
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
    setShot(null);
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

  const tap = (option, e) => {
    if (!wave || hit) return;
    // Mira e tiro: do centro da nave até o asteroide tocado
    const field = fieldRef.current?.getBoundingClientRect();
    const target = e?.currentTarget.getBoundingClientRect();
    if (field && target) {
      const x = target.left + target.width / 2 - field.left;
      const y = target.top + target.height / 2 - field.top;
      const shipX = field.width / 2;
      const shipY = field.height - 34;
      setAim(Math.atan2(x - shipX, shipY - y) * (180 / Math.PI));
      setShot({ x: x - shipX, y: y - shipY, id: Math.random() });
    }
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

  const streakBlocks = Math.round(((multiplier - 1) / 2) * 10); // ×1 = 0 blocos, ×3 = 10

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <style>{`
        @keyframes blast-fall { from { top: -14%; } to { top: 104%; } }
        @keyframes blast-shot { from { transform: translate(-50%, -50%) translate(0, 0); opacity: 1; } to { transform: translate(-50%, -50%) translate(var(--tx), var(--ty)); opacity: 0.9; } }
        @keyframes blast-ring { from { transform: translate(-50%, -50%) scale(0.4); opacity: 1; } to { transform: translate(-50%, -50%) scale(1.5); opacity: 0; } }
        @keyframes blast-points { from { transform: translate(-50%, -50%); opacity: 1; } to { transform: translate(-50%, -150%); opacity: 0; } }
        @keyframes blast-timer { from { width: 100%; } to { width: 0%; } }
        @keyframes blast-pop-in { from { transform: scale(0.7); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .blast-field { position: relative; height: min(62vh, 520px); overflow: hidden; touch-action: manipulation;
          background:
            radial-gradient(1.5px 1.5px at 12% 18%, rgba(255,255,255,0.7), transparent),
            radial-gradient(1px 1px at 72% 12%, rgba(255,255,255,0.6), transparent),
            radial-gradient(1.5px 1.5px at 85% 46%, rgba(255,255,255,0.5), transparent),
            radial-gradient(1px 1px at 30% 64%, rgba(255,255,255,0.5), transparent),
            radial-gradient(1px 1px at 55% 30%, rgba(255,255,255,0.4), transparent),
            radial-gradient(1.5px 1.5px at 92% 80%, rgba(255,255,255,0.5), transparent),
            radial-gradient(circle at 80% 8%, rgba(120,110,255,0.22), transparent 45%),
            linear-gradient(180deg, #0b0a24, #120f3a 60%, #17124a); }
        .blast-field::before { content: ''; position: absolute; width: 140%; aspect-ratio: 1; left: -95%; bottom: -95%; border-radius: 50%; border: 2px solid rgba(140,130,255,0.12); box-shadow: 0 0 60px rgba(120,110,255,0.08); pointer-events: none; }
        .asteroid { position: absolute; transform: translate(-50%, -50%); width: 108px; height: 108px; border-radius: 47% 53% 51% 49% / 52% 46% 54% 48%; display: grid; place-items: center; text-align: center; padding: 12px; color: #fff; font-weight: 700; font-size: 0.86rem; line-height: 1.15; cursor: pointer; border: none; text-shadow: 0 2px 6px rgba(0,0,0,0.5);
          background:
            radial-gradient(circle at 28% 30%, rgba(255,255,255,0.14) 0 9%, transparent 10%),
            radial-gradient(circle at 68% 26%, rgba(0,0,0,0.22) 0 7%, transparent 8%),
            radial-gradient(circle at 72% 64%, rgba(0,0,0,0.25) 0 11%, transparent 12%),
            radial-gradient(circle at 34% 74%, rgba(0,0,0,0.2) 0 8%, transparent 9%),
            radial-gradient(circle at 38% 34%, #7a70f0, #4c3fd1 52%, #2c2392);
          box-shadow: inset -8px -10px 0 rgba(0,0,0,0.22), inset 6px 6px 0 rgba(255,255,255,0.06), 0 0 22px rgba(110,100,255,0.35);
          animation-name: blast-fall; animation-timing-function: linear; animation-fill-mode: both; transition: transform 0.35s, opacity 0.35s, box-shadow 0.2s; }
        .asteroid:hover { box-shadow: inset -8px -10px 0 rgba(0,0,0,0.22), 0 0 0 3px rgba(255,255,255,0.35), 0 0 26px rgba(140,130,255,0.6); }
        .asteroid.popped { transform: translate(-50%, -50%) scale(0.2); opacity: 0; }
        .asteroid.wrong { box-shadow: 0 0 0 4px #ff6b81, 0 0 28px #ff4757; }
        .asteroid.reveal { box-shadow: 0 0 0 4px #2ed573, 0 0 28px #2ed573; }
      `}</style>
      <GameHeader title={`🚀 ${h.modeBlast}`} progress={`${'❤️'.repeat(lives)}${'🤍'.repeat(LIVES - lives)}`} onExit={() => (total > 0 ? finish() : onFinish({ earlyExit: true, studiedCount: 0 }))} exitLabel={h.exit} />

      <div style={{ borderRadius: 26, overflow: 'hidden', border: '1px solid rgba(140,130,255,0.25)', boxShadow: '0 20px 50px rgba(10,8,40,0.45)' }}>
        {/* Palavra do momento + barra de tempo da onda */}
        <div style={{ background: 'linear-gradient(180deg, #2a22a8, #211a8a)', color: '#fff', textAlign: 'center', padding: '20px 14px', fontSize: '1.5rem', fontWeight: 800, minHeight: 70, letterSpacing: '0.01em' }}>
          {wave && !overlay ? wave.word.translation : ''}
        </div>
        <div style={{ height: 5, background: 'rgba(255,255,255,0.12)' }}>
          {wave && !overlay && (
            <div key={wave.id} style={{ height: '100%', background: '#F0E66E', animation: `blast-timer ${fallSeconds}s linear forwards`, animationPlayState: hit ? 'paused' : 'running' }} />
          )}
        </div>

        <div ref={fieldRef} className="blast-field">
          {wave && !overlay && wave.options.map(o => {
            const isHit = hit && hit.lane === o.lane;
            const isCorrect = o.text === wave.word.term;
            const classes = ['asteroid'];
            if (isHit && hit.ok) classes.push('popped');
            if (isHit && !hit.ok) classes.push('wrong');
            if (hit && !hit.ok && isCorrect && !isHit) classes.push('reveal');
            return (
              <button
                key={`${wave.id}-${o.lane}`}
                className={classes.join(' ')}
                onClick={(e) => tap(o, e)}
                style={{ left: `${o.lane}%`, animationDuration: `${fallSeconds}s`, animationDelay: `${o.delay}s`, animationPlayState: hit ? 'paused' : 'running' }}
              >
                {o.text}
              </button>
            );
          })}

          {/* Tiro da nave até o asteroide */}
          {shot && !overlay && (
            <span key={shot.id} style={{ position: 'absolute', left: '50%', bottom: 34, width: 10, height: 26, borderRadius: 99, background: 'linear-gradient(180deg, #ffffff, #9ee7ff)', boxShadow: '0 0 14px #9ee7ff', pointerEvents: 'none', '--tx': `${shot.x}px`, '--ty': `${shot.y + 34}px`, animation: 'blast-shot 0.22s ease-out forwards' }} />
          )}

          {/* Explosão em anel com os pontos no meio */}
          {hit?.ok && !overlay && (() => {
            const left = `${hit.lane}%`;
            const top = shot ? `calc(100% - 34px + ${shot.y}px)` : '45%';
            return (
              <>
                <span style={{ position: 'absolute', left, top, width: 130, height: 130, borderRadius: '50%', border: '6px solid #5ee2ff', boxShadow: '0 0 30px #5ee2ff, inset 0 0 20px #5ee2ff', pointerEvents: 'none', animation: 'blast-ring 0.7s ease-out forwards' }} />
                <span style={{ position: 'absolute', left, top, color: '#F0E66E', fontWeight: 900, fontSize: '1.7rem', pointerEvents: 'none', textShadow: '0 2px 10px rgba(0,0,0,0.6)', animation: 'blast-points 0.9s ease-out forwards' }}>+{hit.points}</span>
              </>
            );
          })()}

          {/* Nave-canhão */}
          <div style={{ position: 'absolute', left: '50%', bottom: -28, transform: 'translateX(-50%)', width: 124, height: 124, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', left: '50%', top: '50%', width: 22, height: 58, marginLeft: -11, marginTop: -64, borderRadius: 10, background: 'linear-gradient(90deg, #9aa3b5, #e6ebf2 50%, #9aa3b5)', transformOrigin: '50% 100%', transform: `rotate(${aim}deg)`, transition: 'transform 0.15s' }} />
            <div style={{ position: 'absolute', inset: 12, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #8ff5d0, #3ccf9a 55%, #22a776)', boxShadow: '0 0 0 6px rgba(60,207,154,0.25), 0 0 30px rgba(60,207,154,0.45), inset -8px -10px 0 rgba(0,0,0,0.15)' }} />
            <div style={{ position: 'absolute', inset: 36, borderRadius: '50%', background: '#fff', overflow: 'hidden', boxShadow: '0 0 0 4px rgba(255,255,255,0.35)' }}>
              <img src="/logocircular.jpeg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>

          {/* Telas de nível, nível concluído e fim de jogo */}
          {overlay && (
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center', color: '#fff', padding: 20, background: 'rgba(8,6,30,0.35)' }}>
              <div key={overlay.type + level} style={{ display: 'grid', gap: 8, justifyItems: 'center', animation: 'blast-pop-in 0.35s ease-out' }}>
                {overlay.type === 'gameOver' ? (
                  <>
                    <span style={{ fontSize: '3rem' }}>💥</span>
                    <strong style={{ fontSize: '2.2rem', color: '#F0E66E' }}>{h.blastGameOver}</strong>
                    <span style={{ fontSize: '1.2rem' }}>{h.blastTotal(total)}</span>
                    <button onClick={finish} style={{ marginTop: 12, padding: '14px 30px', borderRadius: 999, border: 'none', background: '#F0E66E', color: '#1a1240', fontWeight: 800, fontSize: '1rem', cursor: 'pointer' }}>{h.next}</button>
                  </>
                ) : overlay.type === 'levelDone' ? (
                  <>
                    <strong style={{ fontSize: '2.3rem', color: '#F0E66E' }}>{h.blastLevelDone(level - 1)}</strong>
                    <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>{h.blastTotal(total)}</span>
                    <span style={{ fontSize: '1.2rem', opacity: 0.85 }}>+{overlay.gained}</span>
                  </>
                ) : (
                  <>
                    <strong style={{ fontSize: '2.6rem', color: '#F0E66E' }}>{h.blastLevel(level)}</strong>
                    <span style={{ fontSize: '1.15rem', opacity: 0.85 }}>{h.blastGoal(LEVEL_GOAL(level))}</span>
                    {overlay.type === 'start' && <span style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: 6 }}>{h.blastHint}</span>}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé: nível + objetivo e a sequência em blocos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'end', gap: 18, padding: '12px 18px 14px', color: '#fff', background: '#0d0b29' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: '#F0E66E', fontSize: '0.9rem' }}><span>{level}</span><span>{levelPoints}/{LEVEL_GOAL(level)}</span></div>
            <div style={{ height: 9, borderRadius: 99, background: 'rgba(255,255,255,0.14)', overflow: 'hidden', marginTop: 5 }}>
              <div style={{ width: `${Math.min(100, (levelPoints / LEVEL_GOAL(level)) * 100)}%`, height: '100%', background: '#F0E66E', borderRadius: 99, transition: 'width 0.3s' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gap: 5, justifyItems: 'end' }}>
            <span style={{ fontWeight: 800, color: '#d6b8ff', fontSize: '0.85rem' }}>{h.blastStreak}{multiplier > 1 ? ` ×${multiplier}` : ''}</span>
            <div style={{ display: 'flex', gap: 3, padding: 3, borderRadius: 99, background: 'rgba(160,110,255,0.25)' }}>
              {Array.from({ length: 10 }).map((_, i) => (
                <span key={i} style={{ width: 11, height: 9, borderRadius: 3, background: i < streakBlocks ? '#f3d4ff' : 'rgba(200,160,255,0.35)', transition: 'background 0.3s' }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
