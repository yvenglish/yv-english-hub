import { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UI_TEXTS } from '../../data/uiTexts';
import { shuffle, plain } from '../../data/games';
import GameHeader from './GameHeader';
import { cardStyle, pillButton } from './gameUi';

// Montar a frase tocando nos blocos na ordem certa.
// Pontos por frase: 2 de primeira, 1 na segunda tentativa; depois disso mostra a resposta.
export default function SentenceBuilder({ game, onFinish, onExit }) {
  const { activeCourse } = useAuth();
  const h = UI_TEXTS[activeCourse];
  const sentences = useMemo(() => shuffle(game.items), [game]);

  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [status, setStatus] = useState('building'); // building | wrong | correct | revealed

  const current = sentences[index];
  const tokens = useMemo(() => current.sentence.split(/\s+/).map((text, id) => ({ id, text })), [current]);
  const [pool, setPool] = useState(() => shuffle(tokens));
  const [built, setBuilt] = useState([]);

  const resetFor = (sentence) => {
    const t = sentence.sentence.split(/\s+/).map((text, id) => ({ id, text }));
    let shuffled = shuffle(t);
    // Evita começar já na ordem certa
    if (shuffled.every((tk, i) => tk.id === i) && t.length > 1) shuffled = [...shuffled.slice(1), shuffled[0]];
    setPool(shuffled);
    setBuilt([]);
    setAttempts(0);
    setStatus('building');
  };

  const pick = (token) => {
    if (status === 'correct' || status === 'revealed') return;
    setPool(pool.filter(t => t.id !== token.id));
    const nextBuilt = [...built, token];
    setBuilt(nextBuilt);
    setStatus('building');
    if (pool.length === 1) check(nextBuilt);
  };

  const unpick = (token) => {
    if (status === 'correct' || status === 'revealed') return;
    setBuilt(built.filter(t => t.id !== token.id));
    setPool([...pool, token]);
    setStatus('building');
  };

  // Compara o texto (palavras repetidas podem trocar de lugar sem problema)
  const check = (answer) => {
    const ok = plain(answer.map(t => t.text).join(' ')) === plain(current.sentence);
    if (ok) {
      setStatus('correct');
      setScore(s => s + (attempts === 0 ? 2 : 1));
      return;
    }
    if (attempts >= 1) {
      setStatus('revealed');
      return;
    }
    setAttempts(attempts + 1);
    setStatus('wrong');
  };

  // Limpar devolve os blocos, mas mantém a contagem de tentativas da frase
  const clear = () => {
    setPool(shuffle([...pool, ...built]));
    setBuilt([]);
    setStatus('building');
  };

  const next = () => {
    if (index + 1 >= sentences.length) {
      onFinish(score, sentences.length * 2);
      return;
    }
    setIndex(index + 1);
    resetFor(sentences[index + 1]);
  };

  const finished = status === 'correct' || status === 'revealed';

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <GameHeader title={game.title} progress={`${index + 1} / ${sentences.length}`} onExit={onExit} exitLabel={h.exit} />
      <div style={{ ...cardStyle, display: 'grid', gap: 18 }}>
        <p style={{ margin: 0, color: 'var(--muted)' }}>{h.sbInstruction}</p>
        {current.translation && <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>“{current.translation}”</p>}
        {current.hint && <p style={{ margin: 0, fontSize: '0.9rem' }}><strong style={{ color: 'var(--amber)' }}>{h.wgHint}:</strong> {current.hint}</p>}

        <div style={{ minHeight: 64, padding: 12, borderRadius: 16, border: `2px dashed ${status === 'correct' ? '#2ed573' : status === 'wrong' ? '#ff4757' : 'var(--line)'}`, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {built.map(t => <button key={t.id} onClick={() => unpick(t)} style={pillButton(true)}>{t.text}</button>)}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, minHeight: 48 }}>
          {pool.map(t => <button key={t.id} onClick={() => pick(t)} style={pillButton(false)}>{t.text}</button>)}
        </div>

        {status === 'wrong' && <p style={{ margin: 0, color: '#ff4757', fontWeight: 700 }}>{h.sbWrong}</p>}
        {status === 'correct' && <p style={{ margin: 0, color: '#2ed573', fontWeight: 800 }}>{h.sbCorrect}</p>}
        {status === 'revealed' && <p style={{ margin: 0 }}><strong>{h.sbAnswer}</strong> {current.sentence}</p>}

        <div style={{ display: 'flex', gap: 10 }}>
          {!finished && <button onClick={clear} style={{ ...pillButton(false), borderRadius: 999 }}>{h.sbClear}</button>}
          {finished && <button onClick={next} style={{ padding: '14px 28px', background: 'var(--plum)', color: '#fff', border: 'none', borderRadius: 999, fontWeight: 800, cursor: 'pointer' }}>{h.next}</button>}
        </div>
      </div>
    </div>
  );
}
