import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { UI_TEXTS } from '../data/uiTexts';
import { inCourse } from '../data/courses';

// Mês da semana: usa ano/mês escolhidos no admin ou, sem eles, a data de criação
const monthKey = (week) => {
  if (week.year && week.month) return `${week.year}-${String(week.month).padStart(2, '0')}`;
  const d = new Date(week.createdAt || 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Texto do Daily com as palavras destacadas ([palavra](tradução)); clicar mostra a tradução
function DailyText({ content }) {
  const [open, setOpen] = useState(null);
  return (content || '').split('\n').filter(p => p.trim()).map((p, pi) => {
    const parts = [];
    let last = 0;
    for (const m of p.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)) {
      if (m.index > last) parts.push(p.slice(last, m.index));
      const key = `${pi}-${m.index}`;
      parts.push(
        <button key={key} type="button" className="vocab" onClick={() => setOpen(open === key ? null : key)} title={m[2]}>
          {m[1]}{open === key && <span style={{ marginLeft: 6, fontSize: '0.8em', color: 'var(--amber)' }}>({m[2]})</span>}
        </button>
      );
      last = m.index + m[0].length;
    }
    if (last < p.length) parts.push(p.slice(last));
    return <p key={pi} style={{ marginBottom: 14, lineHeight: 1.7 }}>{parts}</p>;
  });
}

export default function History() {
  const { currentUser, userData, activeCourse } = useAuth();
  const h = UI_TEXTS[activeCourse];
  const navigate = useNavigate();

  const [tab, setTab] = useState('weeks');
  const [weeks, setWeeks] = useState([]);
  const [dailies, setDailies] = useState([]);
  const [extras, setExtras] = useState([]);
  const [search, setSearch] = useState('');
  const [onlyTasks, setOnlyTasks] = useState(false);
  const [reading, setReading] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const load = async () => {
      setLoading(true);
      try {
        const [weeksSnap, assignSnap, bankSnap, extrasSnap] = await Promise.all([
          getDocs(query(collection(db, 'weeks'), where('studentId', '==', currentUser.uid))),
          getDocs(query(collection(db, 'daily_assignments'), where('studentId', '==', currentUser.uid))),
          getDocs(collection(db, 'daily_bank')),
          getDocs(query(collection(db, 'extra_contents'), where('assignedTo', 'array-contains-any', [currentUser.uid, 'all'])))
        ]);

        const allWeeks = weeksSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(w => inCourse(w, activeCourse));
        allWeeks.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
        setWeeks(allWeeks.map((w, i) => ({ ...w, number: i + 1 })).reverse());

        const bank = Object.fromEntries(bankSnap.docs.map(d => [d.id, d.data()]));
        setDailies(assignSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(a => a.status === 'completed' && inCourse(a, activeCourse) && bank[a.contentId])
          .map(a => ({ ...a, content: bank[a.contentId] }))
          .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || '')));

        const seen = userData?.completedExtraContents || [];
        setExtras(extrasSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => seen.includes(c.id) && inCourse(c, activeCourse)));
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    load();
  }, [currentUser, activeCourse]); // eslint-disable-line react-hooks/exhaustive-deps

  const groupedWeeks = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = weeks.filter(w =>
      (!onlyTasks || w.task) &&
      (!q || (w.title || '').toLowerCase().includes(q) || (w.description || '').toLowerCase().includes(q))
    );
    const groups = [];
    filtered.forEach(w => {
      const key = monthKey(w);
      const group = groups.find(g => g.key === key);
      if (group) group.weeks.push(w);
      else groups.push({ key, weeks: [w] });
    });
    return groups;
  }, [weeks, search, onlyTasks]);

  const monthLabel = (key) => {
    const [y, m] = key.split('-');
    return `${h.months[Number(m) - 1]} ${y}`;
  };

  const tabButton = (id, label, count) => (
    <button key={id} onClick={() => setTab(id)} style={{ padding: '10px 18px', borderRadius: 99, border: `1px solid ${tab === id ? 'var(--plum)' : 'var(--line)'}`, background: tab === id ? 'var(--plum)' : 'var(--paper)', color: tab === id ? '#fff' : 'var(--text)', fontWeight: 800, cursor: 'pointer' }}>
      {label} <span style={{ opacity: 0.7 }}>({count})</span>
    </button>
  );

  const emptyBox = (text) => (
    <div style={{ background: 'var(--paper)', padding: 30, borderRadius: 20, textAlign: 'center', border: '1px dashed var(--line)', color: 'var(--muted)' }}>{text}</div>
  );

  return (
    <main style={{ maxWidth: 1040, margin: '0 auto', padding: '40px 20px 90px', width: '100%' }}>
      <p className="eyebrow">{h.historyTitle}</p>
      <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2.8rem', color: 'var(--text)', margin: '0 0 8px' }}>{h.historyTitle}</h1>
      <p style={{ color: 'var(--muted)', margin: '0 0 25px' }}>{h.historySubtitle}</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 25 }}>
        {tabButton('weeks', h.historyWeeks, weeks.length)}
        {tabButton('dailies', h.historyDailies, dailies.length)}
        {tabButton('extras', h.historyExtras, extras.length)}
      </div>

      {loading ? (
        <p style={{ color: 'var(--muted)' }}>{h.loading}</p>
      ) : tab === 'weeks' ? (
        <>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 25 }}>
            <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder={h.historySearch} style={{ flex: 1, minWidth: 220, padding: '12px 18px', borderRadius: 99, border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--text)' }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)', cursor: 'pointer', fontWeight: 700 }}>
              <input type="checkbox" checked={onlyTasks} onChange={e => setOnlyTasks(e.target.checked)} /> {h.historyOnlyTasks}
            </label>
          </div>
          {groupedWeeks.length === 0 ? emptyBox(h.historyEmptyWeeks) : groupedWeeks.map(g => (
            <section key={g.key} style={{ marginBottom: 30 }}>
              <h2 style={{ fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--amber)', margin: '0 0 12px' }}>{monthLabel(g.key)}</h2>
              <div className="weeks-grid">
                {g.weeks.map(week => (
                  <article key={week.id} className="week-card" onClick={() => navigate('/', { state: { openWeekId: week.id, _t: Date.now() } })}>
                    <div className="card-head">
                      <p className="card-number">{h.weekLabel} {week.number}</p>
                      <h2 className="card-title">{week.title}</h2>
                      {week.task && <span style={{ display: 'inline-block', marginTop: 6, fontSize: '0.7rem', fontWeight: 800, color: 'var(--amber)', textTransform: 'uppercase' }}>{h.hasTask}</span>}
                    </div>
                    <div className="card-body">
                      <p className="card-focus">{week.description}</p>
                      <div className="card-cta"><span>{h.seeMaterial}</span><span>→</span></div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </>
      ) : tab === 'dailies' ? (
        dailies.length === 0 ? emptyBox(h.historyEmptyDailies) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {dailies.map(d => (
              <button key={d.id} onClick={() => setReading(d)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '18px 20px', borderRadius: 18, border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--text)', textAlign: 'left', cursor: 'pointer' }}>
                <span>
                  <strong style={{ display: 'block', fontSize: '1.05rem' }}>{d.content.title}</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{new Date(d.completedAt || d.scheduledDate).toLocaleDateString(activeCourse === 'es' ? 'es-ES' : 'pt-BR')}</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {d.totalQuestions > 0 && <span style={{ background: 'var(--cream)', padding: '4px 10px', borderRadius: 99, fontSize: '0.8rem', fontWeight: 800, color: d.score === d.totalQuestions ? '#2ed573' : 'var(--plum)' }}>{h.historyScore(d.score, d.totalQuestions)}</span>}
                  <span style={{ color: 'var(--amber)', fontWeight: 800 }}>{h.historyReread} →</span>
                </span>
              </button>
            ))}
          </div>
        )
      ) : (
        extras.length === 0 ? emptyBox(h.historyEmptyExtras) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 15 }}>
            {extras.map(c => (
              <article key={c.id} style={{ background: 'var(--paper)', borderRadius: 16, border: '1px solid var(--line)', padding: 16, display: 'grid', gap: 8 }}>
                <strong style={{ color: 'var(--text)' }}>✓ {c.title}</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{[c.level, c.type].filter(Boolean).join(' • ')}</span>
                {c.summary && <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.5 }}>{c.summary}</p>}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(c.links || []).map((link, i) => (
                    <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" style={{ padding: '6px 12px', background: 'var(--cream)', border: '1px solid var(--line)', borderRadius: 8, fontSize: '0.75rem', color: 'var(--plum)', textDecoration: 'none', fontWeight: 700 }}>↗ {link.platform}</a>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )
      )}

      {reading && (
        <div onClick={() => setReading(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(10,6,18,0.7)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--paper)', width: '100%', maxWidth: 720, maxHeight: '90vh', overflowY: 'auto', borderRadius: 28, border: '1px solid var(--line)', padding: '30px 30px 20px', color: 'var(--text)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
              <h2 style={{ fontFamily: '"Playfair Display", serif', margin: '0 0 20px' }}>{reading.content.title}</h2>
              <button onClick={() => setReading(null)} style={{ background: 'var(--cream)', border: '1px solid var(--line)', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', color: 'var(--text)', flexShrink: 0 }}>✕</button>
            </div>
            <div style={{ borderLeft: '2px solid var(--amber)', paddingLeft: 20, fontFamily: 'Georgia, serif', fontSize: '1.1rem' }}>
              <DailyText content={reading.content.content} />
            </div>
            {(reading.content.questions || []).map((q, i) => {
              const mine = reading.studentAnswers?.[i];
              return (
                <div key={i} style={{ marginTop: 18, padding: 14, borderRadius: 14, background: 'var(--cream)' }}>
                  <p style={{ margin: '0 0 8px', fontWeight: 700 }}>{i + 1}. {q.questionText}</p>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: mine === q.correctOption ? '#2ed573' : '#ff6b6b' }}>
                    {h.historyYourAnswer}: {mine ? `${mine}) ${q.options?.[mine] || ''}` : '—'}
                  </p>
                  {mine !== q.correctOption && <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#2ed573' }}>{h.historyCorrect}: {q.correctOption}) {q.options?.[q.correctOption]}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
