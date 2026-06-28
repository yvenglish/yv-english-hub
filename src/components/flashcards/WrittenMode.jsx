import { useState, useRef, useEffect } from 'react';

export default function WrittenMode({ deck, onFinish }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [status, setStatus] = useState('typing'); // 'typing', 'correct', 'wrong'
  const [score, setScore] = useState(0);
  const inputRef = useRef(null);

  const currentCard = deck.words[currentIndex];

  useEffect(() => {
    if (status === 'typing' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentIndex, status]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim() || status !== 'typing') return;

    const isMatch = inputValue.trim().toLowerCase() === currentCard.term.toLowerCase();
    
    if (isMatch) {
      setStatus('correct');
      setScore(s => s + 1);
      playAudio();
    } else {
      setStatus('wrong');
      playAudio(); // hear the correct word
    }
  };

  const handleNext = () => {
    setStatus('typing');
    setInputValue('');
    if (currentIndex < deck.words.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onFinish({ score: score + (status === 'correct' ? 1 : 0), total: deck.words.length });
    }
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
        <span>Revisão Escrita</span>
        <span>{currentIndex + 1} / {deck.words.length}</span>
      </div>

      <div style={{ 
        background: 'var(--paper)', borderRadius: 24, padding: '40px 30px', 
        border: `2px solid ${status === 'correct' ? '#2D7158' : status === 'wrong' ? '#9D2828' : 'var(--line)'}`, 
        textAlign: 'center', marginBottom: 20, transition: '0.3s'
      }}>
        {currentCard.imageUrl && (
          <img src={currentCard.imageUrl} alt="" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 16, marginBottom: 20, display: 'block', margin: '0 auto 20px' }} />
        )}
        
        <p style={{ color: 'var(--muted)', margin: '0 0 10px', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 'bold' }}>Traduza para o inglês</p>
        <h2 style={{ fontSize: '2.5rem', margin: '0 0 30px', fontFamily: '"Playfair Display", serif', color: 'var(--text)' }}>
          {currentCard.translation}
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            disabled={status !== 'typing'}
            placeholder="Digite em inglês..."
            style={{ 
              width: '100%', padding: '16px', borderRadius: 12, 
              border: '2px solid var(--line)', fontSize: '1.2rem', textAlign: 'center',
              background: status === 'correct' ? '#EAF7F1' : status === 'wrong' ? '#FDEBEB' : 'var(--bg)',
              color: status === 'correct' ? '#2D7158' : status === 'wrong' ? '#9D2828' : 'var(--text)'
            }}
          />
          
          {status === 'typing' ? (
            <button type="submit" style={{ padding: '16px', background: 'var(--plum)', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer' }}>
              Verificar
            </button>
          ) : (
            <div style={{ animation: 'fadeIn 0.3s' }}>
              {status === 'wrong' && (
                <div style={{ marginBottom: 15, padding: 15, background: '#FDEBEB', color: '#9D2828', borderRadius: 12, fontWeight: 'bold' }}>
                  A resposta correta é: <span style={{ fontSize: '1.2rem', display: 'block', marginTop: 5 }}>{currentCard.term}</span>
                </div>
              )}
              <button type="button" onClick={handleNext} style={{ width: '100%', padding: '16px', background: status === 'correct' ? '#2D7158' : '#9D2828', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer' }}>
                Continuar →
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
