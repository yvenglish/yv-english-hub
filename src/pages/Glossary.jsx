import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { wordStatus } from '../data/srs';
import { UI_TEXTS } from '../data/uiTexts';

const STATUS_STYLE = {
  new: { background: 'rgba(138,143,184,0.15)', color: '#8a8fb8' },
  learning: { background: 'rgba(240,154,74,0.15)', color: '#F09A4A' },
  mastered: { background: 'rgba(46,213,115,0.15)', color: '#2ed573' }
};

export default function Glossary() {
  const { currentUser, activeCourse, activeCourseInfo } = useAuth();
  const h = UI_TEXTS[activeCourse];
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (currentUser) {
      fetchGlossary();
    }
  }, [currentUser, activeCourse]);

  // Todas as palavras que a teacher atribuiu (decks e palavras soltas), sem precisar estudar antes.
  // Cada uma mostra a situação: nova, aprendendo ou dominada.
  const fetchGlossary = async () => {
    try {
      const [assignSnap, decksSnap, vocabSnap, progressSnap] = await Promise.all([
        getDocs(query(collection(db, 'vocab_assignments'), where('studentId', '==', currentUser.uid))),
        getDocs(collection(db, 'decks')),
        getDocs(collection(db, 'vocabulary_global')),
        getDocs(collection(db, `users/${currentUser.uid}/flashcard_progress`))
      ]);

      const decks = Object.fromEntries(decksSnap.docs.map(d => [d.id, d.data()]));
      const assignedIds = new Set();
      assignSnap.docs.forEach(d => {
        const a = d.data();
        const ids = a.type === 'deck' ? decks[a.deckId]?.wordIds : a.wordIds;
        (ids || []).forEach(id => assignedIds.add(id));
      });
      // Palavras já estudadas por outros caminhos (ex.: "+ Flashcards" do Daily) também entram
      progressSnap.docs.forEach(d => assignedIds.add(d.id));
      const progress = Object.fromEntries(progressSnap.docs.map(d => [d.id, d.data()]));

      const matchedWords = vocabSnap.docs
        .filter(d => assignedIds.has(d.id))
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(w => w.term && (w.course || 'en') === activeCourse)
        .map(w => ({ id: w.id, term: w.term, translation: w.translation, imageUrl: w.imageUrl, status: wordStatus(progress[w.id]) }));

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
      utterance.lang = activeCourseInfo.speechLang;
      window.speechSynthesis.speak(utterance);
    } else {
      alert(h.noSpeech);
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
        <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2.5rem', color: 'var(--plum)', marginBottom: 10 }}>{h.glossaryTitle}</h1>
        <p style={{ color: 'var(--muted)', fontSize: '1.1rem' }}>
          {h.glossaryText}
        </p>
      </div>

      <div style={{ position: 'relative', marginBottom: 40 }}>
        <span style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', fontSize: '1.2rem', color: 'var(--amber)' }}>🔍</span>
        <input 
          type="text" 
          placeholder={h.glossarySearch} 
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
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>{h.glossaryLoading}</div>
      ) : words.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: 'var(--paper)', borderRadius: 24, border: '1px solid var(--line)' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: 20 }}>🌱</span>
          <h2 style={{ color: 'var(--plum)', marginBottom: 10 }}>{h.glossaryEmpty}</h2>
          <p style={{ color: 'var(--muted)' }}>{h.glossaryEmptyText}</p>
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
                        title={h.listenTo(word.term)}
                      >
                        🔊
                      </button>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong style={{ fontSize: '1.2rem', color: 'var(--plum)' }}>{word.term}</strong>
                        <span style={{ fontSize: '0.95rem', color: 'var(--muted)' }}>{word.translation}</span>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '4px 10px', borderRadius: 99, whiteSpace: 'nowrap', ...STATUS_STYLE[word.status] }}>
                      {word.status === 'mastered' ? h.glossMastered : word.status === 'learning' ? h.glossLearning : h.glossNew}
                    </span>
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
