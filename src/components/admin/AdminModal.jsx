export default function AdminModal({ title, onClose, children }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(20, 10, 20, 0.85)',
      backdropFilter: 'blur(12px)',
      zIndex: 2000,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20
    }}>
      <div style={{
        background: 'var(--cream)',
        width: '100%',
        maxWidth: 900,
        borderRadius: 24,
        overflow: 'hidden',
        border: '1px solid var(--plum)',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 30px',
          background: 'var(--paper)',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, color: 'var(--text)', fontSize: '1.4rem' }}>{title}</h3>
          <button onClick={onClose} style={{
            background: 'transparent',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            color: 'var(--muted)',
            lineHeight: 1
          }}>&times;</button>
        </div>

        {/* Content */}
        <div style={{
          padding: 30,
          overflowY: 'auto',
          flex: 1
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}
