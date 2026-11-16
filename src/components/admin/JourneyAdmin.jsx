import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getUserCourses, COURSES } from '../../data/courses';
import { CITY_XP, cityState, countryAt, getJourney, newJourney, releaseNext, cleanTags } from '../../data/journey';
import Flag from '../Flag';

const input = { width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)', boxSizing: 'border-box' };
const smallBtn = { padding: '6px 10px', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontWeight: 700 };

// Viagem do aluno no admin: tema atual, roteiro de próximos temas e o botão de liberar o próximo país.
// Tema e tags são livres; as tags (opcionais) vão servir para escolher Dailies e episódios do tema.
export default function JourneyAdmin({ student, onChange }) {
  const courses = getUserCourses(student);
  const [course, setCourse] = useState(courses[0]);
  const [saving, setSaving] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [newTags, setNewTags] = useState('');

  const xp = student.xp || 0;
  const journey = getJourney(student, course) || newJourney(0);
  const state = cityState(journey, xp, course);
  const next = countryAt(course, journey.current.countryIndex + 1);
  const [topic, setTopic] = useState(journey.current.topic || '');
  const [tags, setTags] = useState((journey.current.tags || []).join(', '));

  const switchCourse = (c) => {
    const j = getJourney(student, c) || newJourney(0);
    setCourse(c);
    setTopic(j.current.topic || '');
    setTags((j.current.tags || []).join(', '));
  };

  const save = async (updated) => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', student.id), { [`journey.${course}`]: updated });
      onChange({ ...student, journey: { ...(student.journey || {}), [course]: updated } });
    } catch (err) {
      console.error(err);
      alert('Não foi possível salvar a viagem.');
    }
    setSaving(false);
  };

  const saveCurrent = () => save({ ...journey, current: { ...journey.current, topic: topic.trim(), tags: cleanTags(tags) } });

  const addUpcoming = () => {
    if (!newTopic.trim()) return;
    save({ ...journey, upcoming: [...(journey.upcoming || []), { topic: newTopic.trim(), tags: cleanTags(newTags) }] });
    setNewTopic(''); setNewTags('');
  };

  const moveUpcoming = (i, dir) => {
    const list = [...(journey.upcoming || [])];
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    save({ ...journey, upcoming: list });
  };

  const removeUpcoming = (i) => save({ ...journey, upcoming: journey.upcoming.filter((_, k) => k !== i) });

  const release = async () => {
    const typed = newTopic.trim() ? { topic: newTopic.trim(), tags: cleanTags(newTags) } : null;
    const nextTopic = typed?.topic || journey.upcoming?.[0]?.topic;
    if (!nextTopic) { alert('Escreva o próximo tema (ou anote um no roteiro) antes de liberar.'); return; }
    if (!window.confirm(`Liberar "${nextTopic}"? ${student.name} voa para ${next.name} agora, e ${state.country.name} vai para o passaporte.`)) return;
    const updated = releaseNext({ ...journey, current: { ...journey.current, topic: topic.trim() || journey.current.topic, tags: cleanTags(tags) } }, xp, course, typed);
    await save(updated);
    setTopic(updated.current.topic);
    setTags(updated.current.tags.join(', '));
    setNewTopic(''); setNewTags('');
  };

  return (
    <div style={{ padding: 16, borderRadius: 14, border: '1px solid var(--line)', background: 'var(--bg)', display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <strong style={{ color: 'var(--text)' }}>✈️ Viagem do aluno</strong>
        {courses.length > 1 && (
          <div style={{ display: 'flex', gap: 6 }}>
            {courses.map(c => (
              <button key={c} type="button" onClick={() => switchCourse(c)} style={{ ...smallBtn, background: c === course ? 'var(--amber)' : 'transparent', color: c === course ? '#fff' : 'var(--text)' }}>{COURSES[c].short}</button>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, background: 'var(--paper)' }}>
        <Flag code={state.country.code} size={30} />
        <div style={{ fontSize: '0.9rem', color: 'var(--text)' }}>
          <strong>{state.country.name}</strong> · {state.cityName} (cidade {state.cityIndex + 1} de {CITY_XP.length})
          <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{xp} XP no total · {state.done ? 'visitou todas as cidades' : `faltam ${state.toNext} XP para ${state.nextCityName}`}</div>
        </div>
      </div>

      <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text)' }}>Tema atual</label>
      <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Ex: Simple Present" style={input} />
      <input value={tags} onChange={e => setTags(e.target.value)} placeholder="Tags (opcional, separadas por vírgula): present simple, presente simple" style={input} />
      <button type="button" disabled={saving} onClick={saveCurrent} style={{ ...smallBtn, justifySelf: 'start' }}>Salvar tema atual</button>

      <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text)', marginTop: 6 }}>Próximos temas (roteiro)</label>
      {(journey.upcoming || []).length === 0 && <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.85rem' }}>Nada anotado. O aluno vê "Próximo tema em breve".</p>}
      {(journey.upcoming || []).map((u, i) => (
        <div key={`${u.topic}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, background: 'var(--paper)' }}>
          <span style={{ flex: 1, color: 'var(--text)', fontSize: '0.9rem' }}>
            <Flag code={countryAt(course, journey.current.countryIndex + 1 + i).code} size={16} /> <strong>{u.topic}</strong>
            {u.tags?.length > 0 && <span style={{ color: 'var(--muted)' }}> · {u.tags.join(', ')}</span>}
          </span>
          <button type="button" disabled={saving || i === 0} onClick={() => moveUpcoming(i, -1)} style={smallBtn}>↑</button>
          <button type="button" disabled={saving || i === journey.upcoming.length - 1} onClick={() => moveUpcoming(i, 1)} style={smallBtn}>↓</button>
          <button type="button" disabled={saving} onClick={() => removeUpcoming(i)} style={{ ...smallBtn, color: '#ff4d4d' }}>✕</button>
        </div>
      ))}
      <input value={newTopic} onChange={e => setNewTopic(e.target.value)} placeholder="Novo tema. Ex: Present Perfect" style={input} />
      <input value={newTags} onChange={e => setNewTags(e.target.value)} placeholder="Tags do novo tema (opcional)" style={input} />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button type="button" disabled={saving || !newTopic.trim()} onClick={addUpcoming} style={smallBtn}>+ Anotar no roteiro</button>
        <button type="button" disabled={saving} onClick={release} style={{ ...smallBtn, background: 'var(--purple)', color: '#fff', border: 'none' }}>
          ✈️ Liberar próximo tema ({next.name})
        </button>
      </div>
      <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.8rem' }}>"Liberar" usa o tema escrito acima ou, se estiver vazio, o primeiro do roteiro. O aluno vai para o próximo país na hora, mesmo sem ter passado por todas as cidades.</p>
    </div>
  );
}
