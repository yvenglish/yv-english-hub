import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UI_TEXTS } from '../data/uiTexts';
import { notificationPermission, requestNotificationPermission, sendTestNotification } from '../services/notificationService';

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone;

// Seção "Notificações" da Minha Conta: mostra o estado, ativa neste aparelho e manda um teste
export default function NotificationSettings() {
  const { currentUser, activeCourse } = useAuth();
  const h = UI_TEXTS[activeCourse];
  const [permission, setPermission] = useState(notificationPermission());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const enable = async () => {
    setBusy(true); setMessage('');
    const ok = await requestNotificationPermission(currentUser.uid);
    setPermission(notificationPermission());
    setMessage(ok ? h.notifEnabledOk : h.notifEnableFail);
    setBusy(false);
  };

  const test = async () => {
    setBusy(true); setMessage('');
    try {
      const r = await sendTestNotification();
      // Detalhe técnico no fim para a teacher conseguir diagnosticar (código HTTP ou erro do FCM)
      const detail = r.error ? `HTTP ${r.error}` : r.reason || (r.errors || []).filter(Boolean).join(', ');
      setMessage(r.sent > 0 ? h.notifTestSent(r.sent) : `${h.notifTestFail}${detail ? ` (${detail})` : ''}`);
    } catch (err) { setMessage(`${h.notifTestFail} (${err.message})`); }
    setBusy(false);
  };

  let status = h.notifStatusOff;
  if (permission === 'granted') status = h.notifStatusOn;
  else if (permission === 'denied') status = h.notifStatusBlocked;
  else if (permission === 'unsupported') status = isIos() && !isStandalone() ? h.notifStatusIos : h.notifStatusUnsupported;

  const btn = { padding: '10px 20px', borderRadius: 99, fontWeight: 'bold', cursor: busy ? 'wait' : 'pointer', border: 'none' };

  return (
    <div>
      <h3 style={{ margin: '0 0 8px', color: 'var(--text)', fontSize: '1.2rem' }}>🔔 {h.notifTitle}</h3>
      <p style={{ margin: '0 0 14px', color: 'var(--muted)', fontSize: '0.95rem' }}>{status}</p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {(permission === 'default' || permission === 'granted') && (
          <button disabled={busy} onClick={enable} style={{ ...btn, background: 'var(--purple)', color: '#fff' }}>
            {permission === 'granted' ? h.notifReconnect : h.notifEnable}
          </button>
        )}
        {permission === 'granted' && (
          <button disabled={busy} onClick={test} style={{ ...btn, background: 'transparent', color: 'var(--text)', border: '1px solid var(--line)' }}>{h.notifTest}</button>
        )}
      </div>
      {message && <p style={{ margin: '12px 0 0', color: 'var(--text)', fontSize: '0.9rem' }}>{message}</p>}
    </div>
  );
}
