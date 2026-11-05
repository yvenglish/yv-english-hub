import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UI_TEXTS } from '../../data/uiTexts';
import { shuffle } from '../../data/games';
import GameHeader from '../games/GameHeader';
import { cardStyle, pillButton } from '../games/gameUi';

const ROUND_SECONDS = 60;

// 60 segundos para acertar o máximo de traduções do deck. O recorde fica salvo por deck.
export default function SpeedRoundMode({ deck, globalWords, onFinish }) {
  const { activeCourse, saveGameScore } = useAuth();
  const h = UI_TEXTS[activeCourse];

  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [hits, setHits] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [card, setCard] = useState(() => deck.words[Math.floor(Math.random() * deck.words.length)]);
  const [picked, setPicked] = useState(null);
  const [result, setResult] = useState(null); // { isRecord, best }
  const scoreRef = useRef({ hits: 0, answered: 0 });

  const translations = useMemo(() => {
    const own = [...new Set(deck.words.map(w => w.translation))];
    // Deck pequeno: completa as opções com outras palavras do curso
    return own.length >= 4 ? own : [...new Set([...own, ...globalWords.map(w => w.translation)])];
  }, [deck, globalWords]);

  const options = useMemo(
    () => shuffle([card.translation, ...shuffle(translations.filter(t => t !== card.translation)).slice(0, 3)]),
    [card, translations]
  );

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fim do tempo: salva o recorde
  useEffect(() => {
    if (timeLeft > 0) return;
    saveGameScore(`speed_${deck.id}`, scoreRef.current.hits).then(setResult);
  }, [timeLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (opt) => {
    if (picked || timeLeft === 0) return;
    const ok = opt === card.translation;
    setPicked({ opt, ok });
    scoreRef.current = { hits: scoreRef.current.hits + (ok ? 1 : 0), answered: scoreRef.current.answered + 1 };
    setHits(scoreRef.current.hits);
    setAnswered(scoreRef.current.answered);
    setTimeout(() => {
      setPicked(null);
      const pool = deck.words.length > 1 ? deck.words.filter(w => w.id !== card.id) : deck.words;
      setCard(pool[Math.floor(Math.random() * pool.length)]);
    }, ok ? 250 : 700);
  };

  if (timeLeft === 0) {
    return (
      <div style={{ maxWidth: 500, margin: '0 auto', ...cardStyle, textAlign: 'center' }}>
        <span style={{ fontSize: '4rem' }}>⚡</span>
        <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2.2rem', margin: '10px 0' }}>{h.gameOver}</h2>
        <p style={{ fontSize: '1.2rem' }}>{h.finalScore(hits, answered)}</p>
        {result?.isRecord && <p style={{ fontWeight: 800, color: 'var(--amber)' }}>{h.newRecord}</p>}
        {result && !result.isRecord && <p style={{ color: 'var(--muted)' }}>{h.bestScore(result.best)}</p>}
        <button onClick={() => onFinish({ score: hits, total: answered, alreadySaved: true })} style={{ marginTop: 10, padding: '14px 28px', background: 'var(--plum)', color: '#fff', border: 'none', borderRadius: 999, fontWeight: 800, cursor: 'pointer' }}>{h.next}</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <GameHeader title={`⚡ ${h.srTitle}`} progress={`${h.srTime(timeLeft)} · ${h.srHits(hits)}`} onExit={() => onFinish({ earlyExit: true, studiedCount: answered })} exitLabel={h.exit} />
      <div style={{ height: 6, background: 'var(--line)', borderRadius: 99, marginBottom: 20, overflow: 'hidden' }}>
        <div style={{ width: `${(timeLeft / ROUND_SECONDS) * 100}%`, height: '100%', background: timeLeft <= 10 ? '#ff4757' : 'var(--amber)', transition: 'width 1s linear' }} />
      </div>
      <div style={{ ...cardStyle, textAlign: 'center', display: 'grid', gap: 20 }}>
        <p style={{ margin: 0, color: 'var(--muted)' }}>{h.srText}</p>
        <h2 style={{ margin: 0, fontSize: '2.4rem', fontFamily: '"Playfair Display", serif' }}>{card.term}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
          {options.map(opt => {
            const isRight = picked && opt === card.translation;
            const isWrongPick = picked && picked.opt === opt && !picked.ok;
            return (
              <button key={opt} onClick={() => choose(opt)} style={{ ...pillButton(false), background: isRight ? '#2ed573' : isWrongPick ? '#ff4757' : 'var(--paper)', color: isRight || isWrongPick ? '#fff' : 'var(--text)' }}>{opt}</button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
