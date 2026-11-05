import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UI_TEXTS } from '../../data/uiTexts';

export default function MatchMode({ deck, onFinish }) {
  const { activeCourseInfo, activeCourse, updateFlashcardProgress } = useAuth();
  const h = UI_TEXTS[activeCourse];
  const [cards, setCards] = useState([]);
  const [selectedOne, setSelectedOne] = useState(null);
  const [matchedIds, setMatchedIds] = useState([]);
  const [isWrong, setIsWrong] = useState(false);
  const missedIds = useRef(new Set()); // palavras que o aluno errou pelo menos uma vez
  
  // Divide o deck em etapas de até 6 pares, com tamanhos equilibrados
  // (7 palavras viram 4 + 3, nunca 6 + 1)
  const [chunkIndex, setChunkIndex] = useState(0);
  const MAX_PAIRS = 6;
  const chunks = useMemo(() => {
    const words = deck.words;
    const count = Math.max(1, Math.ceil(words.length / MAX_PAIRS));
    const base = Math.floor(words.length / count);
    const extra = words.length % count;
    const result = [];
    let start = 0;
    for (let i = 0; i < count; i++) {
      const size = base + (i < extra ? 1 : 0);
      result.push(words.slice(start, start + size));
      start += size;
    }
    return result;
  }, [deck]);
  const pairsBefore = chunks.slice(0, chunkIndex).reduce((sum, c) => sum + c.length, 0);
  
  useEffect(() => {
    loadChunk();
  }, [chunkIndex, deck]);

  const loadChunk = () => {
    const chunkWords = chunks[chunkIndex] || [];
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
        u.lang = activeCourseInfo.speechLang;
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
        updateFlashcardProgress(card.id, missedIds.current.has(card.id) ? 1 : 2);
        
        // Check if chunk is finished
        if (newMatched.length === chunks[chunkIndex].length) {
          setTimeout(() => {
            setChunkIndex(c => c + 1);
          }, 800);
        }
      } else {
        // Wrong match
        missedIds.current.add(selectedOne.id);
        missedIds.current.add(card.id);
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
      <style>{`
        .match-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 15px;
        }
        .match-card {
          padding: 20px 10px;
          border-radius: 16px;
          min-height: 120px;
          font-size: 1.05rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          text-align: center;
          word-break: break-word;
          line-height: 1.2;
        }
        .match-card img {
          width: 40px;
          height: 40px;
          object-fit: cover;
          border-radius: 8px;
          margin-bottom: 10px;
        }
        @media (max-width: 600px) {
          .match-grid {
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
            gap: 8px;
          }
          .match-card {
            padding: 10px 5px;
            border-radius: 12px;
            min-height: 80px;
            font-size: 0.85rem;
          }
          .match-card img {
            width: 30px;
            height: 30px;
            margin-bottom: 5px;
          }
        }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, color: 'var(--muted)' }}>
        <span>{h.modeMatch}</span>
        <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
          <span>{h.stageOf(chunkIndex + 1, chunks.length)}</span>
          <button onClick={() => onFinish({ earlyExit: true, studiedCount: pairsBefore })} style={{ background: 'none', border: 'none', color: 'var(--plum)', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>{h.exit}</button>
        </div>
      </div>

      <div className="match-grid">
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
              className="match-card"
              onClick={() => handleCardClick(card, idx)}
              disabled={isMatched}
              style={{
                background: bgColor, border: `2px solid ${borderColor}`, color: textColor,
                cursor: isMatched ? 'default' : 'pointer',
                transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                opacity, transform, boxShadow: isSelected ? '0 10px 20px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              {card.img && card.type === 'term' && (
                <img src={card.img} alt="" />
              )}
              {card.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
