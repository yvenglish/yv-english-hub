import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

// Mostra, uma de cada vez, as badges que o aluno acabou de conquistar
export default function BadgeToast() {
  const { unlockedBadges, dismissUnlockedBadge } = useAuth();
  const badge = unlockedBadges[0];

  useEffect(() => {
    if (!badge) return;
    const timer = setTimeout(dismissUnlockedBadge, 5000);
    return () => clearTimeout(timer);
  }, [badge, dismissUnlockedBadge]);

  if (!badge) return null;

  return (
    <div
      onClick={dismissUnlockedBadge}
      style={{ position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)', zIndex: 3000, display: 'flex', alignItems: 'center', gap: 14, padding: '14px 24px 14px 16px', background: 'rgba(20,10,30,0.95)', border: '1px solid var(--amber)', borderRadius: 999, boxShadow: '0 12px 32px rgba(0,0,0,0.35)', cursor: 'pointer', maxWidth: 'calc(100vw - 32px)' }}
    >
      <span style={{ fontSize: '2.2rem', lineHeight: 1 }}>{badge.icon}</span>
      <div>
        <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--amber)' }}>Nova conquista!</p>
        <strong style={{ color: '#fff', fontSize: '1rem' }}>{badge.title}</strong>
        <span style={{ color: '#bbaacb', fontSize: '0.85rem' }}> · {badge.description}</span>
      </div>
    </div>
  );
}
