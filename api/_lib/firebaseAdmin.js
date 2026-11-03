import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getAuth } from 'firebase-admin/auth';

// Usa a conta de serviço da variável FIREBASE_SERVICE_ACCOUNT (JSON em uma linha só)
if (!getApps().length) {
  initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
}

export const adminDb = getFirestore();
export const adminAuth = getAuth();
export { FieldValue };

export const APP_URL = process.env.APP_URL || 'https://yvenglishhub.com';

const INVALID_TOKEN_CODES = [
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument'
];

// Envia notificações só com "data" (o firebase-messaging-sw.js monta a notificação).
// targets: [{ ref, token, title, body }]. Remove tokens que não valem mais.
export const sendPushes = async (targets) => {
  if (targets.length === 0) return { sent: 0, failed: 0, removedTokens: 0 };
  const result = await getMessaging().sendEach(targets.map(t => ({
    token: t.token,
    data: { title: t.title, body: t.body, link: APP_URL }
  })));

  const cleanups = [];
  result.responses.forEach((r, i) => {
    if (!r.success && INVALID_TOKEN_CODES.includes(r.error?.code)) {
      cleanups.push(targets[i].ref.update({ fcmToken: FieldValue.delete() }));
    }
  });
  await Promise.all(cleanups);
  return { sent: result.successCount, failed: result.failureCount, removedTokens: cleanups.length };
};
