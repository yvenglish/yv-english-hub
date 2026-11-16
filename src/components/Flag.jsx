// Bandeira como imagem (o Windows não desenha bandeiras em emoji, mostra só as letras "GB", "US"…).
// code: código do flagcdn.com, ex. "us", "gb-eng", "gb-sct".
export default function Flag({ code, size = 32, style }) {
  return (
    <img
      src={`https://flagcdn.com/${code}.svg`}
      alt=""
      width={Math.round(size * 4 / 3)}
      height={size}
      loading="lazy"
      style={{ display: 'inline-block', width: Math.round(size * 4 / 3), height: size, objectFit: 'cover', borderRadius: Math.max(3, size / 8), boxShadow: '0 2px 8px rgba(0,0,0,0.2)', flexShrink: 0, verticalAlign: 'middle', ...style }}
    />
  );
}
