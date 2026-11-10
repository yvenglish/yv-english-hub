import { useState, useEffect, useMemo } from 'react';
import { getLevelLabel } from '../data/courses';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import EpisodePlayer from '../components/library/EpisodePlayer';
import { getEpisodes, getCachedEpisodes } from '../services/libraryCache';


export default function Library() {
  const { userData, toggleLibraryFavorite, toggleLibraryProgress, syncLibraryLevels, activeCourse, activeCourseInfo } = useAuth();
  const t = activeCourseInfo.ui;
  const location = useLocation();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  
  const [episodes, setEpisodes] = useState(() => getCachedEpisodes() || []);
  const [loading, setLoading] = useState(() => !getCachedEpisodes());

  useEffect(() => {
    // Episódios do cache compartilhado (a home e o menu já podem ter carregado)
    getEpisodes()
      .then(setEpisodes)
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  // Read location state for global search selection
  useEffect(() => {
    if (location.state?.openEpisodeId && episodes.length > 0) {
      const targetEp = episodes.find(e => e.id === location.state.openEpisodeId);
      if (targetEp) {
        setSelectedEpisode(targetEp);
        window.scrollTo(0, 0); // Garante que o usuário veja o player no topo
      }
    }
  }, [location.state?.openEpisodeId, location.state?._t, episodes]);

  const favorites = userData?.libraryFavorites || [];
  const completed = userData?.libraryProgress || [];

  // Badges de nível para episódios concluídos antes de as badges existirem
  useEffect(() => {
    if (episodes.length === 0 || completed.length === 0) return;
    const levels = [...new Set(episodes.filter(ep => completed.includes(ep.id)).map(ep => ep.level))];
    syncLibraryLevels(levels);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episodes]);

  const handleFilter = (f) => setFilter(f);

  const filteredEpisodes = useMemo(() => {
    let result = episodes.filter(ep => {
      if ((ep.course || 'en') !== activeCourse) return false;
      // Search
      if (search && !ep.title.toLowerCase().includes(search.toLowerCase())) return false;
      
      // Tabs
      if (filter === 'all') return true;
      if (filter === 'favorites') return favorites.includes(ep.id);
      if (filter === 'grammar') return ep.type === 'Grammar' || ep.tags?.includes('Grammar');
      return ep.level === filter;
    });

    // Sort chronologically (newest first) for items that don't match the hardcoded priority
    result.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return result;
  }, [episodes, search, filter, favorites, activeCourse]);

  if (selectedEpisode) {
    return (
      <EpisodePlayer 
        episode={selectedEpisode} 
        onBack={() => {
          setSelectedEpisode(null);
          navigate(location.pathname, { replace: true, state: {} });
        }} 
        isFavorite={favorites.includes(selectedEpisode.id)}
        isCompleted={completed.includes(selectedEpisode.id)}
        onToggleFavorite={() => toggleLibraryFavorite(selectedEpisode.id)}
        onToggleProgress={() => toggleLibraryProgress(selectedEpisode.id, selectedEpisode.level)}
      />
    );
  }

  return (
    <div style={{ padding: '40px 20px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <p className="eyebrow">{t.libraryEyebrow}</p>
        <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: '3rem', color: 'var(--text)', margin: '10px 0' }}>{t.libraryTitle}</h1>
        <h2 style={{ fontSize: '1.5rem', color: 'var(--muted)', fontWeight: 400 }}>{t.librarySubtitle} <span style={{ color: 'var(--amber)', fontStyle: 'italic' }}>{t.librarySubtitleAccent}</span></h2>
      </div>

      {/* Busca e Filtros */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 40 }}>
        <input 
          type="search"
          placeholder={t.librarySearch}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', maxWidth: 500, margin: '0 auto', padding: '14px 20px', borderRadius: 99, border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--text)', fontSize: '1rem', outline: 'none' }}
        />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
          {['all', 'favorites', 'grammar', 'easy-peasy', 'easy', 'medium', 'hard'].map(f => {
            const isActive = filter === f;
            let label = getLevelLabel(f, activeCourse);
            if (f === 'all') label = t.all;
            if (f === 'favorites') label = t.favorites;
            if (f === 'grammar') label = t.grammar;
            
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
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--muted)' }}>{t.loadingEpisodes}</div>
      ) : filteredEpisodes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--muted)' }}>{t.noEpisodes}</div>
      ) : (
        <div className="episode-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
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
                {/* Imagem com Overlay */}
                <div style={{ position: 'relative', width: '100%', height: 160, background: '#333' }}>
                  {ep.imageUrl ? (
                    <img 
                      src={ep.imageUrl} 
                      alt={ep.title} 
                      loading="lazy" 
                      onError={(e) => {
                        e.target.onerror = null; 
                        e.target.src = '/logocircular.jpeg';
                        e.target.style.objectFit = 'contain';
                        e.target.parentElement.style.background = '#fff';
                      }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src="/logocircular.jpeg" alt={ep.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                  )}
                  
                  {/* Gradiente */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.8))' }}></div>
                  
                  {/* Badges Absolute */}
                  <span style={{ position: 'absolute', top: 12, left: 12, fontSize: '0.7rem', background: 'var(--plum)', color: '#fff', padding: '2px 8px', borderRadius: 99, fontWeight: 'bold', textTransform: 'uppercase', zIndex: 2 }}>
                    {getLevelLabel(ep.level, activeCourse)}
                  </span>
                  
                  <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8, zIndex: 2, background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: 99 }}>
                    {isFav && <span style={{ fontSize: '0.9rem' }}>❤️</span>}
                    {isDone && <span style={{ fontSize: '0.9rem' }}>✅</span>}
                  </div>
                </div>

                <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ margin: '0 0 10px', fontSize: '1.2rem', color: 'var(--text)', lineHeight: 1.3 }}>{ep.title}</h3>
                  <p style={{ margin: '0 0 15px', color: 'var(--muted)', fontSize: '0.9rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1 }}>{ep.summary?.pt || ''}</p>
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
