import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UI_TEXTS } from '../../data/uiTexts';
import { shuffle, plain } from '../../data/games';
import GameHeader from './GameHeader';
import { cardStyle } from './gameUi';

const MAX_MISTAKES = 6;
const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
const isLetter = (ch) => /[a-z]/.test(ch);

// Adivinhar a palavra letra por letra, com dica e significado opcional.
// Pontos por palavra: 2 sem ver o significado, 1 vendo; 0 se não acertar.
export default function WordGuess({ game, onFinish, onExit }) {
  const { activeCourse } = useAuth();
  const h = UI_TEXTS[activeCourse];
  const words = useMemo(() => shuffle(game.items), [game]);

  const [index, setIndex] = useState(0);
  const [guessed, setGuessed] = useState([]);
  const [showMeaning, setShowMeaning] = useState(false);
  const [score, setScore] = useState(0);

  const current = words[index];
  const target = plain(current.word);
  const mistakes = guessed.filter(l => !target.includes(l)).length;
  const solved = [...target].every(ch => !isLetter(ch) || guessed.includes(ch));
  const failed = mistakes >= MAX_MISTAKES;
  const done = solved || failed;

  const guess = useCallback((letter) => {
    if (done || guessed.includes(letter)) return;
    setGuessed(prev => [...prev, letter]);
  }, [done, guessed]);

  // Teclado físico também funciona
  useEffect(() => {
    const onKey = (e) => {
      const key = plain(e.key);
      if (key.length === 1 && isLetter(key)) guess(key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [guess]);

  const next = () => {
    const points = solved ? (showMeaning ? 1 : 2) : 0;
    const total = score + points;
    if (index + 1 >= words.length) {
      onFinish(total, words.length * 2);
      return;
    }
    setScore(total);
    setIndex(index + 1);
    setGuessed([]);
    setShowMeaning(false);
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <GameHeader title={game.title} progress={`${index + 1} / ${words.length}`} onExit={onExit} exitLabel={h.exit} />
      <div style={{ ...cardStyle, textAlign: 'center' }}>
        {current.hint && (
          <p style={{ margin: '0 0 15px', fontSize: '1.05rem' }}><strong style={{ color: 'var(--amber)' }}>{h.wgHint}:</strong> {current.hint}</p>
        )}
        {current.meaning && (showMeaning || done ? (
          <p style={{ margin: '0 0 15px', color: 'var(--muted)' }}>{h.wgMeaning}: <strong style={{ color: 'var(--text)' }}>{current.meaning}</strong></p>
        ) : (
          <button onClick={() => setShowMeaning(true)} style={{ marginBottom: 15, background: 'none', border: '1px dashed var(--line)', borderRadius: 99, padding: '6px 14px', color: 'var(--muted)', cursor: 'pointer' }}>{h.wgShowMeaning}</button>
        ))}

        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 6, margin: '20px 0' }}>
          {[...current.word].map((ch, i) => {
            const base = plain(ch);
            if (!isLetter(base)) return <span key={i} style={{ width: 16 }}>{ch === ' ' ? '' : ch}</span>;
            const visible = guessed.includes(base) || done;
            return (
              <span key={i} style={{ width: 34, height: 44, borderBottom: '3px solid var(--plum)', display: 'grid', placeItems: 'center', fontSize: '1.6rem', fontWeight: 800, color: visible && !guessed.includes(base) ? '#ff4757' : 'var(--text)', textTransform: 'uppercase' }}>
                {visible ? ch : ''}
              </span>
            );
          })}
        </div>

        <p style={{ margin: '0 0 15px', color: mistakes >= MAX_MISTAKES - 2 ? '#ff4757' : 'var(--muted)', fontWeight: 700 }}>
          {'❤️'.repeat(MAX_MISTAKES - mistakes)}{'🤍'.repeat(mistakes)} {h.wgTriesLeft(MAX_MISTAKES - mistakes)}
        </p>

        {done ? (
          <div>
            <p style={{ fontSize: '1.2rem', fontWeight: 800, color: solved ? '#2ed573' : '#ff4757' }}>
              {solved ? h.wgSolved : <>{h.wgFailed} <span style={{ color: 'var(--text)' }}>{current.word}</span></>}
            </p>
            <button onClick={next} style={{ padding: '14px 28px', background: 'var(--plum)', color: '#fff', border: 'none', borderRadius: 999, fontWeight: 800, cursor: 'pointer' }}>{h.next}</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
            {LETTERS.map(l => {
              const used = guessed.includes(l);
              const hit = used && target.includes(l);
              return (
                <button key={l} onClick={() => guess(l)} disabled={used} style={{ width: 40, height: 44, borderRadius: 10, border: '1px solid var(--line)', fontWeight: 800, textTransform: 'uppercase', cursor: used ? 'default' : 'pointer', background: hit ? '#2ed573' : used ? 'var(--line)' : 'var(--cream)', color: hit ? '#fff' : 'var(--text)', opacity: used && !hit ? 0.4 : 1 }}>
                  {l}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
