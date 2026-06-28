import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function MultipleChoiceMode({ deck, globalWords, onFinish }) {
  const { updateFlashcardProgress } = useAuth();

  const [cards, setCards] = useState(deck.words);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [options, setOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [score, setScore] = useState(0);

  const currentCard = cards[currentIndex];

  useEffect(() => {
    if (currentCard) {
      generateOptions();
      setSelectedOption(null);
      setIsCorrect(null);
    }
  }, [currentIndex, currentCard]);

  const generateOptions = () => {
    // 1 Correct option
    const correct = currentCard.translation;
    
    // Pick 3 random wrong options from globalWords
    const wrongPool = globalWords.filter(w => w.id !== currentCard.id && w.translation !== correct);
    
    // Shuffle wrong pool
    const shuffledWrong = wrongPool.sort(() => 0.5 - Math.random());
    const selectedWrong = shuffledWrong.slice(0, 3).map(w => w.translation);
    
    // Pad if not enough words in global DB
    while (selectedWrong.length < 3) {
      selectedWrong.push(`Opção Extra ${selectedWrong.length + 1}`);
    }
    
    const allOptions = [correct, ...selectedWrong].sort(() => 0.5 - Math.random());
    setOptions(allOptions);
  };

  const handleSelect = async (opt) => {
    if (selectedOption) return; // Prevent double click
    setSelectedOption(opt);
    
    const isAnsCorrect = opt === currentCard.translation;
    
    // Save to SRS (Score 2 for correct in multiple choice, 0 for wrong)
    await updateFlashcardProgress(currentCard.id, isAnsCorrect ? 2 : 0);

    let nextCards = cards;
    if (isAnsCorrect) {
      setIsCorrect(true);
      setScore(s => s + 1);
    } else {
      setIsCorrect(false);
      // Errou: manda para o fim da fila (apenas uma vez)
      if (!currentCard.isRetry) {
        nextCards = [...cards, { ...currentCard, isRetry: true }];
        setCards(nextCards);
      }
    }
    
    setTimeout(() => {
      if (currentIndex < nextCards.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        onFinish({ score: score + (isAnsCorrect ? 1 : 0), total: cards.length });
      }
    }, 1500);
  };

  const playAudio = () => {
    if ('speechSynthesis' in window && currentCard) {
      const utterance = new SpeechSynthesisUtterance(currentCard.term);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  if (!currentCard) return null;

  return (
    <div style={{ width: 'min(100%, 600px)', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, color: 'var(--muted)' }}>
        <span>Múltiplas Respostas</span>
        <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
          <span>{currentIndex + 1} / {cards.length}</span>
          <button onClick={() => onFinish({ earlyExit: true, studiedCount: currentIndex })} style={{ background: 'none', border: 'none', color: 'var(--plum)', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>Sair</button>
        </div>
      </div>

      <div style={{ 
        background: 'var(--paper)', borderRadius: 24, padding: 30, 
        border: '1px solid var(--line)', textAlign: 'center', marginBottom: 20,
        position: 'relative'
      }}>
        <button 
          onClick={playAudio}
          style={{ position: 'absolute', top: 20, right: 20, background: 'var(--bg)', border: 'none', borderRadius: '50%', width: 40, height: 40, fontSize: '1.2rem', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
        >
          🔊
        </button>

        {currentCard.imageUrl && (
          <img src={currentCard.imageUrl} alt="Visual tip" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 16, marginBottom: 15, display: 'block', margin: '0 auto 15px' }} />
        )}
        
        <h2 style={{ fontSize: '2.2rem', margin: '0 0 10px', fontFamily: '"Playfair Display", serif', color: 'var(--text)' }}>
          {currentCard.term}
        </h2>
        <p style={{ color: 'var(--muted)', margin: 0 }}>Qual é a tradução correta?</p>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {options.map((opt, i) => {
          let bgColor = 'var(--paper)';
          let borderColor = 'var(--line)';
          let textColor = 'var(--text)';
          let icon = null;

          if (selectedOption) {
            if (opt === currentCard.translation) {
              bgColor = '#EAF7F1'; borderColor = '#2D7158'; textColor = '#2D7158'; icon = '✅';
            } else if (opt === selectedOption) {
              bgColor = '#FDEBEB'; borderColor = '#9D2828'; textColor = '#9D2828'; icon = '❌';
            } else {
              bgColor = 'var(--cream)'; textColor = 'var(--muted)';
            }
          }

          return (
            <button
              key={i}
              onClick={() => handleSelect(opt)}
              disabled={!!selectedOption}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '16px 20px', borderRadius: 16, background: bgColor,
                border: `1px solid ${borderColor}`, color: textColor,
                fontSize: '1.1rem', cursor: selectedOption ? 'default' : 'pointer',
                transition: '0.2s', textAlign: 'left', fontWeight: 'bold'
              }}
            >
              <span>{opt}</span>
              {icon && <span style={{ fontSize: '1.2rem' }}>{icon}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
