import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

// Roda todo dia pelo Vercel Cron (ver vercel.json) e lembra quem ainda não estudou hoje.
// Variáveis de ambiente na Vercel:
//   FIREBASE_SERVICE_ACCOUNT -> JSON da conta de serviço do Firebase (uma linha só)
//   CRON_SECRET              -> qualquer string longa; a Vercel envia no header Authorization
//   APP_URL                  -> opcional, URL do app aberta ao clicar na notificação

if (!getApps().length) {
  initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
}

const INVALID_TOKEN_CODES = [
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument'
];

// Mesmo "dia de estudo" do app: horário de Brasília (UTC-3) com virada às 6h
const getStudyDay = () => new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString().split('T')[0];

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const db = getFirestore();
  const today = getStudyDay();
  const link = process.env.APP_URL || 'https://yvenglishhub.com';

  const snap = await db.collection('users')
    .where('role', '==', 'student')
    .where('active', '==', true)
    .get();

  const targets = snap.docs.filter(d => {
    const u = d.data();
    return u.fcmToken && (u.currentStreak || 0) > 0 && u.lastStreakDate !== today;
  });

  if (targets.length === 0) return res.status(200).json({ sent: 0 });

  // Mensagem só com "data": o firebase-messaging-sw.js monta a notificação (evita aparecer duplicada)
  const messages = targets.map(d => {
    const u = d.data();
    const firstName = (u.name || '').split(' ')[0];
    const days = u.currentStreak;
    return {
      token: u.fcmToken,
      data: {
        title: `🔥 Não perca seu streak${firstName ? `, ${firstName}` : ''}!`,
        body: `Você está com ${days} ${days === 1 ? 'dia' : 'dias'} seguidos. Faça uma atividade rápida hoje para manter.`,
        link
      }
    };
  });

  const result = await getMessaging().sendEach(messages);

  // Remove tokens que não valem mais (app desinstalado, permissão revogada...)
  const cleanups = [];
  result.responses.forEach((r, i) => {
    if (!r.success && INVALID_TOKEN_CODES.includes(r.error?.code)) {
      cleanups.push(targets[i].ref.update({ fcmToken: FieldValue.delete() }));
    }
  });
  await Promise.all(cleanups);

  return res.status(200).json({ sent: result.successCount, failed: result.failureCount, removedTokens: cleanups.length });
}
