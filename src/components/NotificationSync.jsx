import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { syncNotificationToken, listenForegroundMessages } from '../services/notificationService';

// Ao entrar no app: renova o token deste aparelho e mostra as notificações que chegam com o app aberto
export default function NotificationSync() {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid;

  useEffect(() => {
    if (!uid) return;
    let unsubscribe = () => {};
    let cancelled = false;
    syncNotificationToken(uid);
    listenForegroundMessages().then(unsub => { if (cancelled) unsub(); else unsubscribe = unsub; });
    return () => { cancelled = true; unsubscribe(); };
  }, [uid]);

  return null;
}
