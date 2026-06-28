import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../config/firebase';
import { collection, getDocs } from 'firebase/firestore';

export default function Navbar() {
  const { userData, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchData, setSearchData] = useState(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchFocus = async () => {
    setIsDropdownOpen(true);
    if (!searchData) {
      try {
        const [weeksSnap, libSnap] = await Promise.all([
          getDocs(collection(db, 'weeks')),
          getDocs(collection(db, 'library_episodes'))
        ]);
        const weeks = weeksSnap.docs.map(d => ({ id: d.id, type: 'week', ...d.data() }));
        const libs = libSnap.docs.map(d => ({ id: d.id, type: 'library', ...d.data() }));
        setSearchData([...weeks, ...libs]);
      } catch (err) {
        console.error('Error fetching search data:', err);
      }
    }
  };

  const getFilteredResults = () => {
    if (!searchData || !searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return searchData.filter(item => {
      const titleMatch = (item.title || '').toLowerCase().includes(q);
      const descMatch = (item.description || item.level || '').toLowerCase().includes(q);
      return titleMatch || descMatch;
    }).slice(0, 8); // max 8 results
  };

  const handleResultClick = (item) => {
    setIsDropdownOpen(false);
    setSearchQuery('');
    if (item.type === 'week') {
      navigate('/', { state: { openWeekId: item.id } });
    } else if (item.type === 'library') {
      navigate('/library', { state: { openEpisodeId: item.id } });
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initial = userData?.name ? userData.name.charAt(0).toUpperCase() : 'A';
  const planName = userData?.plan || 'Foundation';

  // Helper to check if Semanas is active (if we are on home but specifically scrolled to Semanas, or just map it to /)
  const isInicio = location.pathname === '/';
  
  return (
    <nav className="navbar">
      {/* Esquerda: Logo e Links */}
      <div className="nav-left">
        <img src="/logo.png" alt="YV English" style={{ height: 40, cursor: 'pointer' }} onClick={() => navigate('/')} />
        
        <div className="nav-links">
          <NavLink 
            to="/"
            style={({ isActive }) => ({
              textDecoration: 'none',
              color: isActive ? 'var(--amber)' : '#ffffff',
              fontWeight: 500,
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              position: 'relative',
              height: '100%'
            })}
          >
            {({ isActive }) => (
              <>
                Início
                {isActive && (
                  <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'var(--amber)', borderRadius: '3px 3px 0 0' }} />
                )}
              </>
            )}
          </NavLink>

          <a 
            href="/#weeksSection"
            onClick={(e) => {
              if (location.pathname !== '/') {
                e.preventDefault();
                navigate('/#weeksSection');
              }
            }}
            style={{
              textDecoration: 'none',
              color: '#ffffff',
              fontWeight: 500,
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              height: '100%',
              opacity: 0.8
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = 1}
            onMouseLeave={e => e.currentTarget.style.opacity = 0.8}
          >
            Semanas
          </a>

          <NavLink 
            to="/flashcards"
            style={({ isActive }) => ({
              textDecoration: 'none',
              color: isActive ? 'var(--amber)' : '#ffffff',
              fontWeight: 500,
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              position: 'relative',
              height: '100%'
            })}
          >
            {({ isActive }) => (
              <>
                Flashcards
                {isActive && (
                  <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'var(--amber)', borderRadius: '3px 3px 0 0' }} />
                )}
              </>
            )}
          </NavLink>

          <NavLink 
            to="/library"
            style={({ isActive }) => ({
              textDecoration: 'none',
              color: isActive ? 'var(--amber)' : '#ffffff',
              fontWeight: 500,
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              position: 'relative',
              height: '100%'
            })}
          >
            {({ isActive }) => (
              <>
                Biblioteca
                {isActive && (
                  <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'var(--amber)', borderRadius: '3px 3px 0 0' }} />
                )}
              </>
            )}
          </NavLink>
        </div>
      </div>

      {/* Direita: Busca e Perfil */}
      <div className="nav-actions-container">
        
        {/* Barra de Busca Funcional */}
        <div style={{ position: 'relative' }} ref={searchRef}>
          <span style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }}>🔍</span>
          <input 
            type="text" 
            placeholder="Buscar..." 
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setIsDropdownOpen(true); }}
            onFocus={handleSearchFocus}
            className="search-input"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 40,
              padding: '10px 15px 10px 42px',
              color: '#fff',
              fontSize: '0.9rem',
              width: 240,
              outline: 'none',
              transition: 'all 0.2s',
            }}
            onFocusCapture={e => e.target.style.background = 'rgba(255,255,255,0.1)'}
            onBlurCapture={e => e.target.style.background = 'rgba(255,255,255,0.06)'}
          />
          
          {isDropdownOpen && searchQuery.trim() && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 10px)',
              left: 0,
              right: 0,
              background: 'var(--hero-c)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 16,
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              overflow: 'hidden',
              zIndex: 100
            }}>
              {getFilteredResults().length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {getFilteredResults().map(item => (
                    <div 
                      key={item.id} 
                      onClick={() => handleResultClick(item)}
                      style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4 }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <strong style={{ fontSize: '0.9rem', color: '#fff' }}>{item.title}</strong>
                        <span style={{ fontSize: '0.65rem', background: item.type === 'week' ? 'rgba(200, 136, 58, 0.2)' : 'rgba(138, 124, 255, 0.2)', color: item.type === 'week' ? 'var(--amber)' : 'var(--purple)', padding: '2px 8px', borderRadius: 99, textTransform: 'uppercase', fontWeight: 800 }}>
                          {item.type === 'week' ? 'Semana' : 'Biblioteca'}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.description || item.level}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                  Nenhum resultado encontrado.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Círculo de Progresso */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.05)', padding: '6px 16px 6px 6px', borderRadius: 99, border: '1px solid rgba(200, 136, 58, 0.3)' }} className="hide-on-mobile">
          <div style={{ position: 'relative', width: 40, height: 40, display: 'grid', placeItems: 'center' }}>
            <svg viewBox="0 0 36 36" style={{ width: 40, height: 40, transform: 'rotate(-90deg)' }}>
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--amber)" strokeWidth="3" strokeDasharray="85, 100" />
            </svg>
            <span style={{ position: 'absolute', fontSize: '1rem' }}>🔥</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontWeight: 800 }}>Streak</span>
            <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 'bold' }}>{userData?.currentStreak || 0} dias</span>
          </div>
        </div>

        {/* Dropdown de Usuário */}
        <div style={{ position: 'relative' }} className="hide-on-mobile">
          <div 
            onClick={() => setShowMenu(!showMenu)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '6px 12px', borderRadius: 99, transition: '0.2s', background: showMenu ? 'rgba(255,255,255,0.1)' : 'transparent' }}
          >
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--amber)', color: '#0d071a', display: 'grid', placeItems: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>
              {initial}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#fff', fontWeight: 500 }}>{userData?.name || 'Aluno'}</span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>▼</span>
            </div>
          </div>

          {showMenu && (
            <div style={{
              position: 'absolute',
              top: '110%',
              right: 0,
              background: 'var(--paper)',
              border: '1px solid var(--line)',
              borderRadius: 16,
              padding: '10px 0',
              minWidth: 200,
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              zIndex: 1001,
              animation: 'fadeIn 0.2s'
            }}>
              <button 
                  onClick={() => {
                    navigate('/account');
                    setShowMenu(false);
                  }} 
                  style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'transparent', border: 'none', color: 'var(--text)', padding: '8px 15px', width: '100%', textAlign: 'left', cursor: 'pointer', fontSize: '0.9rem' }}
                >👤 Minha Conta
              </button>
              <button onClick={toggleTheme} style={{ width: '100%', padding: '12px 20px', background: 'transparent', border: 'none', color: 'var(--text)', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.95rem' }}>
                {theme === 'dark' ? '☀️ Modo Claro' : '🌙 Modo Escuro'}
              </button>
              <div style={{ height: 1, background: 'var(--line)', margin: '5px 0' }} />
              <button onClick={handleLogout} style={{ width: '100%', padding: '12px 20px', background: 'transparent', border: 'none', color: '#ff4d4d', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.95rem', fontWeight: 'bold' }}>
                🚪 Sair
              </button>
            </div>
          )}
        </div>

        <button className="hamburger" onClick={() => setShowMenu(!showMenu)}>
          ☰
        </button>
      </div>

      {/* Mobile Menu */}
      <div className={`mobile-menu ${showMenu ? 'open' : ''}`}>
        <NavLink to="/" onClick={() => setShowMenu(false)}>Início</NavLink>
        <a href="/#weeksSection" onClick={(e) => {
          if (location.pathname !== '/') {
            e.preventDefault();
            navigate('/#weeksSection');
          }
          setShowMenu(false);
        }}>Semanas</a>
        <NavLink to="/flashcards" onClick={() => setShowMenu(false)}>Flashcards</NavLink>
        <NavLink to="/library" onClick={() => setShowMenu(false)}>Biblioteca</NavLink>
        <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '10px 0' }} />
        <button onClick={() => { navigate('/account'); setShowMenu(false); }} style={{ background: 'transparent', color: '#fff', border: 'none', textAlign: 'left', fontSize: '1.1rem', fontWeight: 500 }}>Minha Conta</button>
        <button onClick={() => { toggleTheme(); setShowMenu(false); }} style={{ background: 'transparent', color: '#fff', border: 'none', textAlign: 'left', fontSize: '1.1rem', fontWeight: 500 }}>{theme === 'dark' ? '☀️ Modo Claro' : '🌙 Modo Escuro'}</button>
        <button onClick={() => { handleLogout(); setShowMenu(false); }} style={{ background: 'transparent', color: 'var(--amber)', border: 'none', textAlign: 'left', fontSize: '1.1rem', fontWeight: 500 }}>Sair</button>
      </div>
    </nav>
  );
}
