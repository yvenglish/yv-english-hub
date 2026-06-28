import { useState, useEffect } from 'react';
import { LEVELS } from '../data/libraryData';
import { db } from '../config/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import EpisodePlayer from '../components/library/EpisodePlayer';

export default function Library() {
  const { userData, toggleLibraryFavorite, toggleLibraryProgress } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEpisodes = async () => {
      try {
        const snap = await getDocs(collection(db, 'library_episodes'));
        setEpisodes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchEpisodes();
  }, []);

  // Read location state for global search selection
  useEffect(() => {
    if (location.state?.openEpisodeId && episodes.length > 0) {
      const targetEp = episodes.find(e => e.id === location.state.openEpisodeId);
      if (targetEp) {
        setSelectedEpisode(targetEp);
        // Clean up state so a refresh doesn't reopen it
        navigate('.', { replace: true, state: {} });
      }
    }
  }, [location.state, episodes, navigate]);

  const favorites = userData?.libraryFavorites || [];
  const completed = userData?.libraryProgress || [];

  const handleFilter = (f) => setFilter(f);

  const filteredEpisodes = episodes.filter(ep => {
    // Search
    if (search && !ep.title.toLowerCase().includes(search.toLowerCase())) return false;
    
    // Tabs
    if (filter === 'all') return true;
    if (filter === 'favorites') return favorites.includes(ep.id);
    if (filter === 'grammar') return ep.type === 'Grammar' || ep.tags?.includes('Grammar');
    return ep.level === filter;
  });

  if (selectedEpisode) {
    return (
      <EpisodePlayer 
        episode={selectedEpisode} 
        onBack={() => setSelectedEpisode(null)} 
        isFavorite={favorites.includes(selectedEpisode.id)}
        isCompleted={completed.includes(selectedEpisode.id)}
        onToggleFavorite={() => toggleLibraryFavorite(selectedEpisode.id)}
        onToggleProgress={() => toggleLibraryProgress(selectedEpisode.id)}
      />
    );
  }

  return (
    <div style={{ padding: '40px 20px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <p className="eyebrow">YV English — Language Academy & Method</p>
        <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: '3rem', color: 'var(--text)', margin: '10px 0' }}>YV Input Library</h1>
        <h2 style={{ fontSize: '1.5rem', color: 'var(--muted)', fontWeight: 400 }}>Listening Practice <span style={{ color: 'var(--amber)', fontStyle: 'italic' }}>& Real English</span></h2>
      </div>

      {/* Busca e Filtros */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 40 }}>
        <input 
          type="search"
          placeholder="Pesquisar episódios, gramática, temas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', maxWidth: 500, margin: '0 auto', padding: '14px 20px', borderRadius: 99, border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--text)', fontSize: '1rem', outline: 'none' }}
        />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
          {['all', 'favorites', 'grammar', 'easy-peasy', 'easy', 'medium', 'hard'].map(f => {
            const isActive = filter === f;
            let label = f.charAt(0).toUpperCase() + f.slice(1).replace('-', ' ');
            if (f === 'all') label = 'Todos';
            if (f === 'favorites') label = 'Favoritos ❤️';
            if (f === 'grammar') label = 'Grammar Lab 🧪';
            
            return (
              <button
                key={f}
                onClick={() => handleFilter(f)}
                style={{
                  padding: '8px 16px', borderRadius: 99, border: `1px solid ${isActive ? 'var(--plum)' : 'var(--line)'}`,
                  background: isActive ? 'var(--plum)' : 'var(--paper)', color: isActive ? '#fff' : 'var(--text)',
                  cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem', transition: '0.2s'
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Grid de Episódios */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--muted)' }}>Carregando episódios...</div>
      ) : filteredEpisodes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--muted)' }}>Nenhum conteúdo encontrado.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {filteredEpisodes.map(ep => {
            const isFav = favorites.includes(ep.id);
            const isDone = completed.includes(ep.id);
            
            return (
              <div 
                key={ep.id}
                style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: '0.2s' }}
                onClick={() => setSelectedEpisode(ep)}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ background: 'var(--cream)', padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.7rem', background: 'var(--plum)', color: '#fff', padding: '2px 8px', borderRadius: 99, fontWeight: 'bold', textTransform: 'uppercase' }}>
                    {ep.level}
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {isFav && <span>❤️</span>}
                    {isDone && <span>✅</span>}
                  </div>
                </div>
                <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ margin: '0 0 10px', fontSize: '1.2rem', color: 'var(--text)', lineHeight: 1.3 }}>{ep.title}</h3>
                  <p style={{ margin: '0 0 15px', color: 'var(--muted)', fontSize: '0.9rem', flex: 1 }}>{ep.summary?.pt || ''}</p>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 'auto' }}>
                    {(ep.tags || []).slice(0,3).map(tag => (
                      <span key={tag} style={{ fontSize: '0.7rem', background: 'var(--bg)', border: '1px solid var(--line)', padding: '2px 6px', borderRadius: 6, color: 'var(--muted)' }}>
                        {tag}
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
