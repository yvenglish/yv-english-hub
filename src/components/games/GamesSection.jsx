import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { UI_TEXTS } from '../../data/uiTexts';
import { inCourse, getLevelLabel } from '../../data/courses';
import { GAME_TYPES, GAME_LEVELS, playableItems } from '../../data/games';
import { cardStyle } from './gameUi';
import { PLAYERS } from './players';

// "Mais jogos": jogos do curso que não pertencem a um deck do aluno (os de deck ficam na página do deck).
// onPlayingChange avisa a página quando um jogo abre/fecha (para esconder os decks).
export default function GamesSection({ onPlayingChange, excludeIds = [] }) {
  const { activeCourse, saveGameScore, getGameScores } = useAuth();
  const h = UI_TEXTS[activeCourse];

  const [games, setGames] = useState([]);
  const [scores, setScores] = useState({});
  const [level, setLevel] = useState('all');
  const [playing, setPlaying] = useState(null);
  const [result, setResult] = useState(null); // { score, total, isRecord, best }
  const [round, setRound] = useState(0);      // muda a cada "jogar de novo" para reiniciar o jogo

  useEffect(() => {
    const load = async () => {
      try {
        const [snap, myScores] = await Promise.all([getDocs(query(collection(db, 'games'), where('course', '==', activeCourse))), getGameScores()]);
        const list = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(g => inCourse(g, activeCourse) && PLAYERS[g.type] && playableItems(g).length >= 2)
          .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setGames(list);
        setScores(myScores);
      } catch (err) { console.error(err); }
    };
    load();
  }, [activeCourse]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = (game) => {
    setPlaying(game);
    setResult(null);
    setRound(r => r + 1);
    onPlayingChange?.(true);
    window.scrollTo(0, 0);
  };

  const close = () => {
    setPlaying(null);
    setResult(null);
    onPlayingChange?.(false);
  };

  const handleFinish = async (score, total) => {
    const saved = await saveGameScore(playing.id, score);
    setScores(prev => ({ ...prev, [playing.id]: { ...prev[playing.id], best: saved.best } }));
    setResult({ score, total, ...saved });
  };

  const typeLabel = (type) => ({ word_guess: h.gameTypeWordGuess, image: h.gameTypeImage, sentence_builder: h.gameTypeSentence, listen: h.gameTypeListen }[type]);

  if (playing && result) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', ...cardStyle, textAlign: 'center' }}>
        <span style={{ fontSize: '4rem' }}>{result.isRecord ? '🏆' : '🎉'}</span>
        <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2.2rem', margin: '10px 0' }}>{h.gameOver}</h2>
        <p style={{ fontSize: '1.15rem' }}>{h.finalScore(result.score, result.total)}</p>
        {result.isRecord ? <p style={{ fontWeight: 800, color: 'var(--amber)' }}>{h.newRecord}</p> : <p style={{ color: 'var(--muted)' }}>{h.bestScore(result.best)}</p>}
        <div style={{ display: 'grid', gap: 10, marginTop: 20 }}>
          <button onClick={() => open(playing)} style={{ padding: '14px 28px', background: 'var(--plum)', color: '#fff', border: 'none', borderRadius: 999, fontWeight: 800, cursor: 'pointer' }}>{h.playAgain}</button>
          <button onClick={close} style={{ padding: '14px 28px', background: 'transparent', border: '1px solid var(--line)', color: 'var(--text)', borderRadius: 999, fontWeight: 800, cursor: 'pointer' }}>{h.backToGames}</button>
        </div>
      </div>
    );
  }

  if (playing) {
    const Player = PLAYERS[playing.type];
    return <Player key={round} game={playing} onFinish={handleFinish} onExit={close} />;
  }

  const levelsInUse = GAME_LEVELS.filter(l => games.some(g => g.level === l && !excludeIds.includes(g.id)));
  const available = games.filter(g => !excludeIds.includes(g.id));
  const visible = available.filter(g => level === 'all' || g.level === level);
  if (available.length === 0) return null;

  return (
    <section style={{ marginTop: 50 }}>
      <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2.5rem', color: 'var(--text)', margin: '0 0 8px' }}>{h.moreGamesTitle}</h2>
      <p style={{ color: 'var(--muted)', margin: '0 0 20px' }}>{h.moreGamesSubtitle}</p>

      {levelsInUse.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {['all', ...levelsInUse].map(l => (
            <button key={l} onClick={() => setLevel(l)} style={{ padding: '8px 16px', borderRadius: 99, border: `1px solid ${level === l ? 'var(--plum)' : 'var(--line)'}`, background: level === l ? 'var(--plum)' : 'var(--paper)', color: level === l ? '#fff' : 'var(--text)', fontWeight: 'bold', cursor: 'pointer' }}>
              {l === 'all' ? h.allLevels : getLevelLabel(l, activeCourse)}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <div style={{ background: 'var(--paper)', padding: 30, borderRadius: 24, textAlign: 'center', border: '1px dashed var(--line)', color: 'var(--muted)' }}>{h.noGames}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
          {visible.map(g => (
            <button key={g.id} onClick={() => open(g)} style={{ background: 'var(--paper)', border: '1px solid var(--line)', padding: 24, borderRadius: 24, textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8, transition: '0.3s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
              {g.type === 'image' && g.imageUrl ? (
                <img src={g.imageUrl} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 14 }} />
              ) : (
                <span style={{ fontSize: '2.2rem' }}>{GAME_TYPES[g.type].icon}</span>
              )}
              <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--amber)' }}>{typeLabel(g.type)}</span>
              <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text)' }}>{g.title}</h3>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 'auto', paddingTop: 8 }}>
                <span style={{ background: 'var(--cream)', padding: '4px 10px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--plum)' }}>{h.itemsCount(playableItems(g).length)}</span>
                {g.level && <span style={{ background: 'var(--cream)', padding: '4px 10px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--plum)' }}>{getLevelLabel(g.level, activeCourse)}</span>}
                {scores[g.id]?.best > 0 && <span style={{ background: 'var(--cream)', padding: '4px 10px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--amber)' }}>🏆 {scores[g.id].best}</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
