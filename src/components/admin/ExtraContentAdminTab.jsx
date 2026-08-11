import { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import AdminModal from './AdminModal';

export default function ExtraContentAdminTab({ setLoading, students }) {
  const [contents, setContents] = useState([]);
  const [editingContent, setEditingContent] = useState(null);
  
  // Form states
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [level, setLevel] = useState('A1');
  const [imageUrl, setImageUrl] = useState('');
  const [type, setType] = useState('podcast');
  const [links, setLinks] = useState([]);
  
  const [assignedTo, setAssignedTo] = useState(['all']);

  useEffect(() => {
    fetchContents();
  }, []);

  const fetchContents = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'extra_contents'));
      setContents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const startEdit = (content = null) => {
    if (content) {
      setEditingContent(content);
      setTitle(content.title || '');
      setSummary(content.summary || '');
      setLevel(content.level || 'A1');
      setImageUrl(content.image || '');
      setType(content.type || 'podcast');
      setLinks(content.links || []);
      setAssignedTo(content.assignedTo || ['all']);
    } else {
      setEditingContent('new');
      setTitle('');
      setSummary('');
      setLevel('A1');
      setImageUrl('');
      setType('podcast');
      setLinks([]);
      setAssignedTo(['all']);
    }
  };

  const cancelEdit = () => {
    setEditingContent(null);
  };

  const saveContent = async () => {
    if (!editingContent) return;
    if (!title) return alert('O título é obrigatório.');
    
    setLoading(true);
    try {
      const payload = {
        title,
        summary,
        level,
        image: imageUrl,
        type,
        links,
        assignedTo,
        updatedAt: new Date().toISOString()
      };

      if (editingContent === 'new') {
        payload.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'extra_contents'), payload);
      } else {
        await updateDoc(doc(db, 'extra_contents', editingContent.id), payload);
      }
      
      cancelEdit();
      fetchContents();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar conteúdo.');
    }
    setLoading(false);
  };

  const deleteContent = async (id) => {
    if (!window.confirm('Tem certeza que deseja remover este conteúdo?')) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'extra_contents', id));
      fetchContents();
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir conteúdo.');
    }
    setLoading(false);
  };

  const addLink = () => {
    setLinks([...links, { platform: 'Spotify', url: '' }]);
  };

  const updateLink = (index, field, value) => {
    const newLinks = [...links];
    newLinks[index][field] = value;
    setLinks(newLinks);
  };

  const removeLink = (index) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const toggleStudent = (studentId) => {
    if (studentId === 'all') {
      setAssignedTo(['all']);
      return;
    }
    let newAssigned = [...assignedTo].filter(id => id !== 'all');
    if (newAssigned.includes(studentId)) {
      newAssigned = newAssigned.filter(id => id !== studentId);
      if (newAssigned.length === 0) newAssigned = ['all'];
    } else {
      newAssigned.push(studentId);
    }
    setAssignedTo(newAssigned);
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>Conteúdos Extras Recomendados</h2>
        <button className="admin-btn-primary" onClick={() => startEdit(null)}>+ Novo Conteúdo</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
        {contents.length === 0 ? (
          <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '40px 0' }}>Nenhum conteúdo extra cadastrado.</p>
        ) : (
          contents.map(c => (
            <div key={c.id} style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 16, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
                {c.image && <img src={c.image} alt={c.title} style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover' }} />}
                <div>
                  <h3 style={{ margin: '0 0 5px' }}>{c.title}</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>
                    Nível: {c.level} | Tipo: {c.type} | {c.links?.length || 0} link(s)
                  </p>
                  <p style={{ margin: '5px 0 0', fontSize: '0.85rem', color: 'var(--plum)' }}>
                    Atribuído a: {c.assignedTo.includes('all') ? 'Todos os alunos' : `${c.assignedTo.length} aluno(s)`}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="admin-btn-secondary" onClick={() => startEdit(c)}>Editar</button>
                <button className="admin-btn-danger" onClick={() => deleteContent(c.id)}>Excluir</button>
              </div>
            </div>
          ))
        )}
      </div>

      {editingContent && (
        <AdminModal isOpen={!!editingContent} onClose={cancelEdit} title={editingContent === 'new' ? 'Novo Conteúdo' : 'Editar Conteúdo'}>
          <div style={{ display: 'grid', gap: 15 }}>
            <div className="admin-form-group">
              <label>Título</label>
              <input type="text" className="admin-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Podcast de Listening B1" />
            </div>
            
            <div className="admin-form-group">
              <label>Resumo</label>
              <textarea className="admin-input" value={summary} onChange={e => setSummary(e.target.value)} rows={3} placeholder="Breve descrição do conteúdo..." />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
              <div className="admin-form-group">
                <label>Nível</label>
                <select className="admin-input" value={level} onChange={e => setLevel(e.target.value)}>
                  <option value="A1">A1</option>
                  <option value="A2">A2</option>
                  <option value="B1">B1</option>
                  <option value="B2">B2</option>
                  <option value="C1">C1</option>
                  <option value="C2">C2</option>
                </select>
              </div>
              
              <div className="admin-form-group">
                <label>Tipo</label>
                <select className="admin-input" value={type} onChange={e => setType(e.target.value)}>
                  <option value="podcast">Podcast</option>
                  <option value="book">Livro</option>
                  <option value="pdf">PDF</option>
                  <option value="video">Vídeo</option>
                  <option value="link">Outro Link</option>
                </select>
              </div>
            </div>
            
            <div className="admin-form-group">
              <label>URL da Imagem (Opcional)</label>
              <input type="text" className="admin-input" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." />
              {imageUrl && <img src={imageUrl} alt="Preview" style={{ marginTop: 10, width: 80, height: 80, borderRadius: 8, objectFit: 'cover' }} />}
            </div>
            
            <div className="admin-form-group">
              <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                Links
                <button type="button" onClick={addLink} style={{ background: 'none', border: 'none', color: 'var(--plum)', cursor: 'pointer', fontWeight: 'bold' }}>+ Add Link</button>
              </label>
              {links.map((link, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
                  <input type="text" className="admin-input" value={link.platform} onChange={e => updateLink(idx, 'platform', e.target.value)} placeholder="Plataforma (ex: Spotify)" style={{ width: '30%' }} />
                  <input type="text" className="admin-input" value={link.url} onChange={e => updateLink(idx, 'url', e.target.value)} placeholder="URL do link" style={{ width: '60%' }} />
                  <button type="button" onClick={() => removeLink(idx)} style={{ background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
                </div>
              ))}
              {links.length === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Nenhum link adicionado.</p>}
            </div>

            <div className="admin-form-group" style={{ background: 'var(--cream)', padding: 15, borderRadius: 12 }}>
              <label style={{ marginBottom: 10, display: 'block' }}>Atribuir para:</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                  <input type="checkbox" checked={assignedTo.includes('all')} onChange={() => toggleStudent('all')} />
                  <strong>Todos os Alunos</strong>
                </label>
                {students?.map(s => (
                  <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', opacity: assignedTo.includes('all') ? 0.5 : 1 }}>
                    <input type="checkbox" disabled={assignedTo.includes('all')} checked={assignedTo.includes(s.id)} onChange={() => toggleStudent(s.id)} />
                    {s.displayName || s.email}
                  </label>
                ))}
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <button className="admin-btn-secondary" onClick={cancelEdit}>Cancelar</button>
              <button className="admin-btn-primary" onClick={saveContent}>Salvar Conteúdo</button>
            </div>
          </div>
        </AdminModal>
      )}
    </div>
  );
}
