// Avião desenhado em SVG (o emoji ✈️ muda de desenho entre sistemas e não aponta para onde voa).
// Aponta para a direita (+x), então funciona com animateMotion rotate="auto".
// Desenho baseado no ícone "flight" do Material Icons (Apache 2.0).
export const PLANE_PATH = 'M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z';

// Para usar dentro de outro <svg>: centrado em (0,0), apontando para a direita
export function PlaneShape({ size = 24, color = '#fff', children }) {
  const s = size / 24;
  return (
    <g>
      {children}
      <g transform={`scale(${s}) rotate(90) translate(-12 -12)`}>
        <path d={PLANE_PATH} fill={color} />
      </g>
    </g>
  );
}

// Ícone solto (ex.: no caminho das cidades). angle: 0 = direita, 90 = baixo, -45 = subindo
export default function Plane({ size = 24, color = 'currentColor', angle = -45, style, className }) {
  return (
    <svg width={size} height={size} viewBox="-12 -12 24 24" className={className} style={{ display: 'inline-block', overflow: 'visible', ...style }} aria-hidden="true">
      <g transform={`rotate(${angle})`}>
        <PlaneShape size={24} color={color} />
      </g>
    </svg>
  );
}
