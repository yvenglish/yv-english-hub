import { useState, useEffect } from 'react';

export default function MultipleChoiceMode({ deck, globalWords, onFinish }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [options, setOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [score, setScore] = useState(0);

  const currentCard = deck.words[currentIndex];

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

  const handleSelect = (opt) => {
    if (selectedOption) return; // Prevent double click
    setSelectedOption(opt);
    
    if (opt === currentCard.translation) {
      setIsCorrect(true);
      setScore(s => s + 1);
    } else {
      setIsCorrect(false);
    }
    
    setTimeout(() => {
      if (currentIndex < deck.words.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        onFinish({ score: score + (opt === currentCard.translation ? 1 : 0), total: deck.words.length });
      }
    }, 1500);
  };

  const playAudio = () => {
    if ('speechSynthesis' in window) {
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
        <span>{currentIndex + 1} / {deck.words.length}</span>
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
