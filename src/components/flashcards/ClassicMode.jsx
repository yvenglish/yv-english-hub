import { useState } from 'react';

export default function ClassicMode({ deck, onFinish }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);

  const handleFlip = () => setShowBack(!showBack);
  
  const handleNext = () => {
    setShowBack(false);
    if (currentIndex < deck.words.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onFinish();
    }
  };

  const currentCard = deck.words[currentIndex];

  const playAudio = () => {
    if ('speechSynthesis' in window) {
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
        <span>{currentIndex + 1} / {deck.words.length}</span>
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
          <button onClick={() => handleNext()} style={{ padding: '12px', borderRadius: 16, border: 'none', background: '#ff4d4d', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Errei</button>
          <button onClick={() => handleNext()} style={{ padding: '12px', borderRadius: 16, border: 'none', background: '#ff9933', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Difícil</button>
          <button onClick={() => handleNext()} style={{ padding: '12px', borderRadius: 16, border: 'none', background: '#4caf50', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Bom</button>
          <button onClick={() => handleNext()} style={{ padding: '12px', borderRadius: 16, border: 'none', background: '#2196f3', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Fácil</button>
        </div>
      )}
    </div>
  );
}
