import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setMessage('');
      setLoading(true);
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError('Falha ao fazer login. Verifique suas credenciais.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Por favor, digite seu e-mail no campo acima para recuperar a senha.');
      return;
    }
    try {
      setError('');
      setMessage('');
      setLoading(true);
      await resetPassword(email);
      setMessage('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
    } catch (err) {
      setError('Falha ao redefinir a senha. Verifique se o e-mail está correto.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <main className="login-shell">
        <div className="brand">
          <img src="/logo.png" alt="YV English" className="logo" style={{ marginBottom: 15 }} />
          <p>Language Academy & Method</p>
        </div>
        
        <section className="login-card">
          <div className="login-content">
            <p className="eyebrow">Student Access</p>
            <h1>Welcome<br/><em>Student ✦</em></h1>
            <p className="subtitle">Digite suas credenciais para acessar seus materiais, exercícios e flashcards.</p>
            
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>E-mail</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Digite seu e-mail" 
                  required 
                />
              </div>
              <div className="field">
                <label>Senha</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha" 
                />
              </div>
              
              <button disabled={loading} type="submit">
                {loading ? 'Aguarde...' : 'Entrar'}
              </button>
              
              <button 
                type="button"
                onClick={handleResetPassword}
                disabled={loading}
                style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--muted)', marginTop: 15, cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}
              >
                Esqueci minha senha
              </button>
              
              {error && <p className="error">{error}</p>}
              {message && <p style={{ marginTop: 14, padding: '12px 14px', borderRadius: 16, background: 'rgba(138, 124, 255, 0.12)', border: '1px solid rgba(138, 124, 255, 0.32)', color: 'var(--muted)', fontSize: '0.9rem' }}>{message}</p>}
            </form>
          </div>
        </section>
        <p className="footer-note">YV English · from understanding to speaking</p>
      </main>
    </div>
  );
}
