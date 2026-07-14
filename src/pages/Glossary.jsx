import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../config/firebase';
import { collection, getDocs } from 'firebase/firestore';

export default function Glossary() {
  const { currentUser } = useAuth();
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (currentUser) {
      fetchGlossary();
    }
  }, [currentUser]);

  const fetchGlossary = async () => {
    try {
      const progressSnap = await getDocs(collection(db, `users/${currentUser.uid}/flashcard_progress`));
      const wordIds = progressSnap.docs.map(doc => doc.id);
      
      if (wordIds.length === 0) {
        setWords([]);
        setLoading(false);
        return;
      }

      const globalVocabSnap = await getDocs(collection(db, 'vocabulary_global'));
      const globalVocab = globalVocabSnap.docs.reduce((acc, doc) => {
        acc[doc.id] = doc.data();
        return acc;
      }, {});

      const matchedWords = wordIds
        .map(id => {
          const vocabData = globalVocab[id];
          if (vocabData && vocabData.term) {
            return {
              id,
              term: vocabData.term,
              translation: vocabData.translation,
              imageUrl: vocabData.imageUrl
            };
          }
          return null;
        })
        .filter(w => w !== null);

      matchedWords.sort((a, b) => a.term.localeCompare(b.term));
      setWords(matchedWords);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSpeak = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Seu navegador não suporta áudio nativo.");
    }
  };

  const filteredWords = words.filter(w => 
    w.term.toLowerCase().includes(searchTerm.toLowerCase()) || 
    w.translation.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedWords = filteredWords.reduce((acc, word) => {
    const firstLetter = word.term.charAt(0).toUpperCase();
    if (!acc[firstLetter]) acc[firstLetter] = [];
    acc[firstLetter].push(word);
    return acc;
  }, {});

  const sortedLetters = Object.keys(groupedWords).sort();

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px', minHeight: '80vh' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2.5rem', color: 'var(--plum)', marginBottom: 10 }}>📖 Meu Glossário</h1>
        <p style={{ color: 'var(--muted)', fontSize: '1.1rem' }}>
          O seu dicionário pessoal com todas as palavras que você já aprendeu.
        </p>
      </div>

      <div style={{ position: 'relative', marginBottom: 40 }}>
        <span style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', fontSize: '1.2rem', color: 'var(--amber)' }}>🔍</span>
        <input 
          type="text" 
          placeholder="Buscar palavra em inglês ou português..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '16px 20px 16px 50px',
            borderRadius: 99,
            border: '2px solid var(--line)',
            background: 'var(--paper)',
            color: 'var(--text)',
            fontSize: '1.1rem',
            outline: 'none',
            boxShadow: '0 8px 20px rgba(0,0,0,0.04)',
            transition: 'border-color 0.2s'
          }}
          onFocus={e => e.target.style.borderColor = 'var(--amber)'}
          onBlur={e => e.target.style.borderColor = 'var(--line)'}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Carregando glossário...</div>
      ) : words.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: 'var(--paper)', borderRadius: 24, border: '1px solid var(--line)' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: 20 }}>🌱</span>
          <h2 style={{ color: 'var(--plum)', marginBottom: 10 }}>Glossário Vazio</h2>
          <p style={{ color: 'var(--muted)' }}>Você ainda não recebeu nenhuma palavra. Continue estudando para desbloquear seu vocabulário!</p>
        </div>
      ) : sortedLetters.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Nenhuma palavra encontrada para "{searchTerm}".</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
          {sortedLetters.map(letter => (
            <div key={letter} style={{ background: 'var(--paper)', borderRadius: 24, border: '1px solid var(--line)', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
              <div style={{ background: 'var(--plum-light)', padding: '12px 24px', borderBottom: '1px solid var(--line)' }}>
                <h2 style={{ color: 'var(--plum)', margin: 0, fontFamily: '"Playfair Display", serif', fontSize: '1.8rem' }}>{letter}</h2>
              </div>
              <div>
                {groupedWords[letter].map((word, idx) => (
                  <div key={word.id} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '16px 24px', 
                    borderBottom: idx !== groupedWords[letter].length - 1 ? '1px solid var(--line)' : 'none',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                      <button 
                        onClick={() => handleSpeak(word.term)}
                        style={{
                          width: 40, height: 40, borderRadius: '50%', background: 'var(--amber-soft)', border: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center', color: '#6A4100', fontSize: '1.1rem', transition: 'transform 0.2s', boxShadow: '0 2px 8px rgba(200, 136, 58, 0.2)'
                        }}
                        className="hover-scale"
                        title={`Ouvir a pronúncia de ${word.term}`}
                      >
                        🔊
                      </button>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong style={{ fontSize: '1.2rem', color: 'var(--plum)' }}>{word.term}</strong>
                        <span style={{ fontSize: '0.95rem', color: 'var(--muted)' }}>{word.translation}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
