import { useState, useEffect } from 'react';
import { db, storage } from '../../config/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function VoiceLabAdminTab({ setLoading }) {
  const [challenges, setChallenges] = useState([]);
  const [editingChallenge, setEditingChallenge] = useState(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState('Easy Peasy');
  const [tags, setTags] = useState('');
  const [coverImage, setCoverImage] = useState(null);
  const [coverImageUrl, setCoverImageUrl] = useState('');
  
  const [lines, setLines] = useState([]); 

  const loadChallenges = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'voice_lab_challenges'));
      setChallenges(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.createdAt?.localeCompare(a.createdAt)));
    } catch (err) {
      console.error(err);
      alert('Erro ao carregar desafios.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadChallenges();
  }, []);

  const handleEdit = (challenge) => {
    setEditingChallenge(challenge);
    setTitle(challenge.title || '');
    setDescription(challenge.description || '');
    setLevel(challenge.level || 'Easy Peasy');
    setTags((challenge.tags || []).join(', '));
    setCoverImageUrl(challenge.coverImageUrl || '');
    setCoverImage(null);
    setLines(challenge.lines || []);
  };

  const handleCreateNew = () => {
    setEditingChallenge(null);
    setTitle('');
    setDescription('');
    setLevel('Easy Peasy');
    setTags('');
    setCoverImageUrl('');
    setCoverImage(null);
    setLines([]);
  };

  const addLine = () => {
    setLines([...lines, { id: Date.now().toString(), originalText: '', translation: '', audioUrl: '', audioFile: null }]);
  };

  const removeLine = (id) => {
    setLines(lines.filter(l => l.id !== id));
  };

  const updateLine = (id, field, value) => {
    setLines(lines.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const handleSave = async () => {
    if (!title) return alert('O título é obrigatório.');
    if (lines.length === 0) return alert('Adicione pelo menos uma linha de diálogo.');

    setLoading(true);
    try {
      let finalCoverUrl = coverImageUrl;
      if (coverImage) {
        const coverRef = ref(storage, `voice_lab/covers/${Date.now()}_${coverImage.name}`);
        await uploadBytes(coverRef, coverImage);
        finalCoverUrl = await getDownloadURL(coverRef);
      }

      // Upload audios for lines that have new files
      const finalLines = await Promise.all(lines.map(async (line) => {
        let finalAudioUrl = line.audioUrl;
        if (line.audioFile) {
          const audioRef = ref(storage, `voice_lab/audio/${Date.now()}_${line.audioFile.name}`);
          await uploadBytes(audioRef, line.audioFile);
          finalAudioUrl = await getDownloadURL(audioRef);
        }
        return {
          id: line.id,
          originalText: line.originalText,
          translation: line.translation,
          audioUrl: finalAudioUrl
        };
      }));

      const payload = {
        title,
        description,
        level,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        coverImageUrl: finalCoverUrl,
        lines: finalLines,
        updatedAt: new Date().toISOString()
      };

      const docId = editingChallenge ? editingChallenge.id : Date.now().toString();
      if (!editingChallenge) {
        payload.createdAt = new Date().toISOString();
      }

      await setDoc(doc(db, 'voice_lab_challenges', docId), payload, { merge: true });
      alert('Desafio salvo com sucesso!');
      handleCreateNew();
      loadChallenges();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar desafio.');
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja apagar este desafio?')) {
      setLoading(true);
      await deleteDoc(doc(db, 'voice_lab_challenges', id));
      loadChallenges();
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', alignItems: 'start' }}>
      
      {/* Sidebar: Lista de Desafios */}
      <div style={{ background: 'var(--paper)', borderRadius: 16, padding: 20, border: '1px solid var(--line)' }}>
        <h2 style={{ margin: '0 0 20px', color: 'var(--amber)' }}>Challenges</h2>
        <button 
          onClick={handleCreateNew}
          style={{ width: '100%', padding: '10px', background: 'var(--amber)', color: '#000', border: 'none', borderRadius: 8, fontWeight: 'bold', marginBottom: 20, cursor: 'pointer' }}
        >
          + Novo Desafio
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {challenges.map(c => (
            <div key={c.id} style={{ padding: 12, background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '0.9rem', color: '#fff' }}>{c.title}</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{c.level} • {c.lines?.length || 0} linhas</span>
              </div>
              <div style={{ display: 'flex', gap: 5 }}>
                <button onClick={() => handleEdit(c)} style={{ padding: '5px 10px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>✏️</button>
                <button onClick={() => handleDelete(c.id)} style={{ padding: '5px 10px', background: '#4a1111', color: '#ff6b6b', border: 'none', borderRadius: 4, cursor: 'pointer' }}>🗑️</button>
              </div>
            </div>
          ))}
          {challenges.length === 0 && <p style={{ color: 'var(--muted)', textAlign: 'center', fontSize: '0.9rem' }}>Nenhum desafio criado.</p>}
        </div>
      </div>

      {/* Main Content: Form */}
      <div style={{ background: 'var(--paper)', borderRadius: 16, padding: 30, border: '1px solid var(--line)' }}>
        <h2 style={{ margin: '0 0 20px', color: 'var(--text)' }}>
          {editingChallenge ? 'Editar Desafio' : 'Criar Novo Desafio'}
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <div className="admin-form-group">
            <label>Título do Desafio</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: No Aeroporto" />
          </div>
          <div className="admin-form-group">
            <label>Nível</label>
            <select value={level} onChange={e => setLevel(e.target.value)}>
              <option value="Easy Peasy">Easy Peasy</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
        </div>

        <div className="admin-form-group" style={{ marginBottom: 20 }}>
          <label>Descrição / Contexto</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Descreva a situação do diálogo..." />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 30 }}>
          <div className="admin-form-group">
            <label>Tags (separadas por vírgula)</label>
            <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="Ex: Everyday, Movies, Vocabulary" />
          </div>
          <div className="admin-form-group">
            <label>Capa (Opcional)</label>
            <input type="file" accept="image/*" onChange={e => setCoverImage(e.target.files[0])} />
            {coverImageUrl && !coverImage && <a href={coverImageUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: 'var(--amber)', marginTop: 5, display: 'inline-block' }}>Ver Capa Atual</a>}
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '30px 0' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ color: 'var(--text)', margin: 0 }}>Cenas / Parágrafos</h3>
          <button onClick={addLine} style={{ padding: '8px 16px', background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}>+ Adicionar Linha</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 15, marginBottom: 30 }}>
          {lines.map((line, index) => (
            <div key={line.id} style={{ background: 'var(--bg)', border: '1px solid var(--line)', padding: 15, borderRadius: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15 }}>
                <strong style={{ color: 'var(--muted)' }}>Linha {index + 1}</strong>
                <button onClick={() => removeLine(line.id)} style={{ background: 'transparent', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '1rem' }}>✕ Remover</button>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 15 }}>
                <div className="admin-form-group" style={{ marginBottom: 0 }}>
                  <label>Original (Inglês)</label>
                  <textarea value={line.originalText} onChange={e => updateLine(line.id, 'originalText', e.target.value)} rows={2} />
                </div>
                <div className="admin-form-group" style={{ marginBottom: 0 }}>
                  <label>Tradução (Português)</label>
                  <textarea value={line.translation} onChange={e => updateLine(line.id, 'translation', e.target.value)} rows={2} />
                </div>
              </div>

              <div className="admin-form-group" style={{ marginBottom: 0 }}>
                <label>Mídia da Frase (.mp3, .mp4)</label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input type="file" accept="audio/*,video/mp4" onChange={e => updateLine(line.id, 'audioFile', e.target.files[0])} style={{ flex: 1 }} />
                  {line.audioUrl && !line.audioFile && (
                    line.audioUrl.includes('.mp4') ? (
                      <video controls src={line.audioUrl} style={{ height: 50, borderRadius: 8 }} />
                    ) : (
                      <audio controls src={line.audioUrl} style={{ height: 35 }} />
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
          {lines.length === 0 && <p style={{ color: 'var(--muted)', textAlign: 'center' }}>Clique em "+ Adicionar Linha" para começar o diálogo.</p>}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 15 }}>
          <button onClick={handleCreateNew} style={{ padding: '12px 24px', background: 'transparent', color: '#fff', border: '1px solid var(--line)', borderRadius: 8, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={handleSave} style={{ padding: '12px 30px', background: 'var(--amber)', color: '#000', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}>Salvar Desafio</button>
        </div>
      </div>
    </div>
  );
}
