import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UI_TEXTS } from '../../data/uiTexts';
import { shuffle } from '../../data/games';
import GameHeader from './GameHeader';
import { cardStyle, pillButton, speak } from './gameUi';

// Ouvir a palavra (áudio gravado ou voz do navegador) e escolher a tradução. 1 ponto por acerto.
export default function ListenChoose({ game, onFinish, onExit }) {
  const { activeCourse, activeCourseInfo } = useAuth();
  const h = UI_TEXTS[activeCourse];
  const items = useMemo(() => shuffle(game.items), [game]);

  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answer, setAnswer] = useState(null);

  const current = items[index];
  const options = useMemo(() => {
    const wrong = shuffle([...new Set(game.items.map(i => i.translation))].filter(t => t !== current.translation)).slice(0, 3);
    return shuffle([current.translation, ...wrong]);
  }, [current, game]);

  const play = () => speak(current.word, activeCourseInfo.speechLang, current.audioUrl);

  // Toca sozinho ao trocar de palavra
  useEffect(() => {
    const timer = setTimeout(play, 300);
    return () => clearTimeout(timer);
  }, [index]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (opt) => {
    if (answer) return;
    setAnswer(opt);
    const correct = opt === current.translation;
    const total = score + (correct ? 1 : 0);
    setScore(total);
    setTimeout(() => {
      if (index + 1 >= items.length) {
        onFinish(total, items.length);
        return;
      }
      setIndex(index + 1);
      setAnswer(null);
    }, 1300);
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <GameHeader title={game.title} progress={`${index + 1} / ${items.length}`} onExit={onExit} exitLabel={h.exit} />
      <div style={{ ...cardStyle, textAlign: 'center', display: 'grid', gap: 20 }}>
        <p style={{ margin: 0, color: 'var(--muted)' }}>{h.lsInstruction}</p>
        <button onClick={play} style={{ justifySelf: 'center', width: 110, height: 110, borderRadius: '50%', border: 'none', background: 'var(--plum)', color: '#fff', fontSize: '2.5rem', cursor: 'pointer', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>🔊</button>
        {answer && <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>{current.word}</p>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
          {options.map(opt => {
            const isRight = answer && opt === current.translation;
            const isWrongPick = answer === opt && opt !== current.translation;
            return (
              <button key={opt} onClick={() => choose(opt)} style={{ ...pillButton(false), background: isRight ? '#2ed573' : isWrongPick ? '#ff4757' : 'var(--paper)', color: isRight || isWrongPick ? '#fff' : 'var(--text)' }}>
                {opt}
              </button>
            );
          })}
        </div>
        {!answer && <button onClick={play} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>{h.lsPlay}</button>}
      </div>
    </div>
  );
}
