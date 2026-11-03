import { adminDb, sendPushes } from './_lib/firebaseAdmin.js';

// Roda todo dia pelo Vercel Cron (ver vercel.json) e lembra quem ainda não estudou hoje.
// Variáveis de ambiente na Vercel:
//   FIREBASE_SERVICE_ACCOUNT -> JSON da conta de serviço do Firebase (uma linha só)
//   CRON_SECRET              -> qualquer string longa; a Vercel envia no header Authorization
//   APP_URL                  -> opcional, URL do app aberta ao clicar na notificação

// Mesmo "dia de estudo" do app: horário de Brasília (UTC-3) com virada às 6h
const getStudyDay = () => new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString().split('T')[0];

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const today = getStudyDay();
  const snap = await adminDb.collection('users')
    .where('role', '==', 'student')
    .where('active', '==', true)
    .get();

  const targets = snap.docs
    .filter(d => {
      const u = d.data();
      return u.fcmToken && (u.currentStreak || 0) > 0 && u.lastStreakDate !== today;
    })
    .map(d => {
      const u = d.data();
      const firstName = (u.name || '').split(' ')[0];
      const days = u.currentStreak;
      return {
        ref: d.ref,
        token: u.fcmToken,
        title: `🔥 Não perca seu streak${firstName ? `, ${firstName}` : ''}!`,
        body: `Você está com ${days} ${days === 1 ? 'dia' : 'dias'} seguidos. Faça uma atividade rápida hoje para manter.`
      };
    });

  return res.status(200).json(await sendPushes(targets));
}
