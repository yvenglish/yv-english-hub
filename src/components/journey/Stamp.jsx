// Carimbo de passaporte: moldura dupla com tinta, levemente torto, com país, tema e data.
// A cor e a inclinação variam por país para o passaporte parecer carimbado à mão.
const INKS = ['#B23A48', '#2E5E9E', '#2D7158', '#7B4B94', '#B8742A', '#1F6F78'];

// Meses em inglês, como nos carimbos de passaporte de verdade (servem para os dois cursos)
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
};

export default function Stamp({ country, topic, date, index = 0, cities, size = 1, animate = false, style }) {
  const ink = INKS[index % INKS.length];
  const tilt = [-8, 6, -4, 9, -11, 3][index % 6];
  return (
    <div
      className={animate ? 'stamp-slam' : undefined}
      style={{
        '--tilt': `${tilt}deg`,
        position: 'relative',
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4 * size,
        padding: `${12 * size}px ${16 * size}px`,
        minWidth: 150 * size,
        color: ink,
        border: `${3 * size}px solid ${ink}`,
        outline: `${1.5 * size}px solid ${ink}`,
        outlineOffset: `${3 * size}px`,
        borderRadius: 14 * size,
        transform: `rotate(${tilt}deg)`,
        fontFamily: '"Courier New", monospace',
        textAlign: 'center',
        opacity: 0.9,
        mixBlendMode: 'multiply',
        ...style
      }}
    >
      <span style={{ fontSize: `${0.62 * size}rem`, fontWeight: 900, letterSpacing: '0.2em' }}>✈ YV LANGUAGE CLUB</span>
      <strong style={{ fontSize: `${1.15 * size}rem`, letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1.1 }}>{country}</strong>
      {topic && <span style={{ fontSize: `${0.78 * size}rem`, fontWeight: 700, maxWidth: 180 * size }}>{topic}</span>}
      <span style={{ fontSize: `${0.68 * size}rem`, fontWeight: 800, letterSpacing: '0.12em', borderTop: `${1.5 * size}px dashed ${ink}`, paddingTop: 3 * size }}>
        {formatDate(date)}{cities ? ` · ${cities}` : ''}
      </span>
    </div>
  );
}
