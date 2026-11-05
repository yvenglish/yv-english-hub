// Cabeçalho comum dos jogos: título, progresso e botão de sair
export default function GameHeader({ title, progress, onExit, exitLabel }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
      <span style={{ fontWeight: 800, color: 'var(--muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
        {progress && <span style={{ fontWeight: 800, color: 'var(--amber)' }}>{progress}</span>}
        <button onClick={onExit} style={{ background: 'none', border: 'none', color: 'var(--plum)', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>{exitLabel}</button>
      </div>
    </div>
  );
}
