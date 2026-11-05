import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

import ClassicMode from '../components/flashcards/ClassicMode';
import MultipleChoiceMode from '../components/flashcards/MultipleChoiceMode';
import MatchMode from '../components/flashcards/MatchMode';
import WrittenMode from '../components/flashcards/WrittenMode';
import { inCourse } from '../data/courses';
import { UI_TEXTS } from '../data/uiTexts';

export default function Flashcards() {
  const navigate = useNavigate();
  const { currentUser, userData, recordStudy, getDueFlashcards, activeCourse } = useAuth();
  const h = UI_TEXTS[activeCourse];

  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list', 'mode_select', 'playing'
  
  const [studentDecks, setStudentDecks] = useState([]);
  const [globalWords, setGlobalWords] = useState([]);
  
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [selectedMode, setSelectedMode] = useState('');

  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(null); // stores the completion message

  useEffect(() => {
    if (currentUser) {
      if (userData?.plan === 'Foundation') {
        navigate('/');
        return;
      }
      loadData();
    }
  }, [currentUser, userData, navigate, activeCourse]);

  const loadData = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'vocab_assignments'), where('studentId', '==', currentUser.uid));
      
      const [wordsSnap, decksSnap, assignSnap, dueFlashcards] = await Promise.all([
        getDocs(collection(db, 'vocabulary_global')),
        getDocs(collection(db, 'decks')),
        getDocs(q),
        getDueFlashcards()
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

      // 5. Fetch Daily Review (Spaced Repetition)
      if (dueFlashcards.length > 0) {
        const dueWords = dueFlashcards.map(df => allWords.find(w => w.id === df.wordId)).filter(Boolean);
        if (dueWords.length > 0) {
          builtDecks.unshift({
            id: 'daily_review_deck',
            title: h.fcReviewTitle,
            description: h.fcReviewDesc,
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

    if (userData && cardsStudied > 0) {
      const { goalJustReached } = await recordStudy(cardsStudied);
      isGoalReached = goalJustReached;
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
                <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2.5rem', color: 'var(--text)', marginBottom: 30 }}>
                  {h.fcMyDecks}
                </h2>
                
                {studentDecks.length === 0 ? (
                  <div style={{ background: 'var(--paper)', padding: 40, borderRadius: 24, textAlign: 'center', border: '1px dashed var(--line)' }}>
                    <span style={{ fontSize: '3rem', display: 'block', marginBottom: 15 }}>📭</span>
                    <h3 style={{ margin: '0 0 10px' }}>{h.fcNoMaterial}</h3>
                    <p style={{ color: 'var(--muted)', margin: 0 }}>{h.fcNoMaterialText}</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                    {studentDecks.map(deck => (
                      <button
                        key={deck.id}
                        onClick={() => handleDeckClick(deck)}
                        style={{
                          background: 'var(--paper)', border: '1px solid var(--line)', padding: 30,
                          borderRadius: 24, textAlign: 'left', cursor: 'pointer',
                          transition: '0.3s', display: 'flex', flexDirection: 'column'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                      >
                        <span style={{ fontSize: '2rem', marginBottom: 15 }}>{deck.id === 'daily_review_deck' ? '🔥' : deck.id === 'custom_words_deck' ? '📝' : (deck.icon || '🗂️')}</span>
                        <h3 style={{ fontSize: '1.4rem', margin: '0 0 10px', color: 'var(--text)' }}>{deck.title}</h3>
                        {deck.description && <p style={{ margin: '0 0 15px', color: 'var(--muted)', fontSize: '0.9rem' }}>{deck.description}</p>}
                        <div style={{ marginTop: 'auto', display: 'inline-block', background: 'var(--cream)', padding: '4px 12px', borderRadius: 99, fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--plum)' }}>
                          {deck.words.length} cartas
                        </div>
                      </button>
                    ))}
                  </div>
                )}
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
          </>
        )}
      </main>
    </div>
  );
}
