import { adminDb, adminAuth, initError } from './_lib/firebaseAdmin.js';

// Pedidos de diagnóstico gratuito vindos do formulário (yvenglish.github.io/yv_novo_aluno_form).
//   POST  público  → salva um pedido novo na coleção "leads"
//   GET   teacher  → lista os pedidos (para a aba Diagnósticos do admin)
//   PATCH teacher  → atualiza status e anotações de um pedido
// A teacher manda o ID token do Firebase no header Authorization, como em send-notification.

const ALLOWED_ORIGINS = [
  'https://yvenglish.github.io',
  'https://yvenglish.com',
  'https://www.yvenglish.com',
  'http://localhost:5174'
];

export const LEAD_STATUSES = ['novo', 'contatado', 'agendado', 'aluno', 'descartado'];

const str = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const list = (v) => {
  const arr = Array.isArray(v) ? v : str(v, 400).split(',');
  return arr.map(x => str(String(x), 60)).filter(x => x && x !== '—').slice(0, 10);
};

function cors(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

async function requireTeacher(req) {
  const idToken = (req.headers.authorization || '').replace('Bearer ', '');
  const { uid } = await adminAuth.verifyIdToken(idToken);
  const caller = await adminDb.collection('users').doc(uid).get();
  if (caller.data()?.role !== 'master') throw Object.assign(new Error('Forbidden'), { status: 403 });
}

async function createLead(req, res) {
  const b = req.body || {};
  if (b.botcheck) return res.status(200).json({ ok: true }); // robô: finge que deu certo

  const nome = str(b.nome, 80);
  const whatsapp = str(b.whatsapp, 30);
  const whatsappDigits = whatsapp.replace(/\D/g, '');
  if (nome.length < 2 || whatsappDigits.length < 10) {
    return res.status(400).json({ error: 'Nome e WhatsApp são obrigatórios' });
  }

  const now = new Date().toISOString();
  const lead = {
    nome,
    whatsapp,
    whatsappDigits,
    email: str(b.email, 120),
    idioma: str(b.idioma, 40),
    nivel: str(b.nivel, 40),
    objetivo: list(b.objetivo),
    dificuldades: list(b.dificuldades),
    periodo: list(b.periodo),
    dias: list(b.dias),
    plano: str(b.plano_de_interesse || b.plano, 40),
    idiomaDoSite: str(b.idioma_do_site, 5) || 'pt',
    status: 'novo',
    notes: '',
    createdAt: now,
    updatedAt: now
  };

  const ref = await adminDb.collection('leads').add(lead);
  return res.status(201).json({ ok: true, id: ref.id });
}

async function listLeads(req, res) {
  await requireTeacher(req);
  const snap = await adminDb.collection('leads').orderBy('createdAt', 'desc').limit(500).get();
  return res.status(200).json({ leads: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
}

async function updateLead(req, res) {
  await requireTeacher(req);
  const { id, status, notes } = req.body || {};
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'id é obrigatório' });

  const patch = { updatedAt: new Date().toISOString() };
  if (status !== undefined) {
    if (!LEAD_STATUSES.includes(status)) return res.status(400).json({ error: 'status inválido' });
    patch.status = status;
    patch[`statusAt.${status}`] = patch.updatedAt;
  }
  if (notes !== undefined) patch.notes = str(notes, 2000);

  await adminDb.collection('leads').doc(id).update(patch);
  return res.status(200).json({ ok: true });
}

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (initError) return res.status(500).json({ error: initError });

  try {
    if (req.method === 'POST') return await createLead(req, res);
    if (req.method === 'GET') return await listLeads(req, res);
    if (req.method === 'PATCH') return await updateLead(req, res);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ error: 'Forbidden' });
    if (err.code?.startsWith?.('auth/')) return res.status(401).json({ error: 'Unauthorized' });
    console.error('lead:', err);
    return res.status(500).json({ error: err.message });
  }
}
