import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UI_TEXTS } from '../../data/uiTexts';
import { CITY_XP, cityState, getJourney } from '../../data/journey';
import Flag from '../Flag';

// Card da home: onde o aluno está na viagem e quanto falta para a próxima cidade
export default function JourneyCard() {
  const { userData, activeCourse } = useAuth();
  const h = UI_TEXTS[activeCourse];
  const navigate = useNavigate();
  const journey = getJourney(userData, activeCourse);
  const state = cityState(journey, userData?.xp || 0, activeCourse);
  const topic = journey?.current?.topic;

  return (
    <section className="section-block">
      <button type="button" onClick={() => navigate('/viagem')} className="review-hero" style={{ width: '100%', textAlign: 'left', cursor: 'pointer', borderRadius: 24, padding: '20px 24px', background: 'var(--paper)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        <Flag code={state.country.code} size={42} />
        <span style={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--amber)' }}>✈️ {h.jrKicker} · {h.jrCityOf(state.cityIndex + 1, CITY_XP.length)}</span>
          <strong style={{ color: 'var(--text)', fontSize: '1.2rem' }}>{state.cityName}, {state.country.name}</strong>
          <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{topic ? `${h.jrTopic}: ${topic}` : h.jrTopicTbd}</span>
          <span style={{ display: 'block', height: 6, marginTop: 6, borderRadius: 99, background: 'var(--line)', overflow: 'hidden', maxWidth: 360 }}>
            <span style={{ display: 'block', width: `${state.pct}%`, height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #F0C87A, #F09A4A)' }} />
          </span>
          <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{state.done ? h.jrDoneShort : h.jrToNext(state.toNext, state.nextCityName)}</span>
        </span>
        <span style={{ background: 'var(--amber)', color: '#fff', padding: '10px 18px', borderRadius: 99, fontWeight: 800, whiteSpace: 'nowrap' }}>{h.jrHomeCta}</span>
      </button>
    </section>
  );
}
