import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { TASK_TYPES, RUBRIC, RUBRIC_LEVELS } from '../../data/production';

// Avisa o aluno por push que a correção saiu. Não bloqueia a correção se falhar.
const notifyStudent = async (studentId, weekTitle) => {
  try {
    const idToken = await auth.currentUser.getIdToken();
    await fetch('/api/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({
        studentId,
        title: '✨ Sua tarefa foi corrigida!',
        body: weekTitle ? `Veja o feedback da teacher em "${weekTitle}".` : 'Veja o feedback da teacher.'
      })
    });
  } catch (err) { console.error('Push não enviado:', err); }
};

export default function ProductionAdminTab({ setLoading }) {
  const [submissions, setSubmissions] = useState([]);
  const [filter, setFilter] = useState('submitted');
  const [reviewing, setReviewing] = useState(null); // { id, ...submission, feedback }

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'submissions'));
      setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchSubmissions(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pending = submissions.filter(s => s.status === 'submitted').sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
  const reviewed = submissions.filter(s => s.status === 'reviewed').sort((a, b) => (b.reviewedAt || '').localeCompare(a.reviewedAt || ''));
  const list = filter === 'submitted' ? pending : reviewed;

  const startReview = (s) => setReviewing({ ...s, feedback: s.feedback || { comment: '' } });

  const setScore = (key, value) => {
    const current = reviewing.feedback[key];
    setReviewing({ ...reviewing, feedback: { ...reviewing.feedback, [key]: current === value ? null : value } });
  };

  const handleSaveReview = async () => {
    const isFirstReview = reviewing.status !== 'reviewed';
    setLoading(true);
    try {
      const update = { status: 'reviewed', feedback: reviewing.feedback, reviewedAt: new Date().toISOString() };
      await updateDoc(doc(db, 'submissions', reviewing.id), update);
      if (isFirstReview) notifyStudent(reviewing.studentId, reviewing.weekTitle);
      setReviewing(null);
      await fetchSubmissions();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar a correção.');
      setLoading(false);
    }
  };

  const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <section>
      <h2>Correções</h2>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {[['submitted', `Pendentes (${pending.length})`], ['reviewed', `Corrigidas (${reviewed.length})`]].map(([value, label]) => (
          <button key={value} onClick={() => setFilter(value)} style={{ padding: '8px 16px', borderRadius: 999, border: filter === value ? 'none' : '1px solid var(--line)', background: filter === value ? 'var(--purple)' : 'transparent', color: filter === value ? '#fff' : 'var(--text)', fontWeight: 800, cursor: 'pointer' }}>{label}</button>
        ))}
      </div>

      {list.length === 0 && (
        <p style={{ color: 'var(--muted)' }}>{filter === 'submitted' ? 'Nenhuma tarefa esperando correção. 🎉' : 'Nenhuma tarefa corrigida ainda.'}</p>
      )}

      <div style={{ display: 'grid', gap: 14 }}>
        {list.map(s => (
          <div key={s.id} style={{ padding: 20, background: 'var(--cream)', border: '1px solid var(--line)', borderRadius: 16 }}>
            <div className="admin-flex-between" style={{ marginBottom: 10 }}>
              <div>
                <h3 style={{ margin: '0 0 4px' }}>{s.studentName || 'Aluno'}</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>{s.weekTitle} · {TASK_TYPES[s.type]} · enviado {formatDate(s.submittedAt)}</p>
              </div>
              {reviewing?.id !== s.id && (
                <button onClick={() => startReview(s)} style={{ padding: '8px 16px', background: 'var(--plum)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}>
                  {s.status === 'reviewed' ? 'Editar correção' : 'Corrigir'}
                </button>
              )}
            </div>

            <p style={{ margin: '0 0 10px', fontSize: '0.9rem', color: 'var(--muted)', whiteSpace: 'pre-wrap' }}><strong>Tarefa:</strong> {s.prompt}</p>
            {s.text && <div style={{ padding: 14, background: 'var(--paper)', borderRadius: 12, whiteSpace: 'pre-wrap', lineHeight: 1.5, marginBottom: 10 }}>{s.text}</div>}
            {s.audioUrl && <audio controls src={s.audioUrl} style={{ width: '100%', marginBottom: 10 }} />}

            {reviewing?.id === s.id && (
              <div style={{ display: 'grid', gap: 14, padding: 16, background: 'var(--paper)', borderRadius: 12, border: '1px solid var(--line)' }}>
                {RUBRIC.map(r => (
                  <div key={r.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '0.9rem' }}>{r.label}</strong>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[1, 2, 3].map(v => (
                        <button key={v} onClick={() => setScore(r.key, v)} title={RUBRIC_LEVELS[v]} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--line)', background: reviewing.feedback[r.key] === v ? 'var(--amber)' : 'transparent', color: reviewing.feedback[r.key] === v ? '#fff' : 'var(--text)', fontWeight: 800, cursor: 'pointer' }}>
                          {'★'.repeat(v)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)' }}>Clique de novo para desmarcar um critério que não se aplica.</p>
                <textarea value={reviewing.feedback.comment || ''} onChange={e => setReviewing({ ...reviewing, feedback: { ...reviewing.feedback, comment: e.target.value } })} rows="5" placeholder="Comentário e correções para o aluno..." style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }} />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={handleSaveReview} style={{ padding: '10px 20px', background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}>Enviar correção</button>
                  <button onClick={() => setReviewing(null)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--line)', color: 'var(--text)', borderRadius: 8, cursor: 'pointer' }}>Cancelar</button>
                </div>
              </div>
            )}

            {s.status === 'reviewed' && reviewing?.id !== s.id && s.feedback && (
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>
                {RUBRIC.filter(r => s.feedback[r.key]).map(r => `${r.label} ${'★'.repeat(s.feedback[r.key])}`).join(' · ')}
                {s.feedback.comment ? ` — "${s.feedback.comment.slice(0, 80)}${s.feedback.comment.length > 80 ? '…' : ''}"` : ''}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
