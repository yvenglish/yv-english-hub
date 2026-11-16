import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UI_TEXTS } from '../data/uiTexts';
import { CITY_XP, cityState, countryAt, getJourney } from '../data/journey';
import Flag from '../components/Flag';

const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '');

// "Minha viagem": país atual (tema), cidades até o próximo país, próximo destino e o passaporte com os carimbos
export default function Journey() {
  const { userData, activeCourse, startJourney } = useAuth();
  const h = UI_TEXTS[activeCourse];
  const navigate = useNavigate();
  const journey = getJourney(userData, activeCourse);
  const xp = userData?.xp || 0;

  // Primeira visita: a viagem começa no primeiro país (o XP que o aluno já tem conta para as cidades)
  useEffect(() => { if (userData && !journey) startJourney(); }, [userData, journey, startJourney]);

  if (!journey) return null;

  const current = journey.current;
  const state = cityState(journey, xp, activeCourse);
  const next = countryAt(activeCourse, current.countryIndex + 1);
  const nextTopic = journey.upcoming?.[0]?.topic;
  const past = [...(journey.past || [])].reverse();

  return (
    <div className="site-shell unlocked" style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <style>{`
        @keyframes jr-plane { 0%, 100% { transform: translateY(0) rotate(-8deg); } 50% { transform: translateY(-6px) rotate(4deg); } }
        .jr-route { display: grid; grid-template-columns: repeat(${CITY_XP.length}, 1fr); gap: 0; }
        .jr-stop { display: flex; flex-direction: column; align-items: center; text-align: center; position: relative; padding: 0 4px; }
        .jr-stop::before { content: ''; position: absolute; top: 21px; left: -50%; width: 100%; height: 4px; background: repeating-linear-gradient(90deg, var(--line) 0 8px, transparent 8px 14px); z-index: 0; }
        .jr-stop.done::before, .jr-stop.here::before { background: var(--amber); }
        .jr-stop:first-child::before { display: none; }
        @media (max-width: 640px) {
          .jr-route { grid-template-columns: 1fr; gap: 6px; }
          .jr-stop { flex-direction: row; text-align: left; gap: 12px; padding: 0; }
          .jr-stop::before { top: -50%; left: 20px; width: 4px; height: 100%; background: repeating-linear-gradient(180deg, var(--line) 0 8px, transparent 8px 14px); }
        }
      `}</style>
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '32px 16px 80px', fontFamily: '"Inter", sans-serif' }}>
        <button onClick={() => navigate('/')} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', marginBottom: 16, fontWeight: 'bold' }}>← {h.navHome}</button>
        <p style={{ margin: 0, color: 'var(--amber)', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', fontSize: '0.75rem' }}>✈️ {h.jrKicker}</p>
        <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 'clamp(2rem, 6vw, 2.8rem)', color: 'var(--text)', margin: '6px 0 8px' }}>{h.jrTitle}</h1>
        <p style={{ color: 'var(--muted)', margin: '0 0 28px', maxWidth: 620 }}>{h.jrIntro}</p>

        {/* País atual */}
        <section style={{ borderRadius: 28, padding: 'clamp(20px, 4vw, 32px)', marginBottom: 20, color: '#fff', background: 'radial-gradient(circle at 90% 0%, rgba(240,154,74,0.4), transparent 50%), linear-gradient(135deg, var(--plum), var(--plum-mid))', boxShadow: '0 18px 40px rgba(0,0,0,0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
            <Flag code={state.country.code} size={48} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--amber-soft)' }}>{h.jrYouAreIn(state.cityName)}</span>
              <h2 style={{ margin: '4px 0 2px', fontFamily: '"Playfair Display", serif', fontSize: '2rem' }}>{state.country.name}</h2>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.85)' }}>
                {h.jrTopic}: <strong>{current.topic || h.jrTopicTbd}</strong>
              </p>
            </div>
            <span style={{ padding: '8px 14px', borderRadius: 99, background: 'rgba(255,255,255,0.14)', fontWeight: 800, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{h.jrCityOf(state.cityIndex + 1, CITY_XP.length)}</span>
          </div>

          <div className="jr-route">
            {state.country.cities.map((city, i) => {
              const status = i < state.cityIndex ? 'done' : i === state.cityIndex ? 'here' : 'todo';
              return (
                <div key={city} className={`jr-stop ${status}`}>
                  <span style={{ position: 'relative', zIndex: 1, width: 46, height: 46, flexShrink: 0, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: status === 'here' ? '1.5rem' : '1rem', background: status === 'todo' ? 'rgba(255,255,255,0.12)' : status === 'here' ? '#fff' : 'var(--amber)', border: status === 'here' ? '3px solid var(--amber)' : 'none', boxShadow: status === 'here' ? '0 0 0 6px rgba(240,154,74,0.25)' : 'none' }}>
                    {status === 'done' ? '✓' : status === 'here' ? <span style={{ display: 'inline-block', animation: 'jr-plane 2s ease-in-out infinite' }}>✈️</span> : <span style={{ opacity: 0.6 }}>🔒</span>}
                  </span>
                  <span style={{ marginTop: 8, fontSize: '0.85rem', fontWeight: status === 'here' ? 900 : 600, color: status === 'todo' ? 'rgba(255,255,255,0.55)' : '#fff', alignSelf: 'center' }}>{city}</span>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 24 }}>
            <div style={{ height: 10, borderRadius: 99, background: 'rgba(255,255,255,0.15)', overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ width: `${state.pct}%`, height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #F0C87A, #F09A4A)' }} />
            </div>
            <p style={{ margin: 0, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{state.done ? h.jrDone : h.jrToNext(state.toNext, state.nextCityName)}</p>
          </div>
        </section>

        {/* Próximo destino */}
        <section style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20, borderRadius: 22, marginBottom: 32, background: 'var(--paper)', border: '1px dashed var(--amber)' }}>
          <Flag code={next.code} size={36} />
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--amber)' }}>{h.jrNext}</span>
            <h3 style={{ margin: '2px 0', color: 'var(--text)' }}>{next.name}</h3>
            <p style={{ margin: 0, color: 'var(--muted)' }}>{nextTopic ? `${h.jrTopic}: ${nextTopic}` : h.jrNextSoon}</p>
          </div>
        </section>

        {/* Passaporte */}
        <h2 style={{ fontFamily: '"Playfair Display", serif', color: 'var(--text)', margin: '0 0 14px' }}>🛂 {h.jrPassport}</h2>
        {past.length === 0 ? (
          <p style={{ color: 'var(--muted)', padding: 20, borderRadius: 18, border: '1px dashed var(--line)', margin: 0 }}>{h.jrPassportEmpty}</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
            {past.map((stop, i) => {
              const country = countryAt(activeCourse, stop.countryIndex);
              return (
                <div key={`${stop.countryIndex}-${i}`} style={{ position: 'relative', padding: 18, borderRadius: 18, background: 'var(--paper)', border: '2px solid var(--line)', overflow: 'hidden' }}>
                  <Flag code={country.code} size={64} style={{ position: 'absolute', right: -10, top: -8, opacity: 0.12, transform: 'rotate(-14deg)', boxShadow: 'none' }} />
                  <Flag code={country.code} size={28} />
                  <h3 style={{ margin: '6px 0 2px', color: 'var(--text)', fontSize: '1.05rem' }}>{country.name}</h3>
                  <p style={{ margin: '0 0 8px', color: 'var(--text)', fontWeight: 700, fontSize: '0.9rem' }}>{stop.topic || h.jrTopicTbd}</p>
                  <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.8rem' }}>{h.jrCitiesVisited(stop.citiesVisited || 1, CITY_XP.length)} · {formatDate(stop.startedAt)} – {formatDate(stop.endedAt)}</p>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
