import { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { EPISODES as STATIC_EPISODES } from '../../data/libraryData';

export default function LibraryAdminTab({ setLoading }) {
  const [episodes, setEpisodes] = useState([]);
  const [editingEpisode, setEditingEpisode] = useState(null);

  // Form states
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [level, setLevel] = useState('easy-peasy');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [type, setType] = useState('Video');
  const [tags, setTags] = useState('');
  const [externalLink, setExternalLink] = useState('');
  
  const [hasVideo, setHasVideo] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [embed, setEmbed] = useState('');
  const [videoFile, setVideoFile] = useState('');
  const [audioFile, setAudioFile] = useState('');
  
  const [summaryEn, setSummaryEn] = useState('');
  const [summaryPt, setSummaryPt] = useState('');
  const [transcript, setTranscript] = useState('');
  
  const [vocabulary, setVocabulary] = useState([]);
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    fetchEpisodes();
  }, []);

  const fetchEpisodes = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'library_episodes'));
      setEpisodes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleMigrateStatic = async () => {
    if (!window.confirm(`Tem certeza que deseja migrar ${STATIC_EPISODES.length} episódios estáticos para o Firestore?`)) return;
    setLoading(true);
    try {
      for (const ep of STATIC_EPISODES) {
        // Mapeia para o novo formato ou salva como está (evitando conflito com ID do documento vs ep.id estático)
        const payload = { ...ep, originalId: ep.id, migratedAt: new Date().toISOString() };
        delete payload.id; // deixa o firestore criar um id
        await addDoc(collection(db, 'library_episodes'), payload);
      }
      alert("Migração concluída com sucesso!");
      fetchEpisodes();
    } catch (err) {
      console.error(err);
      alert("Erro ao migrar.");
    }
    setLoading(false);
  };

  const startEdit = (ep = null) => {
    if (ep) {
      setEditingEpisode(ep);
      setTitle(ep.title || '');
      setSource(ep.source || '');
      setLevel(ep.level || 'easy-peasy');
      setEstimatedTime(ep.estimatedTime || '');
      setType(ep.type || 'Video');
      setTags((ep.tags || []).join(', '));
      setExternalLink(ep.externalLink || '');
      
      setHasVideo(ep.hasVideo || false);
      setHasAudio(ep.hasAudio || false);
      setEmbed(ep.embed || '');
      setVideoFile(ep.videoFile || '');
      setAudioFile(ep.audioFile || '');
      
      setSummaryEn(ep.summary?.en || '');
      setSummaryPt(ep.summary?.pt || '');
      setTranscript(ep.transcript || '');
      
      setVocabulary(ep.vocabulary || []);
      setQuestions(ep.questions || []);
    } else {
      setEditingEpisode('new');
      setTitle(''); setSource(''); setLevel('easy-peasy'); setEstimatedTime(''); setType('Video'); setTags(''); setExternalLink('');
      setHasVideo(false); setHasAudio(false); setEmbed(''); setVideoFile(''); setAudioFile('');
      setSummaryEn(''); setSummaryPt(''); setTranscript('');
      setVocabulary([]); setQuestions([]);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingEpisode(null);
  };

  const handleSave = async () => {
    if (!title) return alert("Preencha o título.");
    setLoading(true);
    try {
      const payload = {
        title, source, level, estimatedTime, type, externalLink,
        hasVideo, hasAudio, embed, videoFile, audioFile,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        summary: { en: summaryEn, pt: summaryPt },
        transcript: transcript || null,
        vocabulary,
        questions,
        updatedAt: new Date().toISOString()
      };

      if (editingEpisode !== 'new') {
        await updateDoc(doc(db, 'library_episodes', editingEpisode.id), payload);
      } else {
        await addDoc(collection(db, 'library_episodes'), { ...payload, createdAt: new Date().toISOString() });
      }
      cancelEdit();
      fetchEpisodes();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar.");
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Excluir este episódio da biblioteca?")) return;
    setLoading(true);
    await deleteDoc(doc(db, 'library_episodes', id));
    fetchEpisodes();
  };

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>Biblioteca (Episódios & PDFs)</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => startEdit()} style={{ padding: '8px 16px', background: 'var(--amber)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}>
            + Novo Conteúdo
          </button>
          {episodes.length === 0 && (
            <button onClick={handleMigrateStatic} style={{ padding: '8px 16px', background: '#333', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}>
              ⚠️ Migrar libraryData.js
            </button>
          )}
        </div>
      </div>

      {editingEpisode && (
        <div style={{ padding: 25, border: '2px solid var(--plum)', borderRadius: 20, background: 'var(--paper)', marginBottom: 30 }}>
          <h3 style={{ margin: '0 0 20px', color: 'var(--plum)' }}>{editingEpisode === 'new' ? '+ Criar Novo Conteúdo' : '✏️ Editando Conteúdo'}</h3>
          
          <div style={{ display: 'grid', gap: 20 }}>
            <div style={{ display: 'flex', gap: 15 }}>
              <div style={{ flex: 2 }}><label>Título</label><input type="text" value={title} onChange={e=>setTitle(e.target.value)} style={inputStyle} /></div>
              <div style={{ flex: 1 }}><label>Fonte (Autor/Canal)</label><input type="text" value={source} onChange={e=>setSource(e.target.value)} style={inputStyle} /></div>
            </div>
            
            <div style={{ display: 'flex', gap: 15 }}>
              <div style={{ flex: 1 }}>
                <label>Nível</label>
                <select value={level} onChange={e=>setLevel(e.target.value)} style={inputStyle}>
                  <option value="easy-peasy">Easy Peasy</option><option value="easy">Easy</option>
                  <option value="medium">Medium</option><option value="hard">Hard</option>
                </select>
              </div>
              <div style={{ flex: 1 }}><label>Tempo (ex: 5 min)</label><input type="text" value={estimatedTime} onChange={e=>setEstimatedTime(e.target.value)} style={inputStyle} /></div>
              <div style={{ flex: 1 }}><label>Tipo (Vídeo, PDF, etc)</label><input type="text" value={type} onChange={e=>setType(e.target.value)} style={inputStyle} /></div>
            </div>

            <div style={{ display: 'flex', gap: 15 }}>
              <div style={{ flex: 1 }}><label>Tags (vírgula)</label><input type="text" value={tags} onChange={e=>setTags(e.target.value)} style={inputStyle} /></div>
              <div style={{ flex: 1 }}><label>Link Externo / PDF URL</label><input type="text" value={externalLink} onChange={e=>setExternalLink(e.target.value)} style={inputStyle} /></div>
            </div>

            <div style={{ padding: 20, border: '1px solid var(--line)', borderRadius: 12, background: 'var(--cream)' }}>
              <h4 style={{ margin: '0 0 15px' }}>Mídia</h4>
              <div style={{ display: 'flex', gap: 20, marginBottom: 15 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}><input type="checkbox" checked={hasVideo} onChange={e=>setHasVideo(e.target.checked)} /> Tem Vídeo?</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}><input type="checkbox" checked={hasAudio} onChange={e=>setHasAudio(e.target.checked)} /> Tem Áudio?</label>
              </div>
              <div style={{ display: 'grid', gap: 15 }}>
                <div><label>Embed (código do iframe do YouTube)</label><textarea rows={3} value={embed} onChange={e=>setEmbed(e.target.value)} style={inputStyle} /></div>
                <div style={{ display: 'flex', gap: 15 }}>
                  <div style={{ flex: 1 }}><label>Arquivo de Vídeo (.mp4 na /public)</label><input type="text" value={videoFile} onChange={e=>setVideoFile(e.target.value)} style={inputStyle} /></div>
                  <div style={{ flex: 1 }}><label>Arquivo de Áudio (.mp3 na /public)</label><input type="text" value={audioFile} onChange={e=>setAudioFile(e.target.value)} style={inputStyle} /></div>
                </div>
              </div>
            </div>

            <div style={{ padding: 20, border: '1px solid var(--line)', borderRadius: 12, background: 'var(--cream)' }}>
              <h4 style={{ margin: '0 0 15px' }}>Textos</h4>
              <div style={{ display: 'grid', gap: 15 }}>
                <div><label>Resumo (Inglês)</label><textarea rows={3} value={summaryEn} onChange={e=>setSummaryEn(e.target.value)} style={inputStyle} /></div>
                <div><label>Resumo (Português)</label><textarea rows={3} value={summaryPt} onChange={e=>setSummaryPt(e.target.value)} style={inputStyle} /></div>
                <div><label>Transcrição (pode pular se for link ou vídeo simples)</label><textarea rows={6} value={transcript} onChange={e=>setTranscript(e.target.value)} style={inputStyle} /></div>
              </div>
            </div>

            {/* Vocab e Questions */}
            <div style={{ display: 'flex', gap: 20 }}>
              <div style={{ flex: 1, padding: 20, border: '1px solid var(--line)', borderRadius: 12, background: 'var(--cream)' }}>
                <h4 style={{ margin: '0 0 15px' }}>Key Words ({vocabulary.length})</h4>
                {vocabulary.map((v, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                    <input type="text" placeholder="Termo" value={v.term} onChange={e => { const n = [...vocabulary]; n[i].term = e.target.value; setVocabulary(n); }} style={inputStyle} />
                    <input type="text" placeholder="Significado" value={v.meaning} onChange={e => { const n = [...vocabulary]; n[i].meaning = e.target.value; setVocabulary(n); }} style={inputStyle} />
                    <button onClick={() => setVocabulary(vocabulary.filter((_, idx) => idx !== i))} style={{ background: 'transparent', color: 'red', border: 'none', cursor: 'pointer' }}>X</button>
                  </div>
                ))}
                <button onClick={() => setVocabulary([...vocabulary, {term:'', meaning:''}])} style={{ padding: '8px 12px', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 8, cursor: 'pointer', width: '100%', fontWeight: 'bold' }}>+ Adicionar Palavra</button>
              </div>

              <div style={{ flex: 1, padding: 20, border: '1px solid var(--line)', borderRadius: 12, background: 'var(--cream)' }}>
                <h4 style={{ margin: '0 0 15px' }}>Perguntas ({questions.length})</h4>
                {questions.map((q, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                    <input type="text" placeholder="Qual é a pergunta?" value={q.label} onChange={e => { const n = [...questions]; n[i].label = e.target.value; setQuestions(n); }} style={inputStyle} />
                    <button onClick={() => setQuestions(questions.filter((_, idx) => idx !== i))} style={{ background: 'transparent', color: 'red', border: 'none', cursor: 'pointer' }}>X</button>
                  </div>
                ))}
                <button onClick={() => setQuestions([...questions, {label: '', name: `question_${questions.length+1}`}])} style={{ padding: '8px 12px', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 8, cursor: 'pointer', width: '100%', fontWeight: 'bold' }}>+ Adicionar Pergunta</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 15, marginTop: 15 }}>
              <button onClick={handleSave} style={{ padding: '14px 28px', background: 'var(--plum)', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 800, cursor: 'pointer' }}>Salvar Conteúdo</button>
              <button onClick={cancelEdit} style={{ padding: '14px 28px', background: 'transparent', border: '1px solid var(--line)', color: 'var(--text)', borderRadius: 12, fontWeight: 800, cursor: 'pointer' }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gap: 15 }}>
        {episodes.map(ep => (
          <div key={ep.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 20, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 16 }}>
            <div>
              <span style={{ fontSize: '0.7rem', background: 'rgba(138, 124, 255, 0.15)', padding: '4px 10px', borderRadius: 99, color: 'var(--purple)', fontWeight: 'bold', textTransform: 'uppercase', marginRight: 10 }}>{ep.level}</span>
              <span style={{ fontSize: '0.7rem', background: 'var(--cream)', padding: '4px 10px', borderRadius: 99, color: 'var(--muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>{ep.type}</span>
              <h3 style={{ margin: '8px 0 4px', fontSize: '1.2rem', fontFamily: '"Playfair Display", serif' }}>{ep.title}</h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted)' }}>{ep.source}</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => startEdit(ep)} style={{ padding: '8px 16px', background: 'var(--cream)', border: '1px solid var(--line)', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}>Editar</button>
              <button onClick={() => handleDelete(ep.id)} style={{ padding: '8px 16px', background: 'transparent', color: 'red', border: '1px solid red', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}>Excluir</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid var(--line)',
  outline: 'none',
  fontFamily: 'inherit',
  background: 'var(--paper)',
  color: 'var(--text)',
  display: 'block',
  marginTop: 4
};
