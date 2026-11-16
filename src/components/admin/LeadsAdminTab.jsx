import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

// Pedidos de diagnóstico gratuito que chegam pelo formulário do site (coleção "leads").
// As regras do Firestore deixam qualquer pessoa criar um pedido, mas só a teacher ler e atualizar.

const STATUSES = [
  { id: 'novo', label: 'Novo', color: '#C8883A', bg: '#FFF4E3' },
  { id: 'contatado', label: 'Contatado', color: '#5C3D6E', bg: '#EEE6F5' },
  { id: 'agendado', label: 'Agendado', color: '#2563EB', bg: '#E6EEFD' },
  { id: 'aluno', label: 'Virou aluno', color: '#2D7158', bg: '#EAF7F1' },
  { id: 'descartado', label: 'Descartado', color: '#7A6E6E', bg: '#F1EEEA' }
];
const STATUS = Object.fromEntries(STATUSES.map(s => [s.id, s]));

const LANG_FILTERS = [
  { id: 'all', label: 'Todos os idiomas' },
  { id: 'Inglês', label: '🇺🇸 Inglês' },
  { id: 'Espanhol', label: '🇪🇸 Espanhol' },
  { id: 'Inglês e Espanhol', label: 'Os dois' }
];

const loadLeads = async () => {
  const snap = await getDocs(query(collection(db, 'leads'), orderBy('createdAt', 'desc'), limit(500)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

const saveLead = async (id, patch) => {
  const now = new Date().toISOString();
  const data = { ...patch, updatedAt: now };
  if (patch.status) data[`statusAt.${patch.status}`] = now;
  await updateDoc(doc(db, 'leads', id), data);
};

const friendlyError = (err) => (err?.code === 'permission-denied'
  ? 'sem permissão. Confira se as regras de "leads" foram publicadas no Firebase Console.'
  : err?.message || 'erro desconhecido');

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000);
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 0 && new Date().getDate() === d.getDate()) return `Hoje, ${time}`;
  if (diffDays <= 1) return `Ontem, ${time}`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) + `, ${time}`;
};

// Números brasileiros chegam sem o 55; estrangeiros já vêm com o código do país (+34...)
const waNumber = (lead) => {
  const digits = lead.whatsappDigits || (lead.whatsapp || '').replace(/\D/g, '');
  if ((lead.whatsapp || '').trim().startsWith('+')) return digits;
  return digits.length <= 11 ? `55${digits}` : digits;
};

const waMessage = (lead) => {
  const first = (lead.nome || '').split(' ')[0];
  const idioma = (lead.idioma || '').toLowerCase();
  if (lead.idiomaDoSite === 'es') {
    return `¡Hola, ${first}! Soy Yasmin, de YV English 💜 Recibí tu solicitud de diagnóstico gratuito${idioma ? ` de ${idioma === 'espanhol' ? 'español' : idioma === 'inglês' ? 'inglés' : 'inglés y español'}` : ''}. ¿Qué día y horario te queda mejor?`;
  }
  return `Oi, ${first}! Aqui é a Yasmin, da YV English 💜 Recebi seu pedido de diagnóstico gratuito${idioma ? ` de ${idioma}` : ''}. Qual dia e horário ficam melhor pra você?`;
};

const Tag = ({ children, color = 'var(--plum)', bg = 'var(--plum-light)' }) => (
  <span style={{ display: 'inline-block', fontSize: '0.75rem', fontWeight: 700, color, background: bg, borderRadius: 999, padding: '4px 10px' }}>{children}</span>
);

const Row = ({ label, value }) => {
  if (!value || (Array.isArray(value) && value.length === 0)) return null;
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: '0.88rem', lineHeight: 1.45 }}>
      <span style={{ color: 'var(--muted)', minWidth: 92, flexShrink: 0 }}>{label}</span>
      <span style={{ color: 'var(--text)', fontWeight: 600 }}>{Array.isArray(value) ? value.join(', ') : value}</span>
    </div>
  );
};

function LeadCard({ lead, onChange }) {
  const [notes, setNotes] = useState(lead.notes || '');
  const [saving, setSaving] = useState(false);
  const st = STATUS[lead.status] || STATUS.novo;

  useEffect(() => { setNotes(lead.notes || ''); }, [lead.notes]);

  const save = async (patch) => {
    setSaving(true);
    try { await onChange(lead.id, patch); } finally { setSaving(false); }
  };

  const openWhatsApp = () => {
    window.open(`https://wa.me/${waNumber(lead)}?text=${encodeURIComponent(waMessage(lead))}`, '_blank', 'noopener');
    if (lead.status === 'novo') save({ status: 'contatado' });
  };

  return (
    <article style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderLeft: `4px solid ${st.color}`, borderRadius: 18, padding: 20, display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 2px 12px rgba(61,38,69,.06)', opacity: lead.status === 'descartado' ? 0.65 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.35rem', color: 'var(--plum)', margin: 0 }}>{lead.nome}</h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{formatDate(lead.createdAt)}{lead.idiomaDoSite === 'es' ? ' · site em espanhol' : ''}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {lead.idioma && <Tag color={lead.idioma === 'Espanhol' ? '#D96745' : 'var(--plum)'} bg={lead.idioma === 'Espanhol' ? '#FBE7DF' : 'var(--plum-light)'}>{lead.idioma}</Tag>}
          {lead.plano && <Tag color="var(--amber)" bg="#FFF4E3">Plano {lead.plano}</Tag>}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Row label="Nível" value={lead.nivel} />
        <Row label="Objetivo" value={lead.objetivo} />
        <Row label="Dificuldades" value={lead.dificuldades} />
        <Row label="Período" value={lead.periodo} />
        <Row label="Dias" value={lead.dias} />
        <Row label="WhatsApp" value={lead.whatsapp} />
        <Row label="E-mail" value={lead.email} />
      </div>

      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        onBlur={() => { if (notes !== (lead.notes || '')) save({ notes }); }}
        placeholder="Anotações (salvam sozinhas ao sair do campo)"
        rows={2}
        style={{ width: '100%', resize: 'vertical', border: '1px solid var(--line)', borderRadius: 12, padding: '10px 12px', fontFamily: 'inherit', fontSize: '0.88rem', background: 'var(--cream)', color: 'var(--text)' }}
      />

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={openWhatsApp} style={{ border: 0, borderRadius: 999, padding: '10px 16px', background: '#25A55A', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
          💬 Chamar no WhatsApp
        </button>
        <select
          value={lead.status || 'novo'}
          onChange={e => save({ status: e.target.value })}
          disabled={saving}
          style={{ borderRadius: 999, padding: '9px 14px', border: `1.5px solid ${st.color}`, background: st.bg, color: st.color, fontWeight: 800, cursor: 'pointer' }}
        >
          {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        {saving && <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Salvando…</span>}
      </div>
    </article>
  );
}

export default function LeadsAdminTab({ setLoading }) {
  const [leads, setLeads] = useState([]);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ativos');
  const [langFilter, setLangFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchLeads = async () => {
    setLoading(true);
    setError('');
    try {
      setLeads(await loadLeads());
    } catch (err) {
      console.error(err);
      setError(friendlyError(err));
    }
    setLoading(false);
  };

  useEffect(() => { fetchLeads(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateLead = async (id, patch) => {
    const before = leads;
    setLeads(ls => ls.map(l => (l.id === id ? { ...l, ...patch } : l)));
    try {
      await saveLead(id, patch);
    } catch (err) {
      setLeads(before);
      alert(`Não foi possível salvar: ${friendlyError(err)}`);
    }
  };

  const counts = useMemo(() => {
    const c = Object.fromEntries(STATUSES.map(s => [s.id, 0]));
    leads.forEach(l => { c[l.status || 'novo'] = (c[l.status || 'novo'] || 0) + 1; });
    return c;
  }, [leads]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter(l => {
      const st = l.status || 'novo';
      if (statusFilter === 'ativos' && (st === 'aluno' || st === 'descartado')) return false;
      if (statusFilter !== 'ativos' && statusFilter !== 'todos' && st !== statusFilter) return false;
      if (langFilter !== 'all' && l.idioma !== langFilter) return false;
      if (q && !`${l.nome} ${l.whatsapp} ${l.email}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [leads, statusFilter, langFilter, search]);

  const chip = (id, label, count) => (
    <button key={id} onClick={() => setStatusFilter(id)} style={{ padding: '8px 14px', borderRadius: 999, border: statusFilter === id ? 'none' : '1px solid var(--line)', background: statusFilter === id ? 'var(--plum)' : 'transparent', color: statusFilter === id ? '#fff' : 'var(--text)', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
      {label}{count !== undefined ? ` (${count})` : ''}
    </button>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", color: 'var(--plum)', fontSize: '1.9rem', margin: 0 }}>Diagnósticos</h2>
          <p style={{ color: 'var(--muted)', margin: '4px 0 0' }}>Pedidos de diagnóstico gratuito feitos pelo formulário do site.</p>
        </div>
        <button onClick={fetchLeads} style={{ border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--plum)', borderRadius: 999, padding: '9px 16px', fontWeight: 800, cursor: 'pointer' }}>↻ Atualizar</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 18 }}>
        {STATUSES.map(s => (
          <button key={s.id} onClick={() => setStatusFilter(s.id)} style={{ textAlign: 'left', border: statusFilter === s.id ? `2px solid ${s.color}` : '1px solid var(--line)', background: s.bg, borderRadius: 16, padding: '12px 14px', cursor: 'pointer' }}>
            <strong style={{ display: 'block', fontSize: '1.6rem', color: s.color, fontFamily: "'Playfair Display', serif" }}>{counts[s.id] || 0}</strong>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: s.color }}>{s.label}</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, marginBottom: 12 }}>
        {chip('ativos', 'Em andamento', counts.novo + counts.contatado + counts.agendado)}
        {chip('todos', 'Todos', leads.length)}
        {STATUSES.map(s => chip(s.id, s.label, counts[s.id]))}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, WhatsApp ou e-mail" style={{ flex: '1 1 240px', border: '1px solid var(--line)', borderRadius: 999, padding: '10px 16px', background: 'var(--paper)', color: 'var(--text)', fontFamily: 'inherit' }} />
        <select value={langFilter} onChange={e => setLangFilter(e.target.value)} style={{ border: '1px solid var(--line)', borderRadius: 999, padding: '10px 14px', background: 'var(--paper)', color: 'var(--text)', fontWeight: 700 }}>
          {LANG_FILTERS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
      </div>

      {error && (
        <div style={{ background: '#FDEBEB', color: '#9D2828', borderRadius: 14, padding: '14px 16px', marginBottom: 16, fontWeight: 600 }}>
          Não foi possível carregar os pedidos: {error}
        </div>
      )}

      {!error && visible.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '48px 16px', border: '1px dashed var(--line)', borderRadius: 18 }}>
          {leads.length === 0 ? 'Nenhum pedido de diagnóstico ainda. Eles aparecem aqui assim que alguém preencher o formulário.' : 'Nenhum pedido com esses filtros.'}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {visible.map(l => <LeadCard key={l.id} lead={l} onChange={updateLead} />)}
      </div>
    </div>
  );
}
