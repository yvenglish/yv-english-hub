import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

import ClassicMode from '../components/flashcards/ClassicMode';
import MultipleChoiceMode from '../components/flashcards/MultipleChoiceMode';
import MatchMode from '../components/flashcards/MatchMode';
import WrittenMode from '../components/flashcards/WrittenMode';

export default function Flashcards() {
  const navigate = useNavigate();
  const { currentUser, userData, recordStudy } = useAuth();

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
  }, [currentUser, userData, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Global Words
      const wordsSnap = await getDocs(collection(db, 'vocabulary_global'));
      const allWords = wordsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setGlobalWords(allWords);

      // 2. Fetch Decks
      const decksSnap = await getDocs(collection(db, 'decks'));
      const allDecks = decksSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // 3. Fetch Assignments for this student
      const q = query(collection(db, 'vocab_assignments'), where('studentId', '==', currentUser.uid));
      const assignSnap = await getDocs(q);
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
          title: 'Minhas Palavras Soltas',
          description: 'Palavras avulsas que a teacher separou para você.',
          words: uniqueCustom
        });
      }

      setStudentDecks(builtDecks);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleDeckClick = (deck) => {
    if (deck.words.length === 0) return alert('Este deck está vazio!');
    setSelectedDeck(deck);
    setView('mode_select');
  };

  const startGame = (mode) => {
    setSelectedMode(mode);
    setView('playing');
  };
  const handleFinish = async (result) => {
    let msg = 'Revisão Concluída!';
    let isGoalReached = false;

    if (result) {
      msg = "Você acertou " + result.score + " de " + result.total + ".";
    }

    if (userData) {
      isGoalReached = await recordStudy(selectedDeck.words.length);
    }

    setView('list');
    setSelectedDeck(null);
    setSelectedMode('');

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
              <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2.5rem', color: '#FF5A1E', marginBottom: 15, lineHeight: 1.1 }}>Meta Atingida!</h2>
              <p style={{ color: 'var(--text)', fontSize: '1.1rem', lineHeight: 1.6, marginBottom: 10 }}>Parabéns! Você revisou suas palavras de hoje e aumentou sua ofensiva.</p>
              <p style={{ color: 'var(--muted)', fontSize: '0.95rem', marginBottom: 30 }}>Você está em um streak de <strong>{userData?.currentStreak || 0} dias</strong>. Continue assim!</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button onClick={() => setShowGoalModal(false)} style={{ padding: '16px 28px', background: '#FF5A1E', color: '#fff', border: 'none', borderRadius: 999, fontWeight: 800, fontSize: '1.1rem', width: '100%', cursor: 'pointer', transition: '0.2s' }}>Continuar Estudando</button>
                <button onClick={() => { setShowGoalModal(false); navigate('/'); }} style={{ padding: '16px 28px', background: 'transparent', border: '1px solid var(--line)', color: 'var(--text)', borderRadius: 999, fontWeight: 800, fontSize: '1.1rem', width: '100%', cursor: 'pointer', transition: '0.2s' }}>Voltar para a Home</button>
              </div>
            </div>
          </div>
        )}

        {showCompleteModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(20, 10, 20, 0.85)', backdropFilter: 'blur(12px)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <div style={{ background: 'var(--paper)', width: '100%', maxWidth: 450, borderRadius: 28, overflow: 'hidden', position: 'relative', border: '1px solid var(--plum)', textAlign: 'center', padding: '50px 40px', boxShadow: '0 20px 60px rgba(138, 124, 255, 0.2)' }}>
              <span style={{ fontSize: '5rem', display: 'block', margin: '0 auto 15px', animation: 'bounce 1s infinite' }}>🎉</span>
              <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2.5rem', color: 'var(--plum)', marginBottom: 15, lineHeight: 1.1 }}>Revisão Concluída!</h2>
              <p style={{ color: 'var(--text)', fontSize: '1.1rem', lineHeight: 1.6, marginBottom: 30 }}>{showCompleteModal}</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button onClick={() => setShowCompleteModal(null)} style={{ padding: '16px 28px', background: 'var(--plum)', color: '#fff', border: 'none', borderRadius: 999, fontWeight: 800, fontSize: '1.1rem', width: '100%', cursor: 'pointer', transition: '0.2s' }}>Continuar Estudando</button>
                <button onClick={() => { setShowCompleteModal(null); navigate('/'); }} style={{ padding: '16px 28px', background: 'transparent', border: '1px solid var(--line)', color: 'var(--text)', borderRadius: 999, fontWeight: 800, fontSize: '1.1rem', width: '100%', cursor: 'pointer', transition: '0.2s' }}>Voltar para a Home</button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 50, color: 'var(--muted)' }}>Carregando seus flashcards...</div>
        ) : (
          <>
            {view === 'list' && (
              <div>
                <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2.5rem', color: 'var(--text)', marginBottom: 30 }}>
                  Seus Decks de Estudo
                </h2>
                
                {studentDecks.length === 0 ? (
                  <div style={{ background: 'var(--paper)', padding: 40, borderRadius: 24, textAlign: 'center', border: '1px dashed var(--line)' }}>
                    <span style={{ fontSize: '3rem', display: 'block', marginBottom: 15 }}>📭</span>
                    <h3 style={{ margin: '0 0 10px' }}>Nenhum material atribuído</h3>
                    <p style={{ color: 'var(--muted)', margin: 0 }}>Quando a teacher te enviar palavras ou decks, eles aparecerão aqui.</p>
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
                        <span style={{ fontSize: '2rem', marginBottom: 15 }}>{deck.id === 'custom_words_deck' ? '📝' : '🗂️'}</span>
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
                  Deck Selecionado
                </span>
                <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2.5rem', color: 'var(--text)', margin: '15px 0 10px' }}>
                  {selectedDeck.title}
                </h2>
                <p style={{ color: 'var(--muted)', marginBottom: 40 }}>Como você quer estudar hoje?</p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
                  <button onClick={() => startGame('classic')} style={{ background: 'var(--paper)', padding: 30, borderRadius: 24, border: '1px solid var(--line)', cursor: 'pointer', transition: '0.2s', textAlign: 'left' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--plum)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--line)'}>
                    <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: 15 }}>🃏</span>
                    <h3 style={{ margin: '0 0 5px', color: 'var(--text)' }}>Flashcard Clássico</h3>
                    <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.85rem' }}>Vire as cartas e autoavalie sua memória.</p>
                  </button>
                  
                  <button onClick={() => startGame('multiple')} style={{ background: 'var(--paper)', padding: 30, borderRadius: 24, border: '1px solid var(--line)', cursor: 'pointer', transition: '0.2s', textAlign: 'left' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--plum)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--line)'}>
                    <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: 15 }}>🎯</span>
                    <h3 style={{ margin: '0 0 5px', color: 'var(--text)' }}>Múltiplas Respostas</h3>
                    <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.85rem' }}>Encontre a tradução correta entre opções aleatórias.</p>
                  </button>
                  
                  <button onClick={() => startGame('match')} style={{ background: 'var(--paper)', padding: 30, borderRadius: 24, border: '1px solid var(--line)', cursor: 'pointer', transition: '0.2s', textAlign: 'left' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--plum)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--line)'}>
                    <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: 15 }}>🧩</span>
                    <h3 style={{ margin: '0 0 5px', color: 'var(--text)' }}>Combinar Cartões</h3>
                    <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.85rem' }}>Conecte a palavra em inglês com a sua tradução.</p>
                  </button>
                  
                  <button onClick={() => startGame('written')} style={{ background: 'var(--paper)', padding: 30, borderRadius: 24, border: '1px solid var(--line)', cursor: 'pointer', transition: '0.2s', textAlign: 'left' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--plum)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--line)'}>
                    <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: 15 }}>✍️</span>
                    <h3 style={{ margin: '0 0 5px', color: 'var(--text)' }}>Revisão Escrita</h3>
                    <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.85rem' }}>Pratique o spelling digitando a palavra em inglês.</p>
                  </button>
                </div>
              </div>
            )}

            {view === 'playing' && selectedMode === 'classic' && (
              <ClassicMode deck={selectedDeck} onFinish={handleFinish} />
            )}
            
            {view === 'playing' && selectedMode === 'multiple' && (
              <MultipleChoiceMode deck={selectedDeck} globalWords={globalWords} onFinish={handleFinish} />
            )}
            
            {view === 'playing' && selectedMode === 'match' && (
              <MatchMode deck={selectedDeck} onFinish={handleFinish} />
            )}
            
            {view === 'playing' && selectedMode === 'written' && (
              <WrittenMode deck={selectedDeck} onFinish={handleFinish} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
