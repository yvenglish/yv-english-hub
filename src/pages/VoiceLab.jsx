import { useState, useEffect, useMemo } from 'react';
import { db } from '../config/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import VoiceLabPlayer from '../components/voice-lab/VoiceLabPlayer';

export default function VoiceLab() {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        const snap = await getDocs(collection(db, 'voice_lab_challenges'));
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setChallenges(data);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchChallenges();
  }, []);

  const completed = userData?.voiceLabProgress || [];

  const handleFilter = (f) => setFilter(f);

  const filteredChallenges = useMemo(() => {
    let result = challenges.filter(c => {
      // Search
      if (search && !c.title.toLowerCase().includes(search.toLowerCase()) && !(c.description || '').toLowerCase().includes(search.toLowerCase())) return false;
      
      // Tabs
      if (filter === 'all') return true;
      if (filter === 'completed') return completed.includes(c.id);
      return c.level.toLowerCase().replace(' ', '-') === filter;
    });

    // Sort chronologically (newest first)
    result.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return result;
  }, [challenges, search, filter, completed]);

  if (selectedChallenge) {
    return (
      <VoiceLabPlayer 
        challenge={selectedChallenge} 
        onBack={() => {
          setSelectedChallenge(null);
        }} 
      />
    );
  }

  return (
    <div style={{ padding: '40px 20px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <p className="eyebrow">YV English — Voice Lab</p>
        <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: '3rem', color: 'var(--text)', margin: '10px 0' }}>Listen, Remember & Repeat</h1>
        <h2 style={{ fontSize: '1.5rem', color: 'var(--muted)', fontWeight: 400 }}>Speaking Practice <span style={{ color: 'var(--purple)', fontStyle: 'italic' }}>& Pronunciation</span></h2>
      </div>

      {/* Busca e Filtros */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 40 }}>
        <input 
          type="search"
          placeholder="Pesquisar desafios, diálogos, temas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', maxWidth: 500, margin: '0 auto', padding: '14px 20px', borderRadius: 99, border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--text)', fontSize: '1rem', outline: 'none' }}
        />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
          {['all', 'completed', 'easy-peasy', 'easy', 'medium', 'hard'].map(f => {
            const isActive = filter === f;
            let label = f.charAt(0).toUpperCase() + f.slice(1).replace('-', ' ');
            if (f === 'all') label = 'Todos';
            if (f === 'completed') label = 'Concluídos 🏆';
            if (f === 'easy-peasy') label = 'Easy Peasy';
            
            return (
              <button
                key={f}
                onClick={() => handleFilter(f)}
                style={{
                  padding: '8px 16px', borderRadius: 99, border: `1px solid ${isActive ? 'var(--purple)' : 'var(--line)'}`,
                  background: isActive ? 'var(--purple)' : 'var(--paper)', color: isActive ? '#fff' : 'var(--text)',
                  cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem', transition: '0.2s'
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Grid de Desafios */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--muted)' }}>Carregando desafios...</div>
      ) : filteredChallenges.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--muted)' }}>Nenhum desafio encontrado.</div>
      ) : (
        <div className="episode-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {filteredChallenges.map(c => {
            const isDone = completed.includes(c.id);
            
            return (
              <div 
                key={c.id}
                style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: '0.2s' }}
                onClick={() => setSelectedChallenge(c)}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                {/* Imagem com Overlay */}
                <div style={{ position: 'relative', width: '100%', height: 160, background: '#111' }}>
                  {c.coverImageUrl ? (
                    <img src={c.coverImageUrl} alt={c.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--paper), var(--bg))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '3rem', opacity: 0.2 }}>🎙️</span>
                    </div>
                  )}
                  
                  {/* Gradiente */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.8))' }}></div>
                  
                  {/* Badges Absolute */}
                  <span style={{ position: 'absolute', top: 12, left: 12, fontSize: '0.7rem', background: 'var(--purple)', color: '#fff', padding: '2px 8px', borderRadius: 99, fontWeight: 'bold', textTransform: 'uppercase', zIndex: 2 }}>
                    {c.level}
                  </span>
                  
                  <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8, zIndex: 2, background: 'rgba(0,0,0,0.4)', padding: '2px 8px', borderRadius: 99 }}>
                    <span style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 'bold' }}>{c.lines?.length || 0} Linhas</span>
                  </div>

                  {isDone && (
                    <div style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 2, background: 'var(--purple)', padding: '2px 8px', borderRadius: 99 }}>
                      <span style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 'bold' }}>Concluído 🏆</span>
                    </div>
                  )}
                </div>

                <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ margin: '0 0 10px', fontSize: '1.2rem', color: 'var(--text)', lineHeight: 1.3 }}>{c.title}</h3>
                  <p style={{ margin: '0 0 15px', color: 'var(--muted)', fontSize: '0.9rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1 }}>{c.description}</p>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 'auto' }}>
                    {(c.tags || []).slice(0,3).map(tag => (
                      <span key={tag} style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 6, color: 'var(--muted)' }}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
}
