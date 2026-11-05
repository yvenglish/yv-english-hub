import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

import ClassicMode from '../components/flashcards/ClassicMode';
import MultipleChoiceMode from '../components/flashcards/MultipleChoiceMode';
import MatchMode from '../components/flashcards/MatchMode';
import WrittenMode from '../components/flashcards/WrittenMode';
import SpeedRoundMode from '../components/flashcards/SpeedRoundMode';
import GamesSection from '../components/games/GamesSection';
import { inCourse } from '../data/courses';
import { REVIEW_BATCH_SIZE } from '../data/srs';
import { UI_TEXTS } from '../data/uiTexts';

export default function Flashcards() {
  const navigate = useNavigate();
  const { currentUser, userData, recordStudy, getDueFlashcards, getDifficultFlashcards, reviewBatchesToday, recordReviewBatch, activeCourse } = useAuth();
  const h = UI_TEXTS[activeCourse];

  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list', 'mode_select', 'playing'
  const [gamePlaying, setGamePlaying] = useState(false); // um jogo da seção Jogos está aberto
  
  const [studentDecks, setStudentDecks] = useState([]);
  const [globalWords, setGlobalWords] = useState([]);
  
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [selectedMode, setSelectedMode] = useState('');

  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(null); // stores the completion message

  useEffect(() => {
    // Games e flashcards ficam liberados para todos os planos
    if (currentUser) {
      loadData();
    }
  }, [currentUser, userData, navigate, activeCourse]);

  const loadData = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'vocab_assignments'), where('studentId', '==', currentUser.uid));
      
      const [wordsSnap, decksSnap, assignSnap, dueFlashcards, difficultFlashcards] = await Promise.all([
        getDocs(collection(db, 'vocabulary_global')),
        getDocs(collection(db, 'decks')),
        getDocs(q),
        getDueFlashcards(),
        getDifficultFlashcards()
      ]);

      // Só palavras e decks do curso ativo
      const allWords = wordsSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(w => inCourse(w, activeCourse));
      setGlobalWords(allWords);

      const allDecks = decksSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => inCourse(d, activeCourse));
      const assignments = assignSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // 4. Assemble student's decks
      const builtDecks = [];
      let customWords = []; // gather all isolated words

      assignments.forEach(assign => {
        if (assign.type === 'deck') {
          const deckData = allDecks.find(d => d.id === assign.deckId);
          if (deckData) {
            const deckWords = (deckData.wordIds || []).map(wId => allWords.find(w => w.id === wId)).filter(Boolean);
            builtDecks.push({
              id: deckData.id,
              title: deckData.title,
              description: deckData.description,
              words: deckWords
            });
          }
        } else if (assign.type === 'words') {
          const words = (assign.wordIds || []).map(wId => allWords.find(w => w.id === wId)).filter(Boolean);
          customWords = [...customWords, ...words];
        }
      });

      // Remove duplicates from custom words
      const uniqueCustom = Array.from(new Map(customWords.map(w => [w.id, w])).values());
      
      if (uniqueCustom.length > 0) {
        builtDecks.push({
          id: 'custom_words_deck',
          title: h.fcLooseTitle,
          description: h.fcLooseDesc,
          words: uniqueCustom
        });
      }

      // Palavras difíceis: erradas várias vezes e ainda não consolidadas
      const difficultWords = difficultFlashcards.map(df => allWords.find(w => w.id === df.wordId)).filter(Boolean);
      if (difficultWords.length > 0) {
        builtDecks.unshift({
          id: 'difficult_words_deck',
          title: h.fcHardTitle,
          description: h.fcHardDesc,
          words: difficultWords,
          isSpecial: true
        });
      }

      // 5. Daily Review (repetição espaçada): rodadas de 7, as mais atrasadas primeiro.
      // Ao terminar uma rodada, se ainda houver atrasadas, aparece a próxima.
      if (dueFlashcards.length > 0) {
        const allDue = dueFlashcards.map(df => allWords.find(w => w.id === df.wordId)).filter(Boolean);
        const dueWords = allDue.slice(0, REVIEW_BATCH_SIZE);
        const isExtraRound = reviewBatchesToday > 0;
        if (dueWords.length > 0) {
          builtDecks.unshift({
            id: 'daily_review_deck',
            title: isExtraRound ? h.fcReviewMoreTitle(reviewBatchesToday + 1) : h.fcReviewTitle,
            description: isExtraRound ? h.fcReviewMoreDesc(allDue.length) : h.fcReviewDesc,
            words: dueWords,
            isSpecial: true
          });
        }
      }

      setStudentDecks(builtDecks);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleDeckClick = (deck) => {
    if (deck.words.length === 0) return alert(h.fcEmptyDeck);
    
    // Embaralha as palavras sempre que abrir o deck
    const shuffledWords = [...deck.words].sort(() => Math.random() - 0.5);
    const shuffledDeck = { ...deck, words: shuffledWords };
    
    setSelectedDeck(shuffledDeck);
    setView('mode_select');
  };

  const [finishing, setFinishing] = useState(false);

  const startGame = (mode) => {
    setSelectedMode(mode);
    setView('playing');
  };
  const handleFinish = async (result) => {
    setFinishing(true);
    let msg = h.fcReviewDone;
    let isGoalReached = false;
    let cardsStudied = selectedDeck.words.length;

    if (result) {
      if (result.score !== undefined) {
        msg = h.fcScore(result.score, result.total);
      }
      if (result.earlyExit) {
        msg = h.fcEarlyExit;
      }
      if (result.studiedCount !== undefined) {
        cardsStudied = result.studiedCount;
      }
    }

    // O Speed Round já salvou o recorde (e o streak) sozinho
    if (userData && cardsStudied > 0 && !result?.alreadySaved) {
      const { goalJustReached } = await recordStudy(cardsStudied);
      isGoalReached = goalJustReached;
    }

    // Rodada da Daily Review concluída: conta a rodada. A mudança no userData recarrega os decks
    // (efeito do loadData), e a próxima rodada aparece se ainda houver palavras atrasadas.
    if (selectedDeck.id === 'daily_review_deck' && !result?.earlyExit) {
      await recordReviewBatch();
    }

    setView('list');
    setSelectedDeck(null);
    setSelectedMode('');
    setFinishing(false);

    if (isGoalReached) {
      setShowGoalModal(true);
    } else {
      setShowCompleteModal(msg);
    }
  };

  return (
    <div className="site-shell unlocked" style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      <main style={{ flex: 1, padding: 20, maxWidth: 1040, margin: '0 auto', width: '100%' }}>
        {showGoalModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(20, 10, 20, 0.85)', backdropFilter: 'blur(12px)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <div style={{ background: 'var(--paper)', width: '100%', maxWidth: 450, borderRadius: 28, overflow: 'hidden', position: 'relative', border: '1px solid #FF5A1E', textAlign: 'center', padding: '50px 40px', boxShadow: '0 20px 60px rgba(255, 90, 30, 0.2)' }}>
              <span style={{ fontSize: '5rem', display: 'block', margin: '0 auto 15px', animation: 'bounce 1s infinite' }}>🔥</span>
              <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2.5rem', color: '#FF5A1E', marginBottom: 15, lineHeight: 1.1 }}>{h.goalReached}</h2>
              <p style={{ color: 'var(--text)', fontSize: '1.1rem', lineHeight: 1.6, marginBottom: 10 }}>{h.fcGoalText}</p>
              <p style={{ color: 'var(--muted)', fontSize: '0.95rem', marginBottom: 30 }}>{h.streakBefore} <strong>{userData?.currentStreak || 0} {h.days}</strong>{h.streakAfter}</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button onClick={() => setShowGoalModal(false)} style={{ padding: '16px 28px', background: '#FF5A1E', color: '#fff', border: 'none', borderRadius: 999, fontWeight: 800, fontSize: '1.1rem', width: '100%', cursor: 'pointer', transition: '0.2s' }}>{h.fcKeepStudying}</button>
                <button onClick={() => { setShowGoalModal(false); navigate('/'); }} style={{ padding: '16px 28px', background: 'transparent', border: '1px solid var(--line)', color: 'var(--text)', borderRadius: 999, fontWeight: 800, fontSize: '1.1rem', width: '100%', cursor: 'pointer', transition: '0.2s' }}>{h.fcBackHome}</button>
              </div>
            </div>
          </div>
        )}

        {showCompleteModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(20, 10, 20, 0.85)', backdropFilter: 'blur(12px)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <div style={{ background: 'var(--paper)', width: '100%', maxWidth: 450, borderRadius: 28, overflow: 'hidden', position: 'relative', border: '1px solid var(--plum)', textAlign: 'center', padding: '50px 40px', boxShadow: '0 20px 60px rgba(138, 124, 255, 0.2)' }}>
              <span style={{ fontSize: '5rem', display: 'block', margin: '0 auto 15px', animation: 'bounce 1s infinite' }}>🎉</span>
              <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2.5rem', color: 'var(--plum)', marginBottom: 15, lineHeight: 1.1 }}>{h.fcReviewDone}</h2>
              <p style={{ color: 'var(--text)', fontSize: '1.1rem', lineHeight: 1.6, marginBottom: 30 }}>{showCompleteModal}</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button onClick={() => setShowCompleteModal(null)} style={{ padding: '16px 28px', background: 'var(--plum)', color: '#fff', border: 'none', borderRadius: 999, fontWeight: 800, fontSize: '1.1rem', width: '100%', cursor: 'pointer', transition: '0.2s' }}>{h.fcKeepStudying}</button>
                <button onClick={() => { setShowCompleteModal(null); navigate('/'); }} style={{ padding: '16px 28px', background: 'transparent', border: '1px solid var(--line)', color: 'var(--text)', borderRadius: 999, fontWeight: 800, fontSize: '1.1rem', width: '100%', cursor: 'pointer', transition: '0.2s' }}>{h.fcBackHome}</button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 50, color: 'var(--muted)' }}>{h.fcLoading}</div>
        ) : (
          <>
            {view === 'list' && (
              <div>
                <style>{'.deck-card:hover { transform: translateY(-4px); border-color: var(--amber) !important; } .review-hero { transition: 0.25s; } .review-hero:hover { transform: translateY(-3px); }'}</style>
                {!gamePlaying && (() => {
                  const reviewDeck = studentDecks.find(d => d.id === 'daily_review_deck');
                  const hardDeck = studentDecks.find(d => d.id === 'difficult_words_deck');
                  return (
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
                  );
                })()}

                <GamesSection onPlayingChange={setGamePlaying} />

                {!gamePlaying && (() => {
                  const regularDecks = studentDecks.filter(d => !d.isSpecial);
                  return (
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
                          {regularDecks.map(deck => (
                            <button
                              key={deck.id}
                              onClick={() => handleDeckClick(deck)}
                              className="deck-card"
                              style={{ background: 'var(--paper)', border: '1px solid var(--line)', padding: '22px 22px 18px', borderRadius: 22, textAlign: 'left', cursor: 'pointer', transition: '0.25s', display: 'flex', flexDirection: 'column', gap: 6 }}
                            >
                              <span style={{ fontSize: '1.7rem' }}>{deck.id === 'custom_words_deck' ? '📝' : (deck.icon || '🗂️')}</span>
                              <h3 style={{ fontSize: '1.15rem', margin: '4px 0 0', color: 'var(--text)', lineHeight: 1.25 }}>{deck.title}</h3>
                              {deck.description && <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.85rem' }}>{deck.description}</p>}
                              <span style={{ marginTop: 'auto', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ background: 'var(--cream)', padding: '4px 10px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--plum)' }}>{h.cardsCount(deck.words.length)}</span>
                                <span style={{ color: 'var(--amber)', fontWeight: 800 }}>→</span>
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })()}

              </div>
            )}

            {view === 'mode_select' && selectedDeck && (
              <div style={{ textAlign: 'center', maxWidth: 800, margin: '0 auto' }}>
                <span style={{ fontSize: '0.8rem', background: 'var(--cream)', color: 'var(--muted)', padding: '4px 12px', borderRadius: 99, fontWeight: 'bold', textTransform: 'uppercase' }}>
                  {h.fcSelectedDeck}
                </span>
                <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2.5rem', color: 'var(--text)', margin: '15px 0 10px' }}>
                  {selectedDeck.title}
                </h2>
                <p style={{ color: 'var(--muted)', marginBottom: 40 }}>{h.fcHowStudy}</p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
                  <button onClick={() => startGame('classic')} style={{ background: 'var(--paper)', padding: 30, borderRadius: 24, border: '1px solid var(--line)', cursor: 'pointer', transition: '0.2s', textAlign: 'left' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--plum)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--line)'}>
                    <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: 15 }}>🃏</span>
                    <h3 style={{ margin: '0 0 5px', color: 'var(--text)' }}>{h.modeClassic}</h3>
                    <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.85rem' }}>{h.modeClassicText}</p>
                  </button>
                  
                  <button onClick={() => startGame('multiple')} style={{ background: 'var(--paper)', padding: 30, borderRadius: 24, border: '1px solid var(--line)', cursor: 'pointer', transition: '0.2s', textAlign: 'left' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--plum)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--line)'}>
                    <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: 15 }}>🎯</span>
                    <h3 style={{ margin: '0 0 5px', color: 'var(--text)' }}>{h.modeMultiple}</h3>
                    <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.85rem' }}>{h.modeMultipleText}</p>
                  </button>
                  
                  <button onClick={() => startGame('match')} style={{ background: 'var(--paper)', padding: 30, borderRadius: 24, border: '1px solid var(--line)', cursor: 'pointer', transition: '0.2s', textAlign: 'left' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--plum)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--line)'}>
                    <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: 15 }}>🧩</span>
                    <h3 style={{ margin: '0 0 5px', color: 'var(--text)' }}>{h.modeMatch}</h3>
                    <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.85rem' }}>{h.modeMatchText}</p>
                  </button>
                  
                  <button onClick={() => startGame('written')} style={{ background: 'var(--paper)', padding: 30, borderRadius: 24, border: '1px solid var(--line)', cursor: 'pointer', transition: '0.2s', textAlign: 'left' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--plum)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--line)'}>
                    <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: 15 }}>✍️</span>
                    <h3 style={{ margin: '0 0 5px', color: 'var(--text)' }}>{h.modeWritten}</h3>
                    <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.85rem' }}>{h.modeWrittenText}</p>
                  </button>

                  <button onClick={() => startGame('speed')} style={{ background: 'var(--paper)', padding: 30, borderRadius: 24, border: '1px solid var(--line)', cursor: 'pointer', transition: '0.2s', textAlign: 'left' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--plum)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--line)'}>
                    <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: 15 }}>⚡</span>
                    <h3 style={{ margin: '0 0 5px', color: 'var(--text)' }}>{h.srTitle}</h3>
                    <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.85rem' }}>{h.srText}</p>
                  </button>
                </div>
              </div>
            )}

            {view === 'playing' && finishing && (
              <div style={{ textAlign: 'center', padding: 50, color: 'var(--muted)' }}>{h.fcSaving}</div>
            )}

            {view === 'playing' && !finishing && selectedMode === 'classic' && (
              <ClassicMode deck={selectedDeck} onFinish={handleFinish} />
            )}
            
            {view === 'playing' && !finishing && selectedMode === 'multiple' && (
              <MultipleChoiceMode deck={selectedDeck} globalWords={globalWords} onFinish={handleFinish} />
            )}
            
            {view === 'playing' && !finishing && selectedMode === 'match' && (
              <MatchMode deck={selectedDeck} onFinish={handleFinish} />
            )}
            
            {view === 'playing' && !finishing && selectedMode === 'written' && (
              <WrittenMode deck={selectedDeck} onFinish={handleFinish} />
            )}

            {view === 'playing' && !finishing && selectedMode === 'speed' && (
              <SpeedRoundMode deck={selectedDeck} globalWords={globalWords} onFinish={handleFinish} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
