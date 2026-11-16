import { PlaneShape } from './Plane';

// Avião voando por uma curva (Bézier quadrática p0 → p1 → p2) dentro de um <svg>, só com CSS:
// os pontos da curva viram keyframes (posição + ângulo), com aceleração na decolagem e freio no pouso.
// (Animações SVG nativas contam o tempo desde a abertura da página e falham em SVGs que aparecem depois.)

const point = ([x0, y0], [x1, y1], [x2, y2], t) => [
  (1 - t) ** 2 * x0 + 2 * (1 - t) * t * x1 + t ** 2 * x2,
  (1 - t) ** 2 * y0 + 2 * (1 - t) * t * y1 + t ** 2 * y2
];
const angle = ([x0, y0], [x1, y1], [x2, y2], t) =>
  (Math.atan2(2 * (1 - t) * (y1 - y0) + 2 * t * (y2 - y1), 2 * (1 - t) * (x1 - x0) + 2 * t * (x2 - x1)) * 180) / Math.PI;
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

export const curvePath = (p0, p1, p2) => `M${p0[0]} ${p0[1]} Q${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]}`;

export default function FlightPath({ name, p0, p1, p2, duration = 2500, delay = 0, size = 30, color = '#fff', trailColor = '#ffd7a8', trailWidth = 3, halo = false }) {
  const steps = 30;
  const frames = Array.from({ length: steps + 1 }, (_, i) => {
    const t = easeInOut(i / steps);
    const [x, y] = point(p0, p1, p2, t);
    return `${((i / steps) * 100).toFixed(2)}% { transform: translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${angle(p0, p1, p2, t).toFixed(1)}deg); }`;
  }).join(' ');
  const d = curvePath(p0, p1, p2);
  const timing = `${duration}ms linear ${delay}ms both`;

  return (
    <>
      <style>{`
        @keyframes ${name}-fly { ${frames} }
        @keyframes ${name}-trail { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
        @media (prefers-reduced-motion: reduce) { .${name}-plane, .${name}-trail { animation-duration: 1ms !important; animation-delay: 0ms !important; } }
      `}</style>
      <path className={`${name}-trail`} d={d} pathLength="1" fill="none" stroke={trailColor} strokeWidth={trailWidth} strokeLinecap="round" strokeDasharray="1" style={{ animation: `${name}-trail ${duration}ms cubic-bezier(.45,0,.55,1) ${delay}ms both` }} />
      <g className={`${name}-plane`} style={{ animation: `${name}-fly ${timing}` }}>
        <PlaneShape size={size} color={color}>
          {halo && <circle r={size * 0.6} fill="rgba(255,215,168,0.18)" />}
        </PlaneShape>
      </g>
    </>
  );
}
