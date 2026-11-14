import { adminDb, sendPushes, userTokens, initError } from './_lib/firebaseAdmin.js';

// Roda duas vezes por dia pelo Vercel Cron (ver vercel.json): por volta das 12h e das 20h de Brasília.
// Vai para todo aluno que ativou as notificações e não está marcado como inativo no admin.
// O texto muda conforme a situação do aluno (streak em risco, já estudou hoje, sem streak).
// Variáveis de ambiente na Vercel:
//   FIREBASE_SERVICE_ACCOUNT -> JSON da conta de serviço do Firebase (uma linha só)
//   CRON_SECRET              -> qualquer string longa; a Vercel envia no header Authorization
//   APP_URL                  -> opcional, URL do app aberta ao clicar na notificação

// Mesmo "dia de estudo" do app: horário de Brasília (UTC-3) com virada às 6h
const getStudyDay = () => new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString().split('T')[0];
const brasiliaHour = () => new Date(Date.now() - 3 * 60 * 60 * 1000).getUTCHours();

const plural = (n) => `${n} ${n === 1 ? 'dia' : 'dias'}`;

const buildMessage = (u, today, evening) => {
  const name = (u.name || '').split(' ')[0];
  const hi = name ? `, ${name}` : '';
  const streak = u.currentStreak || 0;
  const studiedToday = u.lastStreakDate === today;

  if (studiedToday) {
    return evening
      ? { title: `✅ Dia garantido${hi}!`, body: `Seu streak está em ${plural(streak)}. Que tal revisar umas palavras antes de dormir?` }
      : { title: `🔥 Mandou bem${hi}!`, body: `Você já estudou hoje: ${plural(streak)} seguidos. Volte mais tarde para um jogo rápido.` };
  }
  if (streak > 0) {
    return evening
      ? { title: `🔥 Não perca seu streak${hi}!`, body: `Você está com ${plural(streak)} seguidos. Uma atividade rápida hoje mantém a sequência.` }
      : { title: `☀️ Bora manter o ritmo${hi}?`, body: `Seu streak está em ${plural(streak)}. Faça a Daily de hoje e garanta o dia.` };
  }
  return evening
    ? { title: `🌙 Ainda dá tempo${hi}!`, body: 'Cinco minutinhos hoje e você começa um streak novo.' }
    : { title: `👋 Oi${hi}! Sua Daily está esperando`, body: 'Uma atividade curta por dia faz toda a diferença. Bora começar?' };
};

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (initError) return res.status(500).json({ error: initError });

  const today = getStudyDay();
  const evening = brasiliaHour() >= 16;
  const snap = await adminDb.collection('users').where('role', '==', 'student').get();

  const targets = snap.docs
    .filter(d => d.data().active !== false && userTokens(d.data()).length > 0)
    .map(d => {
      const u = d.data();
      return { ref: d.ref, tokens: userTokens(u), ...buildMessage(u, today, evening) };
    });

  return res.status(200).json({ slot: evening ? 'evening' : 'midday', students: targets.length, ...(await sendPushes(targets)) });
}
