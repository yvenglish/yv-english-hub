import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getAuth } from 'firebase-admin/auth';

// Usa a conta de serviço da variável FIREBASE_SERVICE_ACCOUNT (JSON em uma linha só).
// Se ela faltar ou estiver errada, as funções respondem com a mensagem em initError em vez de quebrar.
export let initError = null;
if (!getApps().length) {
  try {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) throw new Error('FIREBASE_SERVICE_ACCOUNT não configurada na Vercel');
    initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  } catch (err) {
    initError = err instanceof SyntaxError ? 'FIREBASE_SERVICE_ACCOUNT inválida (não é um JSON válido)' : err.message;
  }
}

export const adminDb = initError ? null : getFirestore();
export const adminAuth = initError ? null : getAuth();
export { FieldValue };

export const APP_URL = process.env.APP_URL || 'https://yv-english-hub.vercel.app';

const INVALID_TOKEN_CODES = [
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument'
];

// Todos os tokens salvos do usuário (um por aparelho/navegador). fcmToken é o formato antigo.
export const userTokens = (u = {}) => [...new Set([...(u.fcmTokens || []), u.fcmToken].filter(Boolean))];

// Envia a notificação já pronta (o navegador mostra mesmo se o service worker estiver dormindo;
// o iOS exige isso). targets: [{ ref, tokens, title, body }]. Remove tokens que não valem mais.
export const sendPushes = async (targets) => {
  const messages = targets.flatMap(t => t.tokens.map(token => ({ target: t, token })));
  if (messages.length === 0) return { sent: 0, failed: 0, removedTokens: 0 };
  const result = await getMessaging().sendEach(messages.map(({ target, token }) => ({
    token,
    notification: { title: target.title, body: target.body },
    data: { title: target.title, body: target.body, link: APP_URL },
    webpush: {
      notification: { icon: `${APP_URL}/logo.png` },
      fcmOptions: { link: APP_URL }
    }
  })));

  const dead = new Map(); // ref.path -> { ref, tokens }
  result.responses.forEach((r, i) => {
    if (!r.success && INVALID_TOKEN_CODES.includes(r.error?.code)) {
      const { target, token } = messages[i];
      const entry = dead.get(target.ref.path) || { ref: target.ref, tokens: [] };
      entry.tokens.push(token);
      dead.set(target.ref.path, entry);
    }
  });
  const cleanups = [...dead.values()].map(({ ref, tokens }) => ref.update({
    fcmTokens: FieldValue.arrayRemove(...tokens),
    fcmToken: FieldValue.delete()
  }));
  await Promise.all(cleanups);
  const errors = result.responses.filter(r => !r.success).map(r => r.error?.code);
  return { sent: result.successCount, failed: result.failureCount, removedTokens: [...dead.values()].reduce((n, d) => n + d.tokens.length, 0), errors };
};
