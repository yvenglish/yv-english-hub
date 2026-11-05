import { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UI_TEXTS } from '../../data/uiTexts';
import { shuffle, playableItems } from '../../data/games';
import GameHeader from './GameHeader';
import { cardStyle, pillButton, speak } from './gameUi';

const HIT_RADIUS = 9;      // distância máxima (em % da imagem) para contar o clique como certo
const FAST_SECONDS = 5;    // tempo por pergunta na rodada rápida
const FAST_MAX_ROUNDS = 20;

// Jogo de imagem em 3 fases (como o Body Parts):
// 1. Encontre: clique no lugar da palavra · 2. Rotule: leve cada palavra ao número certo
// 3. Rodada rápida: um ponto acende, escolha a palavra; um erro ou o tempo acabar encerra.
export default function ImageGame({ game, onFinish, onExit }) {
  const { activeCourse, activeCourseInfo } = useAuth();
  const h = UI_TEXTS[activeCourse];
  const points = useMemo(() => playableItems(game).map((p, i) => ({ ...p, id: i })), [game]);

  const [phase, setPhase] = useState(1);
  const [score, setScore] = useState(0);

  // Fase 1
  const findOrder = useMemo(() => shuffle(points), [points]);
  const [findIndex, setFindIndex] = useState(0);
  const [flash, setFlash] = useState(null); // { id, ok }

  // Fase 2
  const [chips, setChips] = useState(() => shuffle(points));
  const [selectedChip, setSelectedChip] = useState(null);
  const [placed, setPlaced] = useState([]);
  const [missed, setMissed] = useState([]);
  const [wrongMarker, setWrongMarker] = useState(null);

  // Fase 3
  const [fastPoint, setFastPoint] = useState(null);
  const [fastRound, setFastRound] = useState(0);
  const [timeLeft, setTimeLeft] = useState(FAST_SECONDS);
  const [fastAnswer, setFastAnswer] = useState(null);
  const timerRef = useRef(null);

  const say = (p) => speak(p.word, activeCourseInfo.speechLang, p.audioUrl);
  // Total = 2 pontos por palavra nas fases 1 e 2 + as rodadas rápidas que o aluno jogou
  const finish = (finalScore, fastPlayed) => onFinish(finalScore, points.length * 2 + fastPlayed);

  // ---------- Fase 1: Encontre ----------
  const target = findOrder[findIndex];
  useEffect(() => {
    if (phase === 1 && target) say(target);
  }, [phase, findIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFindClick = (e) => {
    if (phase !== 1 || flash) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const dist = Math.hypot(target.x - x, target.y - y);
    const ok = dist <= HIT_RADIUS;
    if (ok) setScore(s => s + 1);
    setFlash({ id: target.id, ok });
    setTimeout(() => {
      setFlash(null);
      if (findIndex + 1 >= findOrder.length) setPhase(2);
      else setFindIndex(findIndex + 1);
    }, 900);
  };

  // ---------- Fase 2: Rotule ----------
  const handleMarkerClick = (point) => {
    if (phase !== 2 || !selectedChip || placed.includes(point.id)) return;
    if (point.id === selectedChip.id) {
      if (!missed.includes(point.id)) setScore(s => s + 1);
      const nextPlaced = [...placed, point.id];
      setPlaced(nextPlaced);
      setChips(chips.filter(c => c.id !== point.id));
      setSelectedChip(null);
      say(point);
      if (nextPlaced.length === points.length) setTimeout(() => startFast(), 800);
    } else {
      setMissed(m => (m.includes(selectedChip.id) ? m : [...m, selectedChip.id]));
      setWrongMarker(point.id);
      setTimeout(() => setWrongMarker(null), 600);
    }
  };

  // ---------- Fase 3: Rodada rápida ----------
  const fastOptions = useMemo(() => {
    if (!fastPoint) return [];
    const others = shuffle(points.filter(p => p.id !== fastPoint.id)).slice(0, 3);
    return shuffle([fastPoint, ...others]);
  }, [fastPoint, points]);

  const pickFastPoint = (prev) => {
    const pool = points.length > 1 ? points.filter(p => p.id !== prev?.id) : points;
    return pool[Math.floor(Math.random() * pool.length)];
  };

  const startFast = () => {
    setPhase(3);
    setFastRound(0);
    setFastPoint(pickFastPoint(null));
  };

  useEffect(() => {
    if (phase !== 3 || !fastPoint || fastAnswer) return;
    setTimeLeft(FAST_SECONDS);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setFastAnswer({ id: null, ok: false, timeout: true });
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, fastPoint, fastAnswer]);

  // Erro ou tempo esgotado encerra o jogo
  useEffect(() => {
    if (fastAnswer && !fastAnswer.ok) {
      const timer = setTimeout(() => finish(score, fastRound + 1), 1500);
      return () => clearTimeout(timer);
    }
  }, [fastAnswer]); // eslint-disable-line react-hooks/exhaustive-deps

  const chooseFast = (option) => {
    if (fastAnswer) return;
    clearInterval(timerRef.current);
    const ok = option.id === fastPoint.id;
    setFastAnswer({ id: option.id, ok });
    if (!ok) return;
    const nextScore = score + 1;
    setScore(nextScore);
    setTimeout(() => {
      if (fastRound + 1 >= FAST_MAX_ROUNDS) {
        finish(nextScore, FAST_MAX_ROUNDS);
        return;
      }
      setFastRound(fastRound + 1);
      setFastAnswer(null);
      setFastPoint(pickFastPoint(fastPoint));
    }, 600);
  };

  // ---------- Tela ----------
  const titles = { 1: h.imFind, 2: h.imLabel, 3: h.imFast };
  const instructions = { 1: h.imFindInstr, 2: h.imLabelInstr, 3: h.imFastInstr };

  const markerStyle = (p) => {
    let bg = 'var(--plum)';
    if (phase === 1) {
      // Na fase 1 os pontos ficam escondidos; só aparece o certo depois do clique
      if (!flash || p.id !== flash.id) return { display: 'none' };
      bg = flash.ok ? '#2ed573' : '#ff4757';
    }
    if (phase === 2 && placed.includes(p.id)) bg = '#2ed573';
    if (phase === 2 && wrongMarker === p.id) bg = '#ff4757';
    if (phase === 3) {
      if (p.id !== fastPoint?.id) return { display: 'none' };
      bg = 'var(--amber)';
    }
    return {
      position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%)',
      minWidth: 30, height: 30, padding: '0 6px', borderRadius: 99, background: bg, color: '#fff',
      border: '2px solid #fff', fontWeight: 800, fontSize: '0.8rem', display: 'grid', placeItems: 'center',
      cursor: phase === 2 ? 'pointer' : 'default', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', whiteSpace: 'nowrap',
      animation: phase === 3 ? 'pulse-dot 1s infinite' : 'none'
    };
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <style>{'@keyframes pulse-dot { 0%,100% { transform: translate(-50%,-50%) scale(1); } 50% { transform: translate(-50%,-50%) scale(1.25); } }'}</style>
      <GameHeader title={game.title} progress={h.imPhase(phase)} onExit={onExit} exitLabel={h.exit} />

      <div style={{ ...cardStyle, padding: 20, display: 'grid', gap: 15 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <strong style={{ fontSize: '1.2rem' }}>{titles[phase]}</strong>
            {phase === 1 && target && (
              <button onClick={() => say(target)} style={{ marginLeft: 10, ...pillButton(true), padding: '6px 14px' }}>🔊 {target.word}</button>
            )}
            <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '0.9rem' }}>{instructions[phase]}</p>
          </div>
          {phase === 3 && (
            <span style={{ fontWeight: 800, fontSize: '1.2rem', color: timeLeft <= 2 ? '#ff4757' : 'var(--amber)' }}>⏱ {timeLeft}s · ✓ {fastRound + (fastAnswer?.ok ? 1 : 0)}</span>
          )}
        </div>

        <div onClick={handleFindClick} style={{ position: 'relative', userSelect: 'none', cursor: phase === 1 ? 'crosshair' : 'default' }}>
          <img src={game.imageUrl} alt={game.title} draggable={false} style={{ width: '100%', display: 'block', borderRadius: 16 }} />
          {points.map(p => (
            <span key={p.id} style={markerStyle(p)} onClick={(e) => { e.stopPropagation(); handleMarkerClick(p); }}>
              {phase === 2 ? (placed.includes(p.id) ? p.word : p.id + 1) : phase === 1 ? p.word : '?'}
            </span>
          ))}
        </div>

        {phase === 2 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {chips.map(c => (
              <button key={c.id} onClick={() => setSelectedChip(c)} style={{ ...pillButton(selectedChip?.id === c.id), borderColor: missed.includes(c.id) ? '#ff4757' : undefined }}>{c.word}</button>
            ))}
          </div>
        )}

        {phase === 3 && fastPoint && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
              {fastOptions.map(o => {
                const isRight = fastAnswer && o.id === fastPoint.id;
                const isWrongPick = fastAnswer && fastAnswer.id === o.id && !fastAnswer.ok;
                return (
                  <button key={o.id} onClick={() => chooseFast(o)} style={{ ...pillButton(false), background: isRight ? '#2ed573' : isWrongPick ? '#ff4757' : 'var(--paper)', color: isRight || isWrongPick ? '#fff' : 'var(--text)' }}>{o.word}</button>
                );
              })}
            </div>
            {fastAnswer?.timeout && <p style={{ margin: 0, color: '#ff4757', fontWeight: 800 }}>{h.imTimeUp}</p>}
          </>
        )}
      </div>
    </div>
  );
}
