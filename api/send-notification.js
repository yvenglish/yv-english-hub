import { adminDb, adminAuth, sendPushes, userTokens } from './_lib/firebaseAdmin.js';

// Push para um aluno, disparado pelo painel admin (ex.: "sua tarefa foi corrigida").
// Só aceita chamadas da teacher: o front manda o ID token do Firebase no header Authorization.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let uid;
  try {
    const idToken = (req.headers.authorization || '').replace('Bearer ', '');
    ({ uid } = await adminAuth.verifyIdToken(idToken));
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Qualquer usuário pode mandar um teste para si mesmo (texto fixo)
  if (req.body?.test) {
    const me = await adminDb.collection('users').doc(uid).get();
    const tokens = userTokens(me.data());
    if (tokens.length === 0) return res.status(200).json({ sent: 0, reason: 'Nenhum aparelho com notificações ativadas' });
    return res.status(200).json(await sendPushes([{ ref: me.ref, tokens, title: '🔔 Notificações funcionando!', body: 'É assim que os lembretes vão chegar.' }]));
  }

  // Para outro aluno, só a teacher
  const caller = await adminDb.collection('users').doc(uid).get();
  if (caller.data()?.role !== 'master') return res.status(403).json({ error: 'Forbidden' });

  const { studentId, title, body } = req.body || {};
  if (!studentId || !title) return res.status(400).json({ error: 'studentId e title são obrigatórios' });

  const student = await adminDb.collection('users').doc(studentId).get();
  const tokens = userTokens(student.data());
  if (tokens.length === 0) return res.status(200).json({ sent: 0, reason: 'Aluno sem notificações ativadas' });

  return res.status(200).json(await sendPushes([{ ref: student.ref, tokens, title, body: body || '' }]));
}
