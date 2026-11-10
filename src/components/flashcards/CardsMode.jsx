import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UI_TEXTS } from '../../data/uiTexts';
import GameHeader from '../games/GameHeader';
import { speak } from '../games/gameUi';

const SWIPE_DISTANCE = 110; // px arrastados para contar como resposta

// Cartões com duas respostas: "I know" (direita) e "I don't know" (esquerda).
// No celular dá para arrastar como no Tinder; no computador, botões ou setas ← →.
// "I don't know" conta como erro na revisão espaçada e o cartão volta para o fim da fila.
export default function CardsMode({ deck, onFinish }) {
  const { updateFlashcardProgress, activeCourse, activeCourseInfo } = useAuth();
  const h = UI_TEXTS[activeCourse];

  const [queue, setQueue] = useState(deck.words);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [drag, setDrag] = useState(0);
  const [leaving, setLeaving] = useState(null); // 'left' | 'right' enquanto o cartão sai da tela
  const [known, setKnown] = useState(0);
  const start = useRef(null);
  const moved = useRef(false);

  const card = queue[index];

  // Virar o cartão já fala a palavra
  const flip = useCallback(() => {
    setFlipped(f => !f);
    if (card) speak(card.term, activeCourseInfo.speechLang);
  }, [card, activeCourseInfo]);

  const answer = useCallback((knows) => {
    if (!card || leaving) return;
    setLeaving(knows ? 'right' : 'left');
    updateFlashcardProgress(card.id, knows ? 2 : 0);
    const nextQueue = !knows && !card.isRetry ? [...queue, { ...card, isRetry: true }] : queue;
    const nextKnown = known + (knows && !card.isRetry ? 1 : 0);
    setTimeout(() => {
      setQueue(nextQueue);
      setKnown(nextKnown);
      setLeaving(null);
      setDrag(0);
      setFlipped(false);
      if (index + 1 >= nextQueue.length) {
        onFinish({ score: nextKnown, total: deck.words.length, studiedCount: deck.words.length });
      } else {
        setIndex(index + 1);
      }
    }, 250);
  }, [card, leaving, queue, known, index, deck, onFinish, updateFlashcardProgress]);

  // Teclado: espaço vira, → sei, ← não sei
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') answer(true);
      else if (e.key === 'ArrowLeft') answer(false);
      else if (e.key === ' ') { e.preventDefault(); flip(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answer, flip]);

  const onPointerDown = (e) => {
    start.current = e.clientX;
    moved.current = false;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (start.current === null) return;
    const dx = e.clientX - start.current;
    if (Math.abs(dx) > 5) moved.current = true;
    setDrag(dx);
  };
  const onPointerUp = () => {
    if (start.current === null) return;
    start.current = null;
    if (drag > SWIPE_DISTANCE) answer(true);
    else if (drag < -SWIPE_DISTANCE) answer(false);
    else {
      if (!moved.current) flip(); // toque sem arrastar vira o cartão
      setDrag(0);
    }
  };

  if (!card) return null;

  const offset = leaving === 'right' ? 600 : leaving === 'left' ? -600 : drag;
  const tint = offset > 30 ? `rgba(46,213,115,${Math.min(0.35, offset / 400)})` : offset < -30 ? `rgba(255,71,87,${Math.min(0.35, -offset / 400)})` : 'transparent';

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <GameHeader title={`🃏 ${h.modeCards}`} progress={`${Math.min(index + 1, queue.length)} / ${queue.length}`} onExit={() => onFinish({ earlyExit: true, studiedCount: index })} exitLabel={h.exit} />

      <div style={{ position: 'relative', height: 'calc(100dvh - 290px)', minHeight: 360, maxHeight: 680, touchAction: 'none', overscrollBehavior: 'contain' }}>
        {/* Próximo cartão aparecendo por trás */}
        {queue[index + 1] && (
          <div style={{ position: 'absolute', inset: '12px 12px 0', borderRadius: 26, background: 'var(--paper)', border: '1px solid var(--line)', opacity: 0.5 }} />
        )}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            position: 'absolute', inset: 0, borderRadius: 26, border: '1px solid var(--line)', cursor: 'grab', userSelect: 'none', touchAction: 'none', transformOrigin: '50% 100%',
            background: flipped ? 'linear-gradient(135deg, var(--plum), var(--plum-mid))' : 'var(--paper)', color: flipped ? '#fff' : 'var(--text)',
            transform: `translateX(${offset}px) rotate(${offset / 30}deg)`, transition: start.current === null ? 'transform 0.25s, background 0.3s' : 'none',
            display: 'grid', placeItems: 'center', padding: 30, boxShadow: '0 16px 40px rgba(0,0,0,0.18)', overflow: 'hidden'
          }}
        >
          <div style={{ position: 'absolute', inset: 0, background: tint, pointerEvents: 'none' }} />
          <button
            type="button"
            aria-label="🔊"
            onPointerDown={e => e.stopPropagation()}
            onPointerUp={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); speak(card.term, activeCourseInfo.speechLang); }}
            style={{ position: 'absolute', top: 16, right: 16, width: 46, height: 46, borderRadius: '50%', border: `1px solid ${flipped ? 'rgba(255,255,255,0.35)' : 'var(--line)'}`, background: flipped ? 'rgba(255,255,255,0.15)' : 'var(--cream)', cursor: 'pointer', fontSize: '1.2rem', zIndex: 2 }}
          >🔊</button>
          {offset > 30 && <span style={{ position: 'absolute', top: 20, left: 20, color: '#2ed573', fontWeight: 900, border: '3px solid #2ed573', borderRadius: 10, padding: '4px 10px', transform: 'rotate(-12deg)' }}>{h.iKnow}</span>}
          {offset < -30 && <span style={{ position: 'absolute', top: 76, right: 20, color: '#ff4757', fontWeight: 900, border: '3px solid #ff4757', borderRadius: 10, padding: '4px 10px', transform: 'rotate(12deg)' }}>{h.iDontKnow}</span>}
          <div style={{ display: 'grid', gap: 12, justifyItems: 'center', textAlign: 'center', pointerEvents: 'none' }}>
            {card.imageUrl && !flipped && <img src={card.imageUrl} alt="" style={{ maxHeight: 180, maxWidth: '100%', borderRadius: 14 }} draggable={false} />}
            <span style={{ fontSize: 'clamp(2rem, 7vw, 2.8rem)', fontWeight: 700, fontFamily: '"Playfair Display", serif' }}>{flipped ? card.translation : card.term}</span>
            {flipped && card.sentences?.[0]?.english && <span style={{ fontSize: '0.95rem', opacity: 0.85 }}>“{card.sentences[0].english}”</span>}
            <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>{h.tapToFlip}</span>
          </div>
        </div>
      </div>

      <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.8rem', margin: '12px 0' }}>{h.swipeHint}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <button onClick={() => answer(false)} style={{ padding: 18, borderRadius: 18, border: '2px solid #ff4757', background: 'rgba(255,71,87,0.08)', color: '#ff4757', fontWeight: 800, fontSize: '1rem', cursor: 'pointer' }}>✕ {h.iDontKnow}</button>
        <button onClick={() => answer(true)} style={{ padding: 18, borderRadius: 18, border: '2px solid #2ed573', background: 'rgba(46,213,115,0.08)', color: '#2ed573', fontWeight: 800, fontSize: '1rem', cursor: 'pointer' }}>✓ {h.iKnow}</button>
      </div>
    </div>
  );
}
