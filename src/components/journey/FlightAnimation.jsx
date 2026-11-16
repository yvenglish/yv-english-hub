import { useEffect, useState } from 'react';
import Stamp from './Stamp';
import FlightPath, { curvePath } from './FlightPath';
import Flag from '../Flag';

const ARC = [[60, 175], [200, -10], [340, 175]];
const STAMP_MS = 1900;
const FLIGHT_MS = 3000;

// Voo internacional: 1) o país que terminou ganha o carimbo no passaporte; 2) o avião cruza o céu até o
// novo país; 3) chegada com o novo tema. Tocar na tela pula para o fim.
// from: { country, topic, startedAt, endedAt, citiesVisited, index }  to: { country, topic }
export default function FlightAnimation({ from, to, h, onDone }) {
  const [stage, setStage] = useState('stamp');

  useEffect(() => {
    if (stage === 'stamp') { const t = setTimeout(() => setStage('flight'), STAMP_MS); return () => clearTimeout(t); }
    if (stage === 'flight') { const t = setTimeout(() => setStage('arrive'), FLIGHT_MS); return () => clearTimeout(t); }
  }, [stage]);

  const skip = () => { if (stage !== 'arrive') setStage('arrive'); };

  return (
    <div onClick={skip} style={{ position: 'fixed', inset: 0, zIndex: 3200, overflow: 'hidden', display: 'grid', placeItems: 'center', padding: 16, background: 'linear-gradient(180deg, #1b1f4b 0%, #3a3a8c 45%, #e9967a 100%)', cursor: stage === 'arrive' ? 'default' : 'pointer' }}>
      {/* Nuvens passando */}
      {[{ top: '12%', w: 140, h: 34, d: 9, delay: -2 }, { top: '30%', w: 90, h: 24, d: 7, delay: -5 }, { top: '62%', w: 170, h: 40, d: 11, delay: -1 }, { top: '78%', w: 110, h: 28, d: 8, delay: -6 }].map((c, i) => (
        <span key={i} className="sky-cloud" style={{ top: c.top, width: c.w, height: c.h, animationDuration: `${c.d}s`, animationDelay: `${c.delay}s`, opacity: stage === 'stamp' ? 0.35 : 0.8 }} />
      ))}

      {stage === 'stamp' && (
        <div className="fade-up" style={{ position: 'relative', textAlign: 'center' }}>
          <div className="paper-thud" style={{ width: 'min(340px, calc(100vw - 48px))', padding: '34px 20px 44px', borderRadius: 14, background: 'repeating-linear-gradient(180deg, #fbf3e2 0 27px, #efe2c8 27px 28px)', boxShadow: '0 30px 60px rgba(0,0,0,0.35)', transform: 'rotate(-2deg)' }}>
            <p style={{ margin: '0 0 22px', fontFamily: '"Courier New", monospace', fontWeight: 900, letterSpacing: '0.3em', color: '#6b5a3e', fontSize: '0.75rem' }}>PASSAPORTE · PASSPORT</p>
            <Stamp country={from.country.name} topic={from.topic} date={from.endedAt} cities={from.citiesVisited ? `${from.citiesVisited}/6` : ''} index={from.index} animate />
          </div>
          <p className="fade-up" style={{ margin: '22px 0 0', color: '#fff', fontWeight: 800, fontSize: '1.1rem', animationDelay: '0.9s' }}>{h.jrStamped(from.country.name)}</p>
        </div>
      )}

      {stage === 'flight' && (
        <div className="fade-up" style={{ width: 'min(520px, 100%)', textAlign: 'center', color: '#fff' }}>
          <p style={{ margin: '0 0 6px', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', fontSize: '0.8rem', color: '#ffd7a8' }}>{h.jrIntlTitle}</p>
          <svg viewBox="0 0 400 230" style={{ width: '100%', overflow: 'visible' }} aria-hidden="true">
            <path d={curvePath(...ARC)} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" />
            <FlightPath name="intl" p0={ARC[0]} p1={ARC[1]} p2={ARC[2]} duration={FLIGHT_MS * 0.85} size={34} halo />
            <foreignObject x="20" y="180" width="80" height="50"><div style={{ display: 'flex', justifyContent: 'center' }}><Flag code={from.country.code} size={34} /></div></foreignObject>
            <foreignObject x="300" y="180" width="80" height="50"><div style={{ display: 'flex', justifyContent: 'center' }}><Flag code={to.country.code} size={34} /></div></foreignObject>
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.9rem', padding: '0 4%' }}>
            <span style={{ opacity: 0.75 }}>{from.country.name}</span>
            <span>{to.country.name}</span>
          </div>
        </div>
      )}

      {stage === 'arrive' && (
        <div className="fade-up" style={{ width: 'min(380px, 100%)', textAlign: 'center', padding: '32px 24px', borderRadius: 28, background: 'rgba(20,12,40,0.88)', border: '2px solid #ffd7a8', boxShadow: '0 30px 70px rgba(0,0,0,0.45)', color: '#fff' }}>
          <Flag code={to.country.code} size={60} style={{ marginBottom: 14 }} />
          <p style={{ margin: '0 0 4px', fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', fontSize: '0.75rem', color: '#ffd7a8' }}>{h.jrNewDestination}</p>
          <h2 style={{ margin: '0 0 8px', fontFamily: '"Playfair Display", serif', fontSize: '2.2rem' }}>{to.country.name}</h2>
          <p style={{ margin: '0 0 22px', color: 'rgba(255,255,255,0.85)' }}>{h.jrTopic}: <strong>{to.topic || h.jrTopicTbd}</strong></p>
          <button onClick={onDone} style={{ width: '100%', padding: 15, borderRadius: 999, border: 'none', background: '#ffd7a8', color: '#2a1220', fontWeight: 900, fontSize: '1.05rem', cursor: 'pointer' }}>{h.jrExplore}</button>
        </div>
      )}

      {stage !== 'arrive' && <span style={{ position: 'absolute', bottom: 24, left: 0, right: 0, textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>{h.jrTapToSkip}</span>}
    </div>
  );
}
