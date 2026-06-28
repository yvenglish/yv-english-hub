import { useState, useEffect } from 'react';

export default function MatchMode({ deck, onFinish }) {
  const [cards, setCards] = useState([]);
  const [selectedOne, setSelectedOne] = useState(null);
  const [matchedIds, setMatchedIds] = useState([]);
  const [isWrong, setIsWrong] = useState(false);
  
  // Break into chunks of 6 if deck is large
  const [chunkIndex, setChunkIndex] = useState(0);
  const CHUNK_SIZE = 6;
  
  useEffect(() => {
    loadChunk();
  }, [chunkIndex, deck]);

  const loadChunk = () => {
    const chunkWords = deck.words.slice(chunkIndex * CHUNK_SIZE, (chunkIndex + 1) * CHUNK_SIZE);
    if (chunkWords.length === 0) {
      onFinish();
      return;
    }
    
    // Create 2 cards per word (term and translation)
    const generated = [];
    chunkWords.forEach(w => {
      generated.push({ id: w.id, text: w.term, type: 'term', img: w.imageUrl });
      generated.push({ id: w.id, text: w.translation, type: 'trans' });
    });
    
    // Shuffle
    generated.sort(() => 0.5 - Math.random());
    setCards(generated);
    setMatchedIds([]);
    setSelectedOne(null);
  };

  const handleCardClick = (card, index) => {
    if (matchedIds.includes(card.id)) return;
    if (isWrong) return; // wait for animation
    
    if (!selectedOne) {
      setSelectedOne({ ...card, index });
      // play audio if it's english
      if (card.type === 'term' && 'speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(card.text);
        u.lang = 'en-US';
        window.speechSynthesis.speak(u);
      }
    } else {
      if (selectedOne.index === index) {
        // Deselect
        setSelectedOne(null);
        return;
      }
      
      if (selectedOne.id === card.id && selectedOne.type !== card.type) {
        // Match!
        const newMatched = [...matchedIds, card.id];
        setMatchedIds(newMatched);
        setSelectedOne(null);
        
        // Check if chunk is finished
        const chunkWords = deck.words.slice(chunkIndex * CHUNK_SIZE, (chunkIndex + 1) * CHUNK_SIZE);
        if (newMatched.length === chunkWords.length) {
          setTimeout(() => {
            setChunkIndex(c => c + 1);
          }, 800);
        }
      } else {
        // Wrong match
        setIsWrong(true);
        setTimeout(() => {
          setIsWrong(false);
          setSelectedOne(null);
        }, 800);
      }
    }
  };

  return (
    <div style={{ width: 'min(100%, 700px)', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, color: 'var(--muted)' }}>
        <span>Combinar Cartões</span>
        <span>Etapa {chunkIndex + 1} de {Math.ceil(deck.words.length / CHUNK_SIZE)}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 15 }}>
        {cards.map((card, idx) => {
          const isMatched = matchedIds.includes(card.id);
          const isSelected = selectedOne?.index === idx;
          const showWrong = isWrong && isSelected;
          
          let bgColor = 'var(--paper)';
          let borderColor = 'var(--line)';
          let textColor = 'var(--text)';
          let opacity = 1;
          let transform = 'scale(1)';

          if (isMatched) {
            bgColor = '#EAF7F1'; borderColor = '#2D7158'; textColor = '#2D7158';
            opacity = 0.5;
            transform = 'scale(0.95)';
          } else if (showWrong) {
            bgColor = '#FDEBEB'; borderColor = '#9D2828'; textColor = '#9D2828';
          } else if (isSelected) {
            bgColor = 'var(--plum-light)'; borderColor = 'var(--plum)'; textColor = 'var(--plum)';
            transform = 'scale(1.05)';
          }

          return (
            <button
              key={idx}
              onClick={() => handleCardClick(card, idx)}
              disabled={isMatched}
              style={{
                background: bgColor, border: `2px solid ${borderColor}`, color: textColor,
                padding: '20px 10px', borderRadius: 16, cursor: isMatched ? 'default' : 'pointer',
                fontWeight: 'bold', fontSize: '1.05rem', minHeight: 120,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                opacity, transform, boxShadow: isSelected ? '0 10px 20px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              {card.img && card.type === 'term' && (
                <img src={card.img} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8, marginBottom: 10 }} />
              )}
              {card.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
