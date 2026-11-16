import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UI_TEXTS } from '../../data/uiTexts';
import { Confetti } from '../games/RecordCelebration';
import Flag from '../Flag';
import FlightPath from '../journey/FlightPath';

// Telas de resultado (fim da Daily, fim de jogo, recorde, meta de streak) levam data-result-modal.
// Os cartões grandes (nível, cidade nova, boas-vindas) esperam essas telas fecharem para aparecer.
const resultModalOpen = () => typeof document !== 'undefined' && !!document.querySelector('[data-result-modal]');

// Caminho do país com as cidades: o avião voa da cidade anterior até a nova e ela acende no pouso.
// Quando volta a uma cidade já visitada, o avião faz o caminho de volta.
function CityRoute({ city, h }) {
  const n = city.cities.length;
  const xs = city.cities.map((_, i) => 20 + i * (260 / (n - 1)));
  const y = 46;
  const from = [xs[city.fromIndex], y];
  const to = [xs[city.toIndex], y];
  const lift = 26 + Math.max(0, Math.abs(city.toIndex - city.fromIndex) - 1) * 6;
  const flight = 1500;
  return (
    <div style={{ marginTop: 18 }}>
      <style>{`@keyframes city-light { from { fill: rgba(255,255,255,0.25); r: 6px; } 60% { r: 10px; } to { fill: #F0C87A; r: 7px; } }`}</style>
      <svg viewBox="0 0 300 64" style={{ width: '100%', overflow: 'visible' }} aria-hidden="true">
        <line x1={xs[0]} y1={y} x2={xs[n - 1]} y2={y} stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" strokeDasharray="3 7" strokeLinecap="round" />
        {!city.revisit && <line x1={xs[0]} y1={y} x2={from[0]} y2={y} stroke="#F0C87A" strokeWidth="3" strokeLinecap="round" />}
        {xs.map((x, i) => {
          const isTo = i === city.toIndex;
          const visited = city.revisit || i <= city.fromIndex;
          return (
            <circle key={i} cx={x} cy={y} r={isTo ? 7 : 5}
              fill={visited ? '#F0C87A' : 'rgba(255,255,255,0.25)'}
              style={isTo && !city.revisit ? { animation: `city-light 0.6s ease-out ${300 + flight - 150}ms both` } : undefined} />
          );
        })}
        <FlightPath name="hop" p0={from} p1={[(from[0] + to[0]) / 2, y - lift * 2]} p2={to} duration={flight} delay={300} size={20} trailColor="#F0C87A" trailWidth={2.5} />
      </svg>
      <p style={{ margin: '6px 0 0', fontSize: '0.8rem', fontWeight: 800, color: 'rgba(255,255,255,0.75)' }}>
        {city.from} <span style={{ color: '#F0C87A' }}>→ {city.name}</span>
        <span style={{ display: 'block', fontWeight: 600, opacity: 0.8, marginTop: 2 }}>{h.jrCityOf(city.toIndex + 1, n)}</span>
      </p>
    </div>
  );
}

// "+25 XP" flutuando no topo a cada ganho; nível novo, cidade nova e boas-vindas viram um cartão com confete
export default function XpToast() {
  const { xpEvents, dismissXpEvent, activeCourse } = useAuth();
  const h = UI_TEXTS[activeCourse];
  const event = xpEvents[0];
  const big = !!(event && (event.levelUp || event.welcome || event.city));
  const [readyId, setReadyId] = useState(null);
  const ready = !!event && readyId === event.id;

  // Cartão grande: espera as telas de resultado (fim da Daily, fim do jogo…) fecharem
  useEffect(() => {
    if (!event) return;
    if (!big || !resultModalOpen()) { setReadyId(event.id); return; }
    const timer = setInterval(() => { if (!resultModalOpen()) { clearInterval(timer); setReadyId(event.id); } }, 400);
    return () => clearInterval(timer);
  }, [event, big]);

  useEffect(() => {
    if (!event || !ready) return;
    const timer = setTimeout(dismissXpEvent, event.welcome ? 7000 : big ? 5000 : 1800);
    return () => clearTimeout(timer);
  }, [event, ready, big, dismissXpEvent]);

  if (!event || !ready) return null;

  const keyframes = (
    <style>{`
      @keyframes xp-pop { 0% { transform: translate(-50%, 12px) scale(0.7); opacity: 0; } 15% { transform: translate(-50%, 0) scale(1.08); opacity: 1; } 25% { transform: translate(-50%, 0) scale(1); } 85% { opacity: 1; } 100% { transform: translate(-50%, -16px); opacity: 0; } }
      @keyframes xp-level { from { transform: translate(-50%, -50%) scale(0.6); opacity: 0; } to { transform: translate(-50%, -50%) scale(1); opacity: 1; } }
    `}</style>
  );

  if (big) {
    const level = event.welcome ? event.level : event.levelUp;
    const cityOnly = event.city && !event.levelUp && !event.welcome;
    const cityTitle = event.city && (event.city.revisit ? h.jrCityBack(event.city.name) : h.jrCityArrived(event.city.name));
    return (
      <div key={event.id} onClick={dismissXpEvent} style={{ position: 'fixed', inset: 0, zIndex: 3100, background: 'rgba(20,10,30,0.55)', cursor: 'pointer' }}>
        {keyframes}
        <Confetti />
        <div style={{ position: 'absolute', left: '50%', top: '45%', transform: 'translate(-50%, -50%)', width: 'calc(100vw - 32px)', maxWidth: 360, textAlign: 'center', padding: '30px 24px', borderRadius: 28, background: 'linear-gradient(160deg, #3a2410, #2a1220 60%, #1c0f24)', border: '2px solid #F0C87A', boxShadow: '0 0 50px rgba(240,200,122,0.35)', animation: 'xp-level 0.4s cubic-bezier(.2,1.4,.4,1)' }}>
          <div style={{ width: 84, height: 84, margin: '0 auto 12px', borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, #F0C87A, #F09A4A)', boxShadow: '0 10px 30px rgba(240,154,74,0.5)' }}>
            {cityOnly
              ? <Flag code={event.city.code} size={40} style={{ boxShadow: 'none' }} />
              : <span style={{ color: '#2a1220', fontWeight: 900, fontSize: '2.4rem' }}>{level}</span>}
          </div>
          <h2 style={{ margin: '0 0 6px', fontFamily: '"Playfair Display", serif', fontSize: '2rem', color: '#F0C87A' }}>{event.welcome ? h.xpWelcomeTitle : cityOnly ? cityTitle : h.xpLevelUp(level)}</h2>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)' }}>{event.welcome ? h.xpWelcomeText(event.amount, level) : cityOnly ? `+${event.amount} XP · ${h.jrCityArrivedText}` : `+${event.amount} XP · ${h.xpLevelUpText}`}</p>
          {event.city && !cityOnly && <p style={{ margin: '10px 0 0', color: '#F0C87A', fontWeight: 800 }}>✈️ {cityTitle}</p>}
          {event.city?.cities && <CityRoute city={event.city} h={h} />}
        </div>
      </div>
    );
  }

  return (
    <div key={event.id} onClick={dismissXpEvent} style={{ position: 'fixed', top: 86, left: '50%', zIndex: 3100, padding: '10px 20px', borderRadius: 999, background: 'linear-gradient(135deg, #F0C87A, #F09A4A)', color: '#2a1220', fontWeight: 900, fontSize: '1.1rem', boxShadow: '0 10px 30px rgba(240,154,74,0.45)', animation: 'xp-pop 1.8s ease-out forwards', cursor: 'pointer', whiteSpace: 'nowrap' }}>
      {keyframes}
      ⭐ +{event.amount} XP{event.boosted && <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 99, background: '#2a1220', color: '#F0C87A', fontSize: '0.8rem' }}>2x</span>}
    </div>
  );
}
