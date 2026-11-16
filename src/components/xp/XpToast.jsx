import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UI_TEXTS } from '../../data/uiTexts';
import { Confetti } from '../games/RecordCelebration';
import Flag from '../Flag';

// "+25 XP" flutuando no topo a cada ganho; ao subir de nível, um cartão com confete.
export default function XpToast() {
  const { xpEvents, dismissXpEvent, activeCourse } = useAuth();
  const h = UI_TEXTS[activeCourse];
  const event = xpEvents[0];

  useEffect(() => {
    if (!event) return;
    const timer = setTimeout(dismissXpEvent, event.welcome ? 7000 : event.levelUp || event.city ? 4500 : 1800);
    return () => clearTimeout(timer);
  }, [event, dismissXpEvent]);

  if (!event) return null;

  const keyframes = (
    <style>{`
      @keyframes xp-pop { 0% { transform: translate(-50%, 12px) scale(0.7); opacity: 0; } 15% { transform: translate(-50%, 0) scale(1.08); opacity: 1; } 25% { transform: translate(-50%, 0) scale(1); } 85% { opacity: 1; } 100% { transform: translate(-50%, -16px); opacity: 0; } }
      @keyframes xp-level { from { transform: translate(-50%, -50%) scale(0.6); opacity: 0; } to { transform: translate(-50%, -50%) scale(1); opacity: 1; } }
    `}</style>
  );

  if (event.levelUp || event.welcome || event.city) {
    const level = event.welcome ? event.level : event.levelUp;
    const cityOnly = event.city && !event.levelUp && !event.welcome;
    return (
      <div key={event.id} onClick={dismissXpEvent} style={{ position: 'fixed', inset: 0, zIndex: 3100, background: 'rgba(20,10,30,0.55)', cursor: 'pointer' }}>
        {keyframes}
        <Confetti />
        <div style={{ position: 'absolute', left: '50%', top: '45%', transform: 'translate(-50%, -50%)', width: 'calc(100vw - 32px)', maxWidth: 340, textAlign: 'center', padding: '30px 24px', borderRadius: 28, background: 'linear-gradient(160deg, #3a2410, #2a1220 60%, #1c0f24)', border: '2px solid #F0C87A', boxShadow: '0 0 50px rgba(240,200,122,0.35)', animation: 'xp-level 0.4s cubic-bezier(.2,1.4,.4,1)' }}>
          <div style={{ width: 84, height: 84, margin: '0 auto 12px', borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, #F0C87A, #F09A4A)', boxShadow: '0 10px 30px rgba(240,154,74,0.5)' }}>
            <span style={{ color: '#2a1220', fontWeight: 900, fontSize: cityOnly ? '2.6rem' : '2.4rem' }}>{cityOnly ? <Flag code={event.city.code} size={40} style={{ boxShadow: 'none' }} /> : level}</span>
          </div>
          <h2 style={{ margin: '0 0 6px', fontFamily: '"Playfair Display", serif', fontSize: '2rem', color: '#F0C87A' }}>{event.welcome ? h.xpWelcomeTitle : cityOnly ? h.jrCityArrived(event.city.name) : h.xpLevelUp(level)}</h2>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)' }}>{event.welcome ? h.xpWelcomeText(event.amount, level) : cityOnly ? `+${event.amount} XP · ${h.jrCityArrivedText}` : `+${event.amount} XP · ${h.xpLevelUpText}`}</p>
          {event.city && !cityOnly && <p style={{ margin: '10px 0 0', color: '#F0C87A', fontWeight: 800 }}>✈️ {h.jrCityArrived(event.city.name)}</p>}
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
