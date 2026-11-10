import { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UI_TEXTS } from '../../data/uiTexts';
import { shuffle } from '../../data/games';
import GameHeader from '../games/GameHeader';
import { cardStyle, pillButton, speak } from '../games/gameUi';

const MODULE_SIZE = 7;
const pick = (list) => list[Math.floor(Math.random() * list.length)];

// Modo Aprender (como o do Quizlet): módulos de 7 palavras em múltipla escolha.
// Errou, a palavra volta no fim do módulo até acertar. No fim de cada módulo aparece um resumo
// com frase motivacional, % do deck e os termos da rodada.
export default function LearnMode({ deck, globalWords, onFinish }) {
  const { updateFlashcardProgress, activeCourse, activeCourseInfo } = useAuth();
  const h = UI_TEXTS[activeCourse];

  const modules = useMemo(() => {
    const words = shuffle(deck.words);
    const list = [];
    for (let i = 0; i < words.length; i += MODULE_SIZE) list.push(words.slice(i, i + MODULE_SIZE));
    return list;
  }, [deck]);

  const [moduleIndex, setModuleIndex] = useState(0);
  const [queue, setQueue] = useState(modules[0] || []);
  const [position, setPosition] = useState(0);
  const [answer, setAnswer] = useState(null); // { option, ok }
  const [learned, setLearned] = useState([]); // ids acertados neste modo
  const [missedOnce, setMissedOnce] = useState([]); // ids que já erraram (não contam de primeira)
  const [feedback, setFeedback] = useState(h.learnChoose);
  const [showSummary, setShowSummary] = useState(false);

  const current = queue[position];
  const total = deck.words.length;

  // Opções erradas: do próprio deck; completa com o curso se o deck tiver menos de 4 traduções
  const options = useMemo(() => {
    if (!current) return [];
    const others = (list) => [...new Set(list.map(w => w.translation))].filter(t => t && t !== current.translation);
    let wrong = shuffle(others(deck.words)).slice(0, 3);
    if (wrong.length < 3) wrong = [...wrong, ...shuffle(others(globalWords)).filter(t => !wrong.includes(t))].slice(0, 3);
    return shuffle([current.translation, ...wrong]);
  }, [current, deck, globalWords]);

  const choose = (option) => {
    if (answer) return;
    const ok = option === current.translation;
    setAnswer({ option, ok });
    updateFlashcardProgress(current.id, ok ? (missedOnce.includes(current.id) ? 1 : 2) : 0);
    if (ok) {
      setLearned(prev => [...prev, current.id]);
      setFeedback(pick(h.learnCheers));
      speak(current.term, activeCourseInfo.speechLang);
    } else {
      setMissedOnce(prev => (prev.includes(current.id) ? prev : [...prev, current.id]));
      setQueue(prev => [...prev, current]); // volta no fim do módulo
      setFeedback(pick(h.learnRetry));
    }
  };

  const next = () => {
    setAnswer(null);
    setFeedback(h.learnChoose);
    if (position + 1 < queue.length) {
      setPosition(position + 1);
      return;
    }
    setShowSummary(true);
  };

  const nextModule = () => {
    if (moduleIndex + 1 >= modules.length) {
      onFinish({ score: total - missedOnce.length, total, studiedCount: total, learnDone: true });
      return;
    }
    setModuleIndex(moduleIndex + 1);
    setQueue(modules[moduleIndex + 1]);
    setPosition(0);
    setShowSummary(false);
  };

  // Barra em etapas: um segmento por módulo
  const progressBar = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 25 }}>
      {modules.map((m, i) => {
        const done = m.filter(w => learned.includes(w.id)).length;
        return (
          <div key={i} style={{ flex: 1, height: 10, borderRadius: 99, background: 'var(--line)', overflow: 'hidden' }}>
            <div style={{ width: `${(done / m.length) * 100}%`, height: '100%', background: '#2ed573', transition: 'width 0.4s' }} />
          </div>
        );
      })}
      <span style={{ fontWeight: 800, color: 'var(--muted)', fontSize: '0.85rem', minWidth: 52, textAlign: 'right' }}>{learned.length}/{total}</span>
    </div>
  );

  if (showSummary) {
    const pct = Math.round((learned.length / total) * 100);
    const isLast = moduleIndex + 1 >= modules.length;
    return (
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        <GameHeader title={`🧠 ${h.modeLearn}`} progress={h.learnModule(moduleIndex + 1, modules.length)} onExit={() => onFinish({ earlyExit: true, studiedCount: learned.length })} exitLabel={h.exit} />
        {progressBar}
        <div style={{ ...cardStyle, display: 'grid', gap: 18 }}>
          <h2 style={{ margin: 0, fontFamily: '"Playfair Display", serif', fontSize: '2rem' }}>{isLast ? h.learnAllDone : h.learnRoundTitles[moduleIndex % h.learnRoundTitles.length]}</h2>
          {isLast && <p style={{ margin: 0, color: 'var(--muted)' }}>{h.learnAllDoneText}</p>}
          <div>
            <p style={{ margin: '0 0 8px', fontWeight: 800 }}>{h.learnDeckProgress}: <span style={{ color: '#2ed573' }}>{pct}%</span></p>
            <div style={{ height: 12, borderRadius: 99, background: 'var(--line)', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: '#2ed573' }} />
            </div>
          </div>
          <p style={{ margin: 0, color: 'var(--muted)', fontWeight: 700 }}>{h.learnRoundTerms}</p>
          <div style={{ display: 'grid', gap: 8 }}>
            {modules[moduleIndex].map(w => (
              <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'var(--cream)' }}>
                <span style={{ flex: 1 }}><strong>{w.term}</strong><br /><span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{w.translation}</span></span>
                {missedOnce.includes(w.id) && <span title="" style={{ fontSize: '0.75rem', color: '#F09A4A', fontWeight: 800 }}>↺</span>}
                <button onClick={() => speak(w.term, activeCourseInfo.speechLang)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}>🔊</button>
              </div>
            ))}
          </div>
          <button onClick={nextModule} style={{ padding: 16, borderRadius: 999, border: 'none', background: 'var(--plum)', color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: 'pointer' }}>{isLast ? h.next : h.learnContinue}</button>
        </div>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div style={{ maxWidth: 620, margin: '0 auto' }}>
      <GameHeader title={`🧠 ${h.modeLearn}`} progress={h.learnModule(moduleIndex + 1, modules.length)} onExit={() => onFinish({ earlyExit: true, studiedCount: learned.length })} exitLabel={h.exit} />
      {progressBar}
      <div style={{ ...cardStyle, display: 'grid', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: '1.9rem', fontWeight: 600, flex: 1 }}>{current.term}</h2>
          <button onClick={() => speak(current.term, activeCourseInfo.speechLang)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem' }}>🔊</button>
        </div>
        {current.imageUrl && <img src={current.imageUrl} alt="" style={{ maxHeight: 120, borderRadius: 12, justifySelf: 'start' }} />}
        <p style={{ margin: 0, fontWeight: 800, color: answer ? (answer.ok ? '#2ed573' : '#ff4757') : 'var(--muted)' }}>{feedback}</p>
        <div style={{ display: 'grid', gap: 10 }}>
          {options.map(opt => {
            const isRight = answer && opt === current.translation;
            const isWrongPick = answer && answer.option === opt && !answer.ok;
            return (
              <button key={opt} onClick={() => choose(opt)} style={{ ...pillButton(false), textAlign: 'left', padding: '16px 18px', borderWidth: 2, borderColor: isRight ? '#2ed573' : isWrongPick ? '#ff4757' : 'var(--line)', background: 'var(--paper)' }}>
                {isRight ? '✓ ' : isWrongPick ? '✕ ' : ''}{opt}
              </button>
            );
          })}
        </div>
        {answer && <button onClick={next} style={{ padding: 14, borderRadius: 999, border: 'none', background: 'var(--plum)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>{h.next}</button>}
      </div>
    </div>
  );
}
