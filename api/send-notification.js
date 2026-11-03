import { adminDb, adminAuth, sendPushes } from './_lib/firebaseAdmin.js';

// Push para um aluno, disparado pelo painel admin (ex.: "sua tarefa foi corrigida").
// Só aceita chamadas da teacher: o front manda o ID token do Firebase no header Authorization.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const idToken = (req.headers.authorization || '').replace('Bearer ', '');
    const { uid } = await adminAuth.verifyIdToken(idToken);
    const caller = await adminDb.collection('users').doc(uid).get();
    if (caller.data()?.role !== 'master') return res.status(403).json({ error: 'Forbidden' });
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { studentId, title, body } = req.body || {};
  if (!studentId || !title) return res.status(400).json({ error: 'studentId e title são obrigatórios' });

  const student = await adminDb.collection('users').doc(studentId).get();
  const token = student.data()?.fcmToken;
  if (!token) return res.status(200).json({ sent: 0, reason: 'Aluno sem notificações ativadas' });

  return res.status(200).json(await sendPushes([{ ref: student.ref, token, title, body: body || '' }]));
}
