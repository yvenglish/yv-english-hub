import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Account() {
  const { userData, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initial = userData?.name ? userData.name.charAt(0).toUpperCase() : 'A';

  // Format the due date if it exists
  const formatDueDate = (dateStr) => {
    if (!dateStr) return 'Não definida';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
    }
    return dateStr;
  };

  return (
    <div className="site-shell unlocked" style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <main style={{ flex: 1, padding: '40px 20px', maxWidth: 800, margin: '0 auto', width: '100%', fontFamily: '"Inter", sans-serif' }}>
        
        <button onClick={() => navigate('/')} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', marginBottom: 20, fontWeight: 'bold' }}>
          ← Voltar ao Início
        </button>

        <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: '3rem', color: 'var(--text)', marginBottom: 40 }}>
          Minha Conta
        </h1>

        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 24, padding: 40, display: 'flex', flexDirection: 'column', gap: 30 }}>
          
          {/* Header Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--amber)', color: '#0d071a', display: 'grid', placeItems: 'center', fontWeight: 'bold', fontSize: '2.5rem' }}>
              {initial}
            </div>
            <div>
              <h2 style={{ margin: '0 0 5px', fontSize: '1.8rem', color: 'var(--text)' }}>{userData?.name || 'Aluno'}</h2>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: '1rem' }}>{userData?.email}</p>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--line)' }} />

          {/* Details */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
            <div style={{ background: 'var(--cream)', padding: 20, borderRadius: 16 }}>
              <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--plum)', marginBottom: 5 }}>
                Plano Atual
              </span>
              <strong style={{ fontSize: '1.2rem', color: 'var(--text)' }}>{userData?.plan || 'Foundation'}</strong>
            </div>

            <div style={{ background: 'var(--cream)', padding: 20, borderRadius: 16 }}>
              <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--plum)', marginBottom: 5 }}>
                Vencimento da Mensalidade
              </span>
              <strong style={{ fontSize: '1.2rem', color: 'var(--text)' }}>{formatDueDate(userData?.dueDate)}</strong>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--line)' }} />

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              onClick={handleLogout}
              style={{ padding: '12px 30px', background: 'transparent', border: '1px solid #ff4d4d', color: '#ff4d4d', borderRadius: 99, fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#ff4d4d'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#ff4d4d'; }}
            >
              Sair da Conta
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}
