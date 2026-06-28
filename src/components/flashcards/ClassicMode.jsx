import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function ClassicMode({ deck, onFinish }) {
  const { updateFlashcardProgress } = useAuth();
  
  // Create a local state to allow appending cards that the user got wrong
  const [cards, setCards] = useState(deck.words);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);

  const handleFlip = () => setShowBack(!showBack);
  
  const handleNext = async (score) => {
    const currentCard = cards[currentIndex];
    
    // Save to Firestore SRS
    await updateFlashcardProgress(currentCard.id, score);

    setShowBack(false);
    
    let nextCards = cards;
    if (score === 0 && !currentCard.isRetry) {
      // Errou: adiciona a carta no final do array para rever ainda hoje (apenas uma vez)
      nextCards = [...cards, { ...currentCard, isRetry: true }];
      setCards(nextCards);
    }

    if (currentIndex < nextCards.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onFinish();
    }
  };

  const currentCard = cards[currentIndex];

  const playAudio = () => {
    if ('speechSynthesis' in window && currentCard) {
      const utterance = new SpeechSynthesisUtterance(currentCard.term);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  if (!currentCard) return null;

  return (
    <div style={{ width: 'min(100%, 500px)', perspective: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, color: 'var(--muted)' }}>
        <span>Flashcard Clássico</span>
        <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
          <span>{currentIndex + 1} / {cards.length}</span>
          <button onClick={() => onFinish({ earlyExit: true, studiedCount: currentIndex })} style={{ background: 'none', border: 'none', color: 'var(--plum)', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>Sair</button>
        </div>
      </div>

      <div 
        onClick={handleFlip}
        style={{
          width: '100%', minHeight: 350, background: 'var(--paper)', borderRadius: 30,
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          padding: 40, cursor: 'pointer', boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          border: '1px solid var(--line)', textAlign: 'center', position: 'relative'
        }}
      >
        <button 
          onClick={(e) => { e.stopPropagation(); playAudio(); }}
          style={{ position: 'absolute', top: 20, right: 20, background: 'var(--bg)', border: 'none', borderRadius: '50%', width: 40, height: 40, fontSize: '1.2rem', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
        >
          🔊
        </button>
        
        {showBack && currentCard.imageUrl && (
          <img src={currentCard.imageUrl} alt={currentCard.translation} style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 16, marginBottom: 20 }} />
        )}

        <h2 style={{ fontSize: '2rem', color: 'var(--text)', marginBottom: 20, fontFamily: '"Playfair Display", serif' }}>
          {showBack ? currentCard.translation : currentCard.term}
        </h2>
        
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
          {showBack ? 'Tradução' : 'Toque para virar'}
        </p>
      </div>

      {showBack && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 24 }}>
          <button onClick={() => handleNext(0)} style={{ padding: '12px', borderRadius: 16, border: 'none', background: '#ff4d4d', color: 'white', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>Errei</button>
          <button onClick={() => handleNext(1)} style={{ padding: '12px', borderRadius: 16, border: 'none', background: '#ff9933', color: 'white', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>Difícil</button>
          <button onClick={() => handleNext(2)} style={{ padding: '12px', borderRadius: 16, border: 'none', background: '#4caf50', color: 'white', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>Bom</button>
          <button onClick={() => handleNext(3)} style={{ padding: '12px', borderRadius: 16, border: 'none', background: '#2196f3', color: 'white', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>Fácil</button>
        </div>
      )}
    </div>
  );
}
