import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { fetchByIds } from '../services/firestoreHelpers';

import CardsMode from '../components/flashcards/CardsMode';
import LearnMode from '../components/flashcards/LearnMode';
import MatchMode from '../components/flashcards/MatchMode';
import WrittenMode from '../components/flashcards/WrittenMode';
import BlastMode from '../components/flashcards/BlastMode';
import DeckPage from '../components/deck/DeckPage';
import GamesSection from '../components/games/GamesSection';
import { PLAYERS } from '../components/games/players';
import { inCourse } from '../data/courses';
import { REVIEW_BATCH_SIZE, wordStatus } from '../data/srs';
import { playableItems, shuffle } from '../data/games';
import { getDeckIcon } from '../data/deckIcons';
import { UI_TEXTS } from '../data/uiTexts';

// Última carga de cada aluno/curso: ao voltar para Games a página aparece na hora e atualiza por trás
const pageCache = new Map();

const sameTitle = (a, b) => (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();

// Jogos gerados automaticamente com as palavras do deck
const deckGame = (mode, deck, words) => mode === 'listen'
  ? { id: `listen_${deck.id}`, type: 'listen', title: deck.title, items: words.map(w => ({ word: w.term, translation: w.translation, audioUrl: w.audioUrl || '' })) }
  : { id: `hangman_${deck.id}`, type: 'word_guess', title: deck.title, items: words.map(w => ({ word: w.term, hint: w.hint || '', meaning: w.translation })) };

// Página "Games": Daily Review no topo, depois os decks. Clicar num deck abre a página do deck
// (prévia, modos de estudo, jogos, progresso e termos). Jogos sem deck ficam em "Mais jogos".
export default function Flashcards() {
  const navigate = useNavigate();
  const { currentUser, userData, recordStudy, getDueFlashcards, getDifficultFlashcards, reviewBatchesToday, recordReviewBatch, saveGameScore, getGameScores, toggleFavoriteWord, activeCourse } = useAuth();
  const h = UI_TEXTS[activeCourse];

  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list' | 'deck' | 'playing'
  const [gamePlaying, setGamePlaying] = useState(false); // um jogo de "Mais jogos" está aberto

  const [studentDecks, setStudentDecks] = useState([]);
  const [globalWords, setGlobalWords] = useState([]);
  const [progressById, setProgressById] = useState({});
  const [scores, setScores] = useState({});
  const [games, setGames] = useState([]);

  const [deckId, setDeckId] = useState(null); // deck aberto
  const [play, setPlay] = useState(null);     // { mode, deck, game? }
  const [finishing, setFinishing] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [completeModal, setCompleteModal] = useState(null); // { title, text }
  const loadedOnce = useRef(false);

  // Recarrega quando muda o aluno, o curso, as favoritas ou a rodada da Daily Review
  // (e depois de cada modo/jogo, no handleFinish). Games e flashcards ficam liberados para todos os planos.
  const favoritesKey = (userData?.favoriteWords || []).join(',');
  useEffect(() => {
    if (currentUser) loadData();
  }, [currentUser?.uid, activeCourse, favoritesKey, reviewBatchesToday]); // eslint-disable-line react-hooks/exhaustive-deps

  const cacheKey = currentUser ? `${currentUser.uid}_${activeCourse}` : null;

  const applyData = (data) => {
    setProgressById(data.progressById);
    setScores(data.scores);
    setGames(data.games);
    setGlobalWords(data.words);
    setStudentDecks(data.decks);
  };

  const loadData = async () => {
    // Com cache, mostra na hora e atualiza por trás; sem cache, mostra "carregando"
    const cached = pageCache.get(cacheKey);
    if (cached) {
      applyData(cached);
      setLoading(false);
    } else if (!loadedOnce.current) {
      setLoading(true);
    }
    try {
      const [assignSnap, dueFlashcards, difficultFlashcards, progressSnap, myScores, gamesSnap] = await Promise.all([
        getDocs(query(collection(db, 'vocab_assignments'), where('studentId', '==', currentUser.uid))),
        getDueFlashcards(),
        getDifficultFlashcards(),
        getDocs(collection(db, `users/${currentUser.uid}/flashcard_progress`)),
        getGameScores(),
        getDocs(query(collection(db, 'games'), where('course', '==', activeCourse)))
      ]);

      const progressById = Object.fromEntries(progressSnap.docs.map(d => [d.id, d.data()]));
      const assignments = assignSnap.docs.map(d => d.data());

      // Só os decks atribuídos ao aluno (em vez da coleção inteira)
      const deckSnaps = await Promise.all([...new Set(assignments.filter(a => a.type === 'deck').map(a => a.deckId))].filter(Boolean).map(id => getDoc(doc(db, 'decks', id))));
      const allDecks = deckSnaps.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() })).filter(d => inCourse(d, activeCourse));

      // Só as palavras que o aluno usa: dos decks, das palavras soltas, favoritas e da revisão
      const neededIds = [
        ...allDecks.flatMap(d => d.wordIds || []),
        ...assignments.filter(a => a.type === 'words').flatMap(a => a.wordIds || []),
        ...(userData?.favoriteWords || []),
        ...dueFlashcards.map(df => df.wordId),
        ...difficultFlashcards.map(df => df.wordId)
      ];
      const allWords = (await fetchByIds('vocabulary_global', neededIds)).filter(w => inCourse(w, activeCourse));
      const wordById = Object.fromEntries(allWords.map(w => [w.id, w]));
      const toWords = (ids) => (ids || []).map(id => wordById[id]).filter(Boolean);

      const builtDecks = [];
      let customWords = [];
      assignments.forEach(assign => {
        if (assign.type === 'deck') {
          const deckData = allDecks.find(d => d.id === assign.deckId);
          if (deckData && !builtDecks.some(d => d.id === deckData.id)) {
            builtDecks.push({ id: deckData.id, title: deckData.title, description: deckData.description, icon: deckData.icon, disabledModes: deckData.disabledModes || [], words: toWords(deckData.wordIds) });
          }
        } else if (assign.type === 'words') {
          customWords = [...customWords, ...toWords(assign.wordIds)];
        }
      });

      const uniqueCustom = Array.from(new Map(customWords.map(w => [w.id, w])).values());
      if (uniqueCustom.length > 0) {
        builtDecks.push({ id: 'custom_words_deck', title: h.fcLooseTitle, description: h.fcLooseDesc, words: uniqueCustom });
      }

      // Favoritas: palavras marcadas com ⭐ (só as do curso ativo)
      const favorites = toWords(userData?.favoriteWords);
      if (favorites.length > 0) {
        builtDecks.unshift({ id: 'favorites_deck', title: h.favoritesTitle, description: h.favoritesDesc, icon: '⭐', words: favorites });
      }

      // Palavras difíceis: erradas várias vezes e ainda não consolidadas
      const difficultWords = toWords(difficultFlashcards.map(df => df.wordId));
      if (difficultWords.length > 0) {
        builtDecks.unshift({ id: 'difficult_words_deck', title: h.fcHardTitle, description: h.fcHardDesc, icon: '🧠', words: difficultWords, isSpecial: true });
      }

      // Daily Review: rodadas de 7, as mais atrasadas primeiro
      const allDue = toWords(dueFlashcards.map(df => df.wordId));
      if (allDue.length > 0) {
        const isExtraRound = reviewBatchesToday > 0;
        builtDecks.unshift({
          id: 'daily_review_deck',
          title: isExtraRound ? h.fcReviewMoreTitle(reviewBatchesToday + 1) : h.fcReviewTitle,
          description: isExtraRound ? h.fcReviewMoreDesc(allDue.length) : h.fcReviewDesc,
          words: allDue.slice(0, REVIEW_BATCH_SIZE),
          isSpecial: true
        });
      }

      const data = {
        progressById,
        scores: myScores,
        games: gamesSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(g => PLAYERS[g.type] && playableItems(g).length >= 2),
        words: allWords,
        decks: builtDecks
      };
      pageCache.set(cacheKey, data);
      applyData(data);
    } catch (err) {
      console.error(err);
    }
    loadedOnce.current = true;
    setLoading(false);
  };

  const openDeck = studentDecks.find(d => d.id === deckId) || null;
  const linkedGames = (deck) => games.filter(g => g.deckTitle && sameTitle(g.deckTitle, deck.title));
  const linkedGameIds = studentDecks.flatMap(d => linkedGames(d).map(g => g.id));

  const startPlay = (mode, deck, words, game = null) => {
    if (!words.length) return alert(h.fcEmptyDeck);
    setPlay({ mode, deck: { ...deck, words: shuffle(words) }, game });
    setView('playing');
    window.scrollTo(0, 0);
  };

  const handleDeckClick = (deck) => {
    if (deck.words.length === 0) return alert(h.fcEmptyDeck);
    // A Daily Review abre direto nos cartões
    if (deck.id === 'daily_review_deck') return startPlay('cards', deck, deck.words);
    setDeckId(deck.id);
    setView('deck');
    window.scrollTo(0, 0);
  };

  const handleFinish = async (result = {}) => {
    const { mode, deck, game } = play;
    setFinishing(true);
    let title = h.fcReviewDone;
    let text = h.fcReviewDone;
    let isGoalReached = false;

    const isScored = ['blast', 'listen', 'hangman', 'game'].includes(mode);
    if (result.earlyExit) {
      text = h.fcEarlyExit;
      if (result.studiedCount > 0) isGoalReached = (await recordStudy(result.studiedCount)).goalJustReached;
    } else if (isScored) {
      // Jogos: guarda o recorde (salvar também conta para o streak)
      const key = mode === 'game' ? game.id : `${mode}_${deck.id}`;
      const saved = await saveGameScore(key, result.score);
      setScores(prev => ({ ...prev, [key]: { ...prev[key], best: saved.best } }));
      title = h.gameOver;
      text = `${mode === 'blast' ? h.blastTotal(result.score) : h.finalScore(result.score, result.total)} ${saved.isRecord ? h.newRecord : h.bestScore(saved.best)}`;
    } else {
      const studied = result.studiedCount ?? deck.words.length;
      if (studied > 0) isGoalReached = (await recordStudy(studied)).goalJustReached;
      if (mode === 'cards') text = h.cardsDone(result.score, result.total);
      else if (result.score !== undefined) text = h.fcScore(result.score, result.total);
    }

    // Rodada da Daily Review concluída (a próxima aparece se ainda houver atrasadas)
    if (deck.id === 'daily_review_deck' && !result.earlyExit) await recordReviewBatch();

    setPlay(null);
    setFinishing(false);
    loadData();
    setView(deckId && deck.id !== 'daily_review_deck' ? 'deck' : 'list');
    if (isGoalReached) setShowGoalModal(true);
    else setCompleteModal({ title, text });
  };

  // Jogos importados e gerados usam onFinish(score, total) e onExit()
  const gameCallbacks = {
    onFinish: (score, total) => handleFinish({ score, total }),
    onExit: () => handleFinish({ earlyExit: true, studiedCount: 0 })
  };

  const renderPlaying = () => {
    if (finishing) return <div style={{ textAlign: 'center', padding: 50, color: 'var(--muted)' }}>{h.fcSaving}</div>;
    const { mode, deck, game } = play;
    switch (mode) {
      case 'cards': return <CardsMode deck={deck} onFinish={handleFinish} />;
      case 'learn': return <LearnMode deck={deck} globalWords={globalWords} onFinish={handleFinish} />;
      case 'match': return <MatchMode deck={deck} onFinish={handleFinish} />;
      case 'write': return <WrittenMode deck={deck} onFinish={handleFinish} />;
      case 'blast': return <BlastMode deck={deck} globalWords={globalWords} onFinish={r => handleFinish(r.earlyExit ? r : { score: r.blastScore })} />;
      case 'listen':
      case 'hangman': {
        const Player = PLAYERS[mode === 'listen' ? 'listen' : 'word_guess'];
        return <Player game={deckGame(mode, deck, deck.words)} {...gameCallbacks} />;
      }
      case 'game': {
        const Player = PLAYERS[game.type];
        return <Player game={game} {...gameCallbacks} />;
      }
      default: return null;
    }
  };

  const modal = (border, emoji, titleText, titleColor, body) => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(20, 10, 20, 0.85)', backdropFilter: 'blur(12px)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <div style={{ background: 'var(--paper)', width: '100%', maxWidth: 450, borderRadius: 28, border: `1px solid ${border}`, textAlign: 'center', padding: '50px 40px' }}>
        <span style={{ fontSize: '5rem', display: 'block', margin: '0 auto 15px' }}>{emoji}</span>
        <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2.3rem', color: titleColor, marginBottom: 15, lineHeight: 1.1 }}>{titleText}</h2>
        {body}
      </div>
    </div>
  );

  const modalButtons = (onClose) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <button onClick={onClose} style={{ padding: '16px 28px', background: 'var(--plum)', color: '#fff', border: 'none', borderRadius: 999, fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer' }}>{h.fcKeepStudying}</button>
      <button onClick={() => { onClose(); navigate('/'); }} style={{ padding: '16px 28px', background: 'transparent', border: '1px solid var(--line)', color: 'var(--text)', borderRadius: 999, fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer' }}>{h.fcBackHome}</button>
    </div>
  );

  const regularDecks = studentDecks.filter(d => !d.isSpecial);
  const reviewDeck = studentDecks.find(d => d.id === 'daily_review_deck');
  const hardDeck = studentDecks.find(d => d.id === 'difficult_words_deck');

  return (
    <div className="site-shell unlocked" style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <main style={{ flex: 1, padding: 20, maxWidth: 1040, margin: '0 auto', width: '100%' }}>
        {showGoalModal && modal('#FF5A1E', '🔥', h.goalReached, '#FF5A1E', <>
          <p style={{ color: 'var(--text)', fontSize: '1.1rem', lineHeight: 1.6, marginBottom: 10 }}>{h.fcGoalText}</p>
          <p style={{ color: 'var(--muted)', marginBottom: 30 }}>{h.streakBefore} <strong>{userData?.currentStreak || 0} {h.days}</strong>{h.streakAfter}</p>
          {modalButtons(() => setShowGoalModal(false))}
        </>)}

        {completeModal && modal('var(--plum)', '🎉', completeModal.title, 'var(--plum)', <>
          <p style={{ color: 'var(--text)', fontSize: '1.1rem', lineHeight: 1.6, marginBottom: 30 }}>{completeModal.text}</p>
          {modalButtons(() => setCompleteModal(null))}
        </>)}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 50, color: 'var(--muted)' }}>{h.fcLoading}</div>
        ) : view === 'playing' && play ? (
          renderPlaying()
        ) : view === 'deck' && openDeck ? (
          <DeckPage
            deck={openDeck}
            progressById={progressById}
            scores={scores}
            linkedGames={linkedGames(openDeck)}
            favoriteIds={userData?.favoriteWords || []}
            onBack={() => { setDeckId(null); setView('list'); }}
            onPlay={(mode, words) => startPlay(mode, openDeck, words)}
            onPlayGame={(game) => startPlay('game', openDeck, openDeck.words, game)}
            onToggleFavorite={toggleFavoriteWord}
          />
        ) : (
          <div>
            <style>{'.deck-card:hover { transform: translateY(-4px); border-color: var(--amber) !important; } .review-hero { transition: 0.25s; } .review-hero:hover { transform: translateY(-3px); }'}</style>
            {!gamePlaying && (
              <>
                <section style={{ display: 'grid', gridTemplateColumns: hardDeck ? 'repeat(auto-fit, minmax(300px, 1fr))' : '1fr', gap: 20 }}>
                  {reviewDeck ? (
                    <button onClick={() => handleDeckClick(reviewDeck)} className="review-hero" style={{ textAlign: 'left', cursor: 'pointer', border: 'none', borderRadius: 28, padding: '32px 32px 28px', color: '#fff', background: 'radial-gradient(circle at 90% 10%, rgba(240,154,74,0.45), transparent 45%), linear-gradient(135deg, var(--plum), var(--plum-mid))', boxShadow: '0 18px 40px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--amber-soft)' }}>🔥 {h.fcReviewKicker}</span>
                      <strong style={{ fontFamily: '"Playfair Display", serif', fontSize: '2.2rem', lineHeight: 1.1 }}>{reviewDeck.title}</strong>
                      <span style={{ opacity: 0.85 }}>{reviewDeck.description}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                        <span style={{ background: 'rgba(255,255,255,0.15)', padding: '6px 14px', borderRadius: 99, fontWeight: 800, fontSize: '0.85rem' }}>{h.cardsCount(reviewDeck.words.length)}</span>
                        <span style={{ background: '#fff', color: 'var(--plum)', padding: '10px 20px', borderRadius: 99, fontWeight: 800 }}>{h.reviewStart}</span>
                      </span>
                    </button>
                  ) : (
                    <div style={{ borderRadius: 28, padding: '28px 32px', border: '1px solid var(--line)', background: 'var(--paper)', display: 'flex', alignItems: 'center', gap: 16 }}>
                      <span style={{ fontSize: '2.4rem' }}>✅</span>
                      <div>
                        <strong style={{ fontSize: '1.2rem', color: 'var(--text)' }}>{h.reviewUpToDate}</strong>
                        <p style={{ margin: '4px 0 0', color: 'var(--muted)' }}>{h.reviewComeBack}</p>
                      </div>
                    </div>
                  )}
                  {hardDeck && (
                    <button onClick={() => handleDeckClick(hardDeck)} style={{ textAlign: 'left', cursor: 'pointer', borderRadius: 28, padding: '28px 28px 24px', background: 'var(--paper)', border: '1px solid var(--line)', borderLeft: '6px solid #ff6b6b', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <span style={{ fontSize: '1.8rem' }}>🧠</span>
                      <strong style={{ fontSize: '1.4rem', color: 'var(--text)' }}>{hardDeck.title}</strong>
                      <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{hardDeck.description}</span>
                      <span style={{ marginTop: 'auto', alignSelf: 'flex-start', background: 'var(--cream)', padding: '4px 12px', borderRadius: 99, fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--plum)' }}>{h.cardsCount(hardDeck.words.length)}</span>
                    </button>
                  )}
                </section>

                <section style={{ marginTop: 50 }}>
                  <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2.5rem', color: 'var(--text)', margin: '0 0 8px' }}>{h.fcMyDecks}</h2>
                  <p style={{ color: 'var(--muted)', margin: '0 0 20px' }}>{h.decksSubtitle}</p>
                  {regularDecks.length === 0 ? (
                    <div style={{ background: 'var(--paper)', padding: 40, borderRadius: 24, textAlign: 'center', border: '1px dashed var(--line)' }}>
                      <span style={{ fontSize: '3rem', display: 'block', marginBottom: 15 }}>📭</span>
                      <h3 style={{ margin: '0 0 10px' }}>{h.fcNoMaterial}</h3>
                      <p style={{ color: 'var(--muted)', margin: 0 }}>{h.fcNoMaterialText}</p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                      {regularDecks.map(deck => {
                        const mastered = deck.words.filter(w => wordStatus(progressById[w.id]) === 'mastered').length;
                        const pct = deck.words.length ? Math.round((mastered / deck.words.length) * 100) : 0;
                        return (
                          <button key={deck.id} onClick={() => handleDeckClick(deck)} className="deck-card" style={{ background: 'var(--paper)', border: '1px solid var(--line)', padding: '22px 22px 18px', borderRadius: 22, textAlign: 'left', cursor: 'pointer', transition: '0.25s', display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <span style={{ fontSize: '1.7rem' }}>{deck.id === 'custom_words_deck' ? '📝' : getDeckIcon(deck)}</span>
                            <h3 style={{ fontSize: '1.15rem', margin: '4px 0 0', color: 'var(--text)', lineHeight: 1.25 }}>{deck.title}</h3>
                            {deck.description && <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.85rem' }}>{deck.description}</p>}
                            <span style={{ marginTop: 'auto', paddingTop: 10, display: 'grid', gap: 4 }}>
                              <span style={{ height: 6, background: 'var(--line)', borderRadius: 99, overflow: 'hidden' }}>
                                <span style={{ display: 'block', width: `${pct}%`, height: '100%', background: pct === 100 ? '#2ed573' : 'var(--amber)', borderRadius: 99 }} />
                              </span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 700 }}>{pct === 100 ? h.deckAllMastered : h.deckMastered(mastered, deck.words.length)}</span>
                            </span>
                            <span style={{ paddingTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ background: 'var(--cream)', padding: '4px 10px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--plum)' }}>{h.cardsCount(deck.words.length)}</span>
                              <span style={{ color: 'var(--amber)', fontWeight: 800 }}>→</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              </>
            )}

            <GamesSection onPlayingChange={setGamePlaying} excludeIds={linkedGameIds} />
          </div>
        )}
      </main>
    </div>
  );
}
