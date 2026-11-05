import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { inCourse, getLevelLabel, COURSES } from '../../data/courses';
import { GAME_TYPES, GAME_LEVELS, parseGamesJson } from '../../data/games';

const inputStyle = { width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' };
const buttonStyle = { padding: '10px 18px', borderRadius: 8, border: 'none', fontWeight: 'bold', cursor: 'pointer' };

// Editor do jogo de imagem: escolha uma palavra e clique no lugar dela na imagem
function ImagePointEditor({ game, onClose, onSaved }) {
  const [items, setItems] = useState(game.items);
  const [selected, setSelected] = useState(items.findIndex(p => p.x === null));
  const [saving, setSaving] = useState(false);

  const handleImageClick = (e) => {
    if (selected < 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10;
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10;
    const next = items.map((p, i) => (i === selected ? { ...p, x, y } : p));
    setItems(next);
    // Pula para a próxima palavra ainda sem ponto
    setSelected(next.findIndex(p => p.x === null));
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'games', game.id), { items, updatedAt: new Date().toISOString() });
      onSaved();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar os pontos.');
    }
    setSaving(false);
  };

  return (
    <div style={{ padding: 20, marginBottom: 20, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 16 }}>
      <h3 style={{ marginTop: 0 }}>Marcar pontos — {game.title}</h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Escolha uma palavra e clique no lugar dela na imagem. Clique de novo para corrigir.</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {items.map((p, i) => (
          <button key={i} onClick={() => setSelected(i)} style={{ padding: '6px 12px', borderRadius: 99, cursor: 'pointer', fontWeight: 700, border: selected === i ? '2px solid var(--amber)' : '1px solid var(--line)', background: p.x !== null ? 'rgba(46,213,115,0.15)' : 'transparent', color: 'var(--text)' }}>
            {p.x !== null ? '✓ ' : ''}{p.word}
          </button>
        ))}
      </div>
      <div onClick={handleImageClick} style={{ position: 'relative', maxWidth: 600, cursor: selected >= 0 ? 'crosshair' : 'default' }}>
        <img src={game.imageUrl} alt={game.title} style={{ width: '100%', display: 'block', borderRadius: 12 }} draggable={false} />
        {items.map((p, i) => p.x !== null && (
          <span key={i} title={p.word} style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%)', width: 22, height: 22, borderRadius: '50%', background: selected === i ? 'var(--amber)' : 'var(--plum)', color: '#fff', fontSize: '0.7rem', fontWeight: 800, display: 'grid', placeItems: 'center', border: '2px solid #fff', pointerEvents: 'none' }}>{i + 1}</span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 15 }}>
        <button onClick={save} disabled={saving} style={{ ...buttonStyle, background: 'var(--purple)', color: '#fff' }}>{saving ? 'Salvando...' : 'Salvar pontos'}</button>
        <button onClick={onClose} style={{ ...buttonStyle, background: 'transparent', border: '1px solid var(--line)', color: 'var(--text)' }}>Fechar</button>
      </div>
    </div>
  );
}

export default function GamesAdminTab({ setLoading, adminCourse, decks, vocabWords }) {
  const [games, setGames] = useState([]);
  const [editingPoints, setEditingPoints] = useState(null);
  const [fromDeck, setFromDeck] = useState({ deckId: '', type: 'word_guess', level: '' });

  const fetchGames = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'games'));
      setGames(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(g => inCourse(g, adminCourse)).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchGames(); }, [adminCourse]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveGames = async (newGames) => {
    for (const g of newGames) {
      await addDoc(collection(db, 'games'), { ...g, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const { games: parsed, errors } = parseGamesJson(JSON.parse(event.target.result), adminCourse);
        if (parsed.length === 0) throw new Error(errors.join('\n') || 'Nenhum jogo encontrado.');
        const resumo = parsed.map(g => `• ${GAME_TYPES[g.type].label}: ${g.title} (${g.items.length} itens)`).join('\n');
        const avisos = errors.length ? `\n\nItens ignorados:\n${errors.join('\n')}` : '';
        if (!window.confirm(`Importar para ${COURSES[adminCourse].label}?\n\n${resumo}${avisos}`)) return;
        setLoading(true);
        await saveGames(parsed);
        await fetchGames();
        const semPontos = parsed.filter(g => g.type === 'image' && g.items.some(p => p.x === null));
        alert(`Jogos importados!${semPontos.length ? '\n\nAlguns pontos do jogo de imagem ainda não têm posição: use "Marcar pontos".' : ''}`);
      } catch (err) {
        console.error(err);
        alert('Erro ao importar:\n' + err.message);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  // Cria um Word Guess ou um Ouça e escolha a partir de um deck que já existe
  const handleCreateFromDeck = async () => {
    const deck = decks.find(d => d.id === fromDeck.deckId);
    if (!deck) return alert('Escolha um deck.');
    const words = (deck.wordIds || []).map(id => vocabWords.find(w => w.id === id)).filter(Boolean);
    if (words.length < 2) return alert('O deck precisa de pelo menos 2 palavras.');
    const items = fromDeck.type === 'word_guess'
      ? words.map(w => ({ word: w.term, hint: '', meaning: w.translation }))
      : words.map(w => ({ word: w.term, translation: w.translation, audioUrl: '' }));
    setLoading(true);
    try {
      await saveGames([{ type: fromDeck.type, title: deck.title, level: fromDeck.level, course: adminCourse, deckTitle: deck.title, items }]);
      await fetchGames();
      alert(`Jogo "${deck.title}" criado com ${items.length} palavras.`);
    } catch (err) {
      console.error(err);
      alert('Erro ao criar o jogo.');
    }
    setLoading(false);
  };

  const handleDelete = async (game) => {
    if (!window.confirm(`Excluir o jogo "${game.title}"? Os recordes dos alunos neste jogo ficam sem jogo.`)) return;
    await deleteDoc(doc(db, 'games', game.id));
    fetchGames();
  };

  const handleLevel = async (game, level) => {
    await updateDoc(doc(db, 'games', game.id), { level });
    setGames(prev => prev.map(g => (g.id === game.id ? { ...g, level } : g)));
  };

  return (
    <section>
      <h2>Jogos</h2>
      <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Os jogos aparecem para todos os alunos de <strong>{COURSES[adminCourse].label}</strong>. O aluno filtra por nível.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 15, marginBottom: 25 }}>
        <div style={{ padding: 20, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 16 }}>
          <h3 style={{ marginTop: 0 }}>Importar JSON</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Um jogo ou uma lista de jogos (word_guess, image, sentence_builder, listen).</p>
          <input type="file" id="importGamesJSON" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
          <button onClick={() => document.getElementById('importGamesJSON').click()} style={{ ...buttonStyle, background: 'var(--amber)', color: '#fff' }}>📥 Importar JSON</button>
        </div>

        <div style={{ padding: 20, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 16, display: 'grid', gap: 10 }}>
          <h3 style={{ margin: 0 }}>Criar a partir de um deck</h3>
          <select value={fromDeck.deckId} onChange={e => setFromDeck({ ...fromDeck, deckId: e.target.value })} style={inputStyle}>
            <option value="">Escolha o deck...</option>
            {decks.map(d => <option key={d.id} value={d.id}>{d.title} ({(d.wordIds || []).length})</option>)}
          </select>
          <div style={{ display: 'flex', gap: 10 }}>
            <select value={fromDeck.type} onChange={e => setFromDeck({ ...fromDeck, type: e.target.value })} style={inputStyle}>
              <option value="word_guess">🔤 Word Guess</option>
              <option value="listen">👂 Ouça e escolha</option>
            </select>
            <select value={fromDeck.level} onChange={e => setFromDeck({ ...fromDeck, level: e.target.value })} style={inputStyle}>
              <option value="">Sem nível</option>
              {GAME_LEVELS.map(l => <option key={l} value={l}>{getLevelLabel(l, adminCourse)}</option>)}
            </select>
          </div>
          <button onClick={handleCreateFromDeck} style={{ ...buttonStyle, background: 'var(--purple)', color: '#fff' }}>Criar jogo</button>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>No Word Guess, a tradução vira o significado. Para ter dicas, use o JSON.</span>
        </div>
      </div>

      {editingPoints && (
        <ImagePointEditor game={editingPoints} onClose={() => setEditingPoints(null)} onSaved={() => { setEditingPoints(null); fetchGames(); }} />
      )}

      {games.length === 0 ? (
        <p style={{ color: 'var(--muted)' }}>Nenhum jogo neste curso ainda.</p>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {games.map(g => {
            const missing = g.type === 'image' ? g.items.filter(p => p.x === null).length : 0;
            return (
              <div key={g.id} className="admin-flex-between" style={{ padding: 16, background: 'var(--cream)', border: '1px solid var(--line)', borderRadius: 14, gap: 10 }}>
                <div>
                  <strong>{GAME_TYPES[g.type]?.icon} {g.title}</strong>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--muted)' }}>
                    {GAME_TYPES[g.type]?.label} · {g.items.length} itens{g.deckTitle ? ` · deck "${g.deckTitle}"` : ''}
                    {missing > 0 && <span style={{ color: '#e67e22', fontWeight: 700 }}> · {missing} pontos sem posição</span>}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <select value={g.level || ''} onChange={e => handleLevel(g, e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '6px 10px' }}>
                    <option value="">Sem nível</option>
                    {GAME_LEVELS.map(l => <option key={l} value={l}>{getLevelLabel(l, adminCourse)}</option>)}
                  </select>
                  {g.type === 'image' && (
                    <button onClick={() => setEditingPoints(g)} style={{ ...buttonStyle, padding: '6px 12px', background: 'var(--plum)', color: '#fff' }}>📍 Marcar pontos</button>
                  )}
                  <button onClick={() => handleDelete(g)} style={{ ...buttonStyle, padding: '6px 12px', background: 'transparent', border: '1px solid red', color: 'red' }}>Excluir</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
