import { getToken, onMessage } from "firebase/messaging";
import { getMessagingSafe, db, auth } from "../config/firebase";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";

const VAPID_KEY = "BBT-Yr1LFrGGx5iIje5wBdOgCCPa_PWyLO6jPs-WPj1XtczfRPi3x3e9-8NbauAHj5lIpgYK0dcsYjY6e4kPkUM";

export const notificationsSupported = () =>
  typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;

export const notificationPermission = () => (notificationsSupported() ? Notification.permission : 'unsupported');

// Registra o service worker do FCM e salva o token deste aparelho.
// Cada aparelho/navegador (PWA, Chrome do PC…) tem o seu token: guardamos todos em fcmTokens,
// senão ativar em um apagava o outro.
const saveToken = async (userId) => {
  const messaging = await getMessagingSafe();
  if (!messaging) return false;
  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/firebase-cloud-messaging-push-scope' });
  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
  if (!token) return false;
  await updateDoc(doc(db, "users", userId), { fcmToken: token, fcmTokens: arrayUnion(token) });
  return true;
};

// Pede permissão (precisa ser chamado num clique) e salva o token
export const requestNotificationPermission = async (userId) => {
  if (!notificationsSupported()) return false;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;
    return await saveToken(userId);
  } catch (err) {
    console.error("Erro ao ativar notificações:", err);
    return false;
  }
};

// A cada abertura do app: se a permissão já foi dada, renova o token (o FCM troca de tempos em tempos)
export const syncNotificationToken = async (userId) => {
  if (notificationPermission() !== 'granted') return;
  try { await saveToken(userId); } catch (err) { console.warn("Token de notificação não renovado:", err); }
};

// Com o app aberto o navegador não mostra a notificação sozinho: mostramos nós mesmos
export const listenForegroundMessages = async () => {
  const messaging = await getMessagingSafe();
  if (!messaging) return () => {};
  return onMessage(messaging, async (payload) => {
    const title = payload.notification?.title || payload.data?.title || 'YV Language Club';
    const body = payload.notification?.body || payload.data?.body || '';
    try {
      const registration = await navigator.serviceWorker.getRegistration('/firebase-cloud-messaging-push-scope');
      if (registration) registration.showNotification(title, { body, icon: '/logo.png', data: { link: '/' } });
      else new Notification(title, { body, icon: '/logo.png' });
    } catch (err) { console.warn("Não foi possível mostrar a notificação:", err); }
  });
};

// Manda uma notificação de teste para o próprio aluno (todos os aparelhos dele)
export const sendTestNotification = async () => {
  const idToken = await auth.currentUser.getIdToken();
  const res = await fetch('/api/send-notification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ test: true })
  });
  if (res.ok) return res.json();
  const body = await res.json().catch(() => ({}));
  return { sent: 0, error: body.error ? `${res.status}: ${body.error}` : res.status };
};
