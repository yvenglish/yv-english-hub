import { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UI_TEXTS } from '../../data/uiTexts';
import { shuffle } from '../../data/games';
import GameHeader from '../games/GameHeader';

const ASTEROIDS = 4;
const SHIP_ZONE = 120;                                   // faixa de baixo reservada para a nave
const SHIP_Y = 34;                                       // distância do centro do canhão até o fim do campo
const BASE_SPEED = 42;                                   // px/s no nível 1 (devagar, como carrinho de bate-bate)
const WAVE_SECONDS = (level) => Math.max(5, 11 * Math.pow(0.9, level - 1)); // tempo para responder cada palavra
const LEVEL_GOAL = (level) => level * 50;               // objetivo de pontos de cada nível
const LIVES = 3;

const randomVelocity = (speed) => {
  const angle = Math.random() * Math.PI * 2;
  return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
};

// Blast: a tradução aparece no topo e 4 asteroides com opções andam pela tela, batendo nas bordas
// e uns nos outros (quando batem, voltam pela direção de onde vieram). Toque no certo: ele explode,
// renasce em outro lugar e todos recebem as opções da próxima palavra. Errar ou o tempo acabar custa uma vida.
export default function BlastMode({ deck, globalWords, onFinish }) {
  const { updateFlashcardProgress, activeCourse } = useAuth();
  const h = UI_TEXTS[activeCourse];

  const [level, setLevel] = useState(1);
  const [levelPoints, setLevelPoints] = useState(0);
  const [total, setTotal] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [lives, setLives] = useState(LIVES);
  const [wave, setWave] = useState(null);   // { word, startedAt, id }
  const [hit, setHit] = useState(null);     // { bodyId, ok, points, x, y }
  const [overlay, setOverlay] = useState({ type: 'start' }); // start | levelStart | levelDone | gameOver
  const [shot, setShot] = useState(null);   // { x, y, id }
  const [aim, setAim] = useState(0);
  const [, setFrame] = useState(0);         // redesenha a cada quadro da animação

  const fieldRef = useRef(null);
  const size = useRef({ w: 0, h: 0 });
  const bodies = useRef([]);                // { id, x, y, vx, vy, r, text, popping }
  const order = useRef(shuffle(deck.words));
  const turn = useRef(0);
  const hitRef = useRef(null);
  hitRef.current = hit;

  const waveSeconds = WAVE_SECONDS(level);
  const speed = Math.min(110, BASE_SPEED * Math.pow(1.12, level - 1));

  const terms = useMemo(() => {
    const own = [...new Set(deck.words.map(w => w.term))];
    return own.length >= ASTEROIDS ? own : [...new Set([...own, ...globalWords.map(w => w.term)])];
  }, [deck, globalWords]);

  // Tamanho do campo: medido de novo a cada quadro (cobre redimensionar e girar o celular)
  const measure = () => {
    const rect = fieldRef.current?.getBoundingClientRect();
    if (rect && rect.width > 0) size.current = { w: rect.width, h: rect.height };
  };

  const radius = () => Math.max(40, Math.min(54, size.current.w * 0.13));
  const playHeight = () => size.current.h - SHIP_ZONE;

  // Lugar livre para um asteroide nascer (sem encostar nos outros)
  const freeSpot = (r, others) => {
    const { w } = size.current;
    for (let tries = 0; tries < 40; tries++) {
      const x = r + Math.random() * Math.max(1, w - 2 * r);
      const y = r + Math.random() * Math.max(1, playHeight() - 2 * r);
      if (others.every(o => Math.hypot(o.x - x, o.y - y) > o.r + r + 8)) return { x, y };
    }
    return { x: w / 2, y: r };
  };

  const spawnAll = () => {
    measure();
    const r = radius();
    const list = [];
    for (let i = 0; i < ASTEROIDS; i++) {
      const spot = freeSpot(r, list);
      list.push({ id: i, ...spot, ...randomVelocity(speed), r, text: '', popping: false });
    }
    bodies.current = list;
  };

  const newWave = () => {
    if (turn.current >= order.current.length) {
      order.current = shuffle(deck.words);
      turn.current = 0;
    }
    const word = order.current[turn.current++];
    const options = shuffle([word.term, ...shuffle(terms.filter(t => t !== word.term)).slice(0, ASTEROIDS - 1)]);
    if (bodies.current.length !== ASTEROIDS) spawnAll();
    bodies.current.forEach((b, i) => {
      b.text = options[i] || '';
      // Velocidade acompanha o nível
      const current = Math.hypot(b.vx, b.vy) || 1;
      b.vx = (b.vx / current) * speed;
      b.vy = (b.vy / current) * speed;
    });
    setHit(null);
    setShot(null);
    setWave({ word, startedAt: Date.now(), id: Math.random() });
  };

  // Física: anda, bate nas bordas e uns nos outros
  useEffect(() => {
    if (overlay) return;
    let raf;
    let last = performance.now();
    // Avança a física até "now" (chamado pelo laço de animação ou pela reserva)
    const advance = (now) => {
      const dt = Math.min(0.2, (now - last) / 1000); // limite evita saltos depois de pausas longas
      last = now;
      measure();
      const { w } = size.current;
      const bottom = playHeight();
      const list = bodies.current;

      list.forEach(b => {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); }
        if (b.x + b.r > w) { b.x = w - b.r; b.vx = -Math.abs(b.vx); }
        if (b.y - b.r < 0) { b.y = b.r; b.vy = Math.abs(b.vy); }
        if (b.y + b.r > bottom) { b.y = bottom - b.r; b.vy = -Math.abs(b.vy); }
      });

      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i];
          const c = list[j];
          if (a.popping || c.popping) continue;
          const dx = c.x - a.x;
          const dy = c.y - a.y;
          const dist = Math.hypot(dx, dy) || 0.01;
          const overlap = a.r + c.r - dist;
          if (overlap <= 0) continue;
          // Separa os dois para não grudarem
          const nx = dx / dist;
          const ny = dy / dist;
          a.x -= nx * overlap / 2; a.y -= ny * overlap / 2;
          c.x += nx * overlap / 2; c.y += ny * overlap / 2;
          // Só inverte se estavam se aproximando: cada um volta pela direção de onde veio
          const approaching = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny < 0;
          if (approaching) {
            a.vx = -a.vx; a.vy = -a.vy;
            c.vx = -c.vx; c.vy = -c.vy;
          }
        }
      }

      setFrame(f => (f + 1) % 1000000);
    };
    const loop = (now) => {
      advance(now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    // Reserva: se o navegador parar de entregar quadros de animação, a física segue por cronômetro
    const fallback = setInterval(() => {
      if (performance.now() - last > 150) advance(performance.now());
    }, 50);
    return () => { cancelAnimationFrame(raf); clearInterval(fallback); };
  }, [overlay]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Tempo da palavra acabou: mostra a certa e perde uma vida
  useEffect(() => {
    if (!wave || overlay) return;
    const timer = setTimeout(() => {
      if (hitRef.current) return;
      const correct = bodies.current.find(b => b.text === wave.word.term);
      setHit({ bodyId: correct?.id, ok: false, timeout: true });
      if (loseLife()) setTimeout(newWave, 900);
    }, waveSeconds * 1000);
    return () => clearTimeout(timer);
  }, [wave, overlay]); // eslint-disable-line react-hooks/exhaustive-deps

  const tap = (body) => {
    if (!wave || hit || body.popping) return;
    const ok = body.text === wave.word.term;
    updateFlashcardProgress(wave.word.id, ok ? 2 : 0);

    // Mira e tiro: do canhão até o asteroide
    const { w, h: fieldH } = size.current;
    const shipX = w / 2;
    const shipY = fieldH - SHIP_Y;
    setAim(Math.atan2(body.x - shipX, shipY - body.y) * (180 / Math.PI));
    setShot({ x: body.x - shipX, y: body.y - shipY, id: Math.random() });

    if (!ok) {
      setHit({ bodyId: body.id, ok: false });
      if (loseLife()) setTimeout(newWave, 800);
      return;
    }

    const elapsed = (Date.now() - wave.startedAt) / 1000;
    const timeBonus = Math.max(0, Math.round((1 - elapsed / waveSeconds) * 10));
    const points = Math.round((5 + timeBonus) * multiplier);
    const nextLevelPoints = levelPoints + points;
    setHit({ bodyId: body.id, ok: true, points, x: body.x, y: body.y });
    setTotal(t => t + points);
    setMultiplier(m => Math.min(3, Math.round((m + 0.2) * 10) / 10));
    body.popping = true;

    // Explode e renasce em outro lugar com a próxima palavra
    setTimeout(() => {
      const others = bodies.current.filter(b => b.id !== body.id);
      Object.assign(body, freeSpot(body.r, others), randomVelocity(speed), { popping: false });
      if (nextLevelPoints >= LEVEL_GOAL(level)) {
        setWave(null);
        setOverlay({ type: 'levelDone', gained: nextLevelPoints });
        setLevel(level + 1);
        setLevelPoints(0);
      } else {
        setLevelPoints(nextLevelPoints);
        newWave();
      }
    }, 550);
  };

  const finish = () => onFinish({ score: total, total, blastScore: total });
  const streakBlocks = Math.round(((multiplier - 1) / 2) * 10); // ×1 = 0 blocos, ×3 = 10
  const correctId = wave ? bodies.current.find(b => b.text === wave.word.term)?.id : null;

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <style>{`
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
        .asteroid { position: absolute; transform: translate(-50%, -50%); border-radius: 47% 53% 51% 49% / 52% 46% 54% 48%; display: grid; place-items: center; text-align: center; padding: 10px; color: #fff; font-weight: 700; line-height: 1.15; cursor: pointer; border: none; text-shadow: 0 2px 6px rgba(0,0,0,0.5);
          background:
            radial-gradient(circle at 28% 30%, rgba(255,255,255,0.14) 0 9%, transparent 10%),
            radial-gradient(circle at 68% 26%, rgba(0,0,0,0.22) 0 7%, transparent 8%),
            radial-gradient(circle at 72% 64%, rgba(0,0,0,0.25) 0 11%, transparent 12%),
            radial-gradient(circle at 34% 74%, rgba(0,0,0,0.2) 0 8%, transparent 9%),
            radial-gradient(circle at 38% 34%, #7a70f0, #4c3fd1 52%, #2c2392);
          box-shadow: inset -8px -10px 0 rgba(0,0,0,0.22), inset 6px 6px 0 rgba(255,255,255,0.06), 0 0 22px rgba(110,100,255,0.35);
          transition: opacity 0.35s, box-shadow 0.2s; }
        .asteroid:hover { box-shadow: inset -8px -10px 0 rgba(0,0,0,0.22), 0 0 0 3px rgba(255,255,255,0.35), 0 0 26px rgba(140,130,255,0.6); }
        .asteroid.popped { opacity: 0; }
        .asteroid.wrong { box-shadow: 0 0 0 4px #ff6b81, 0 0 28px #ff4757; }
        .asteroid.reveal { box-shadow: 0 0 0 4px #2ed573, 0 0 28px #2ed573; }
      `}</style>
      <GameHeader title={`🚀 ${h.modeBlast}`} progress={`${'❤️'.repeat(lives)}${'🤍'.repeat(LIVES - lives)}`} onExit={() => (total > 0 ? finish() : onFinish({ earlyExit: true, studiedCount: 0 }))} exitLabel={h.exit} />

      <div style={{ borderRadius: 26, overflow: 'hidden', border: '1px solid rgba(140,130,255,0.25)', boxShadow: '0 20px 50px rgba(10,8,40,0.45)' }}>
        {/* Palavra do momento + barra de tempo */}
        <div style={{ background: 'linear-gradient(180deg, #2a22a8, #211a8a)', color: '#fff', textAlign: 'center', padding: '20px 14px', fontSize: '1.5rem', fontWeight: 800, minHeight: 70 }}>
          {wave && !overlay ? wave.word.translation : ''}
        </div>
        <div style={{ height: 5, background: 'rgba(255,255,255,0.12)' }}>
          {wave && !overlay && (
            <div key={wave.id} style={{ height: '100%', background: '#F0E66E', animation: `blast-timer ${waveSeconds}s linear forwards`, animationPlayState: hit ? 'paused' : 'running' }} />
          )}
        </div>

        <div ref={fieldRef} className="blast-field">
          {wave && !overlay && bodies.current.map(b => {
            const classes = ['asteroid'];
            if (b.popping) classes.push('popped');
            if (hit && !hit.ok && hit.bodyId === b.id && !hit.timeout) classes.push('wrong');
            if (hit && !hit.ok && b.id === correctId) classes.push('reveal');
            return (
              <button
                key={b.id}
                className={classes.join(' ')}
                onClick={() => tap(b)}
                style={{ left: b.x, top: b.y, width: b.r * 2, height: b.r * 2, fontSize: b.text.length > 12 ? '0.72rem' : '0.86rem' }}
              >
                {b.text}
              </button>
            );
          })}

          {/* Tiro do canhão até o asteroide */}
          {shot && !overlay && (
            <span key={shot.id} style={{ position: 'absolute', left: '50%', bottom: SHIP_Y, width: 10, height: 26, borderRadius: 99, background: 'linear-gradient(180deg, #ffffff, #9ee7ff)', boxShadow: '0 0 14px #9ee7ff', pointerEvents: 'none', '--tx': `${shot.x}px`, '--ty': `${shot.y + SHIP_Y}px`, animation: 'blast-shot 0.22s ease-out forwards' }} />
          )}

          {/* Explosão em anel com os pontos no meio */}
          {hit?.ok && !overlay && (
            <>
              <span style={{ position: 'absolute', left: hit.x, top: hit.y, width: 130, height: 130, borderRadius: '50%', border: '6px solid #5ee2ff', boxShadow: '0 0 30px #5ee2ff, inset 0 0 20px #5ee2ff', pointerEvents: 'none', animation: 'blast-ring 0.7s ease-out forwards' }} />
              <span style={{ position: 'absolute', left: hit.x, top: hit.y, color: '#F0E66E', fontWeight: 900, fontSize: '1.7rem', pointerEvents: 'none', textShadow: '0 2px 10px rgba(0,0,0,0.6)', animation: 'blast-points 0.9s ease-out forwards' }}>+{hit.points}</span>
            </>
          )}

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
