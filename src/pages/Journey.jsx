import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UI_TEXTS } from '../data/uiTexts';
import { CITY_XP, cityState, countryAt, getJourney } from '../data/journey';
import Flag from '../components/Flag';
import Plane from '../components/journey/Plane';
import Stamp from '../components/journey/Stamp';

// "Minha viagem": país atual (tema), cidades até o próximo país, próximo destino e o passaporte com os carimbos.
// Voo nacional (o trecho se pinta e o avião pousa) quando o aluno chegou numa cidade nova desde a última visita.
// O voo internacional aparece ao abrir o hub (JourneyFlightWatcher), não aqui.
export default function Journey() {
  const { userData, activeCourse, startJourney, markJourneySeen } = useAuth();
  const h = UI_TEXTS[activeCourse];
  const navigate = useNavigate();
  const journey = getJourney(userData, activeCourse);
  const xp = userData?.xp || 0;
  const [arrivedFrom, setArrivedFrom] = useState(null); // índice da cidade de onde o avião decolou
  const checked = useRef(null);

  // Primeira visita: a viagem começa no primeiro país (o XP que o aluno já tem conta para as cidades)
  useEffect(() => { if (userData && !journey) startJourney(); }, [userData, journey, startJourney]);

  // Decide uma vez por visita qual animação mostrar e registra o que foi visto
  useEffect(() => {
    if (!journey || checked.current === activeCourse) return;
    const seen = userData?.journeySeen?.[activeCourse];
    // Troca de país ainda não vista: quem mostra o voo e registra é o JourneyFlightWatcher
    if ((journey.past || []).length > 0 && seen?.startedAt !== journey.current.startedAt) return;
    checked.current = activeCourse;
    const now = cityState(journey, xp, activeCourse);
    const seenHops = seen?.hops ?? seen?.cityIndex;
    if (seen && seenHops != null && now.hops > seenHops) {
      // Voou desde a última visita: pinta os trechos até a cidade atual (se deu a volta, só o último trecho)
      const from = seenHops % now.country.cities.length;
      setArrivedFrom(from < now.cityIndex ? from : now.cityIndex - 1);
    }
    markJourneySeen(activeCourse, { startedAt: journey.current.startedAt, hops: now.hops });
  }, [journey, activeCourse, xp, userData, markJourneySeen]);

  if (!journey) return null;

  const current = journey.current;
  const state = cityState(journey, xp, activeCourse);
  const next = countryAt(activeCourse, current.countryIndex + 1);
  const nextTopic = journey.upcoming?.[0]?.topic;
  const pastList = journey.past || [];
  const past = pastList.map((p, i) => ({ ...p, i })).reverse();
  const flying = arrivedFrom !== null;

  return (
    <div className="site-shell unlocked" style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <style>{`
        .jr-route { display: grid; grid-template-columns: repeat(${CITY_XP.length}, 1fr); gap: 0; --land-from: translateX(-140%); }
        .jr-stop { display: flex; flex-direction: column; align-items: center; text-align: center; position: relative; padding: 0 4px; }
        .jr-stop::before { content: ''; position: absolute; top: 21px; left: -50%; width: 100%; height: 4px; background: repeating-linear-gradient(90deg, rgba(255,255,255,0.3) 0 8px, transparent 8px 14px); z-index: 0; transform-origin: left center; }
        .jr-stop.done::before, .jr-stop.here::before { background: var(--amber); }
        .jr-stop:first-child::before { display: none; }
        @keyframes jr-fill { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        @keyframes jr-fill-v { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        .jr-stop.fill-anim::before { animation: jr-fill 0.8s ease-in-out var(--d, 0s) both; }
        @keyframes jr-land { 0% { transform: var(--land-from) scale(0.6); opacity: 0; } 70% { transform: translate(0, 0) scale(1.15); opacity: 1; } 100% { transform: translate(0, 0) scale(1); } }
        .jr-plane-land { animation: jr-land 1s cubic-bezier(.3,.7,.3,1) var(--d, 0s) both; }
        .jr-plane-dir { display: inline-flex; transform: rotate(0deg); }
        @media (max-width: 640px) {
          .jr-route { grid-template-columns: 1fr; gap: 6px; --land-from: translateY(-140%); }
          .jr-stop { flex-direction: row; text-align: left; gap: 12px; padding: 0; }
          .jr-stop::before { top: -50%; left: 21px; width: 4px; height: 100%; background: repeating-linear-gradient(180deg, rgba(255,255,255,0.3) 0 8px, transparent 8px 14px); transform-origin: center top; }
          .jr-stop.fill-anim::before { animation-name: jr-fill-v; }
          .jr-plane-dir { transform: rotate(90deg); }
        }
      `}</style>


      <main style={{ maxWidth: 900, margin: '0 auto', padding: '32px 16px 80px', fontFamily: '"Inter", sans-serif' }}>
        <button onClick={() => navigate('/')} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', marginBottom: 16, fontWeight: 'bold' }}>← {h.navHome}</button>
        <p style={{ margin: 0, color: 'var(--amber)', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', fontSize: '0.75rem' }}>✈️ {h.jrKicker}</p>
        <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 'clamp(2rem, 6vw, 2.8rem)', color: 'var(--text)', margin: '6px 0 8px' }}>{h.jrTitle}</h1>
        <p style={{ color: 'var(--muted)', margin: '0 0 28px', maxWidth: 620 }}>{h.jrIntro}</p>

        {/* País atual */}
        <section style={{ position: 'relative', overflow: 'hidden', borderRadius: 28, padding: 'clamp(20px, 4vw, 32px)', marginBottom: 20, color: '#fff', background: 'radial-gradient(circle at 90% 0%, rgba(240,154,74,0.4), transparent 50%), linear-gradient(135deg, var(--plum), var(--plum-mid))', boxShadow: '0 18px 40px rgba(0,0,0,0.25)' }}>
          {/* Nuvens ao fundo */}
          <span className="sky-cloud" style={{ top: '14%', width: 120, height: 26, opacity: 0.08, animationDuration: '38s', animationDelay: '-10s' }} />
          <span className="sky-cloud" style={{ top: '58%', width: 160, height: 34, opacity: 0.06, animationDuration: '52s', animationDelay: '-30s' }} />

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
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

          <div className="jr-route" style={{ position: 'relative' }}>
            {state.country.cities.map((city, i) => {
              const status = i === state.cityIndex ? 'here' : i < state.cityIndex || state.allVisited ? 'done' : 'todo';
              // Voo nacional: os trechos entre a cidade de partida e a atual se pintam em sequência
              const animated = flying && i > arrivedFrom && i <= state.cityIndex;
              const delay = animated ? `${(i - arrivedFrom - 1) * 0.8}s` : '0s';
              return (
                <div key={city} className={`jr-stop ${status}${animated ? ' fill-anim' : ''}`} style={{ '--d': delay }}>
                  <span style={{ position: 'relative', zIndex: 1, width: 46, height: 46, flexShrink: 0, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: '1rem', background: status === 'todo' ? 'rgba(255,255,255,0.12)' : status === 'here' ? '#fff' : 'var(--amber)', border: status === 'here' ? '3px solid var(--amber)' : 'none', boxShadow: status === 'here' ? '0 0 0 6px rgba(240,154,74,0.25)' : 'none' }}>
                    {status === 'done' && '✓'}
                    {status === 'todo' && <span style={{ opacity: 0.6 }}>🔒</span>}
                    {status === 'here' && (
                      <span className={flying ? 'jr-plane-land' : undefined} style={{ '--d': flying ? `${Math.max(0, state.cityIndex - arrivedFrom - 1) * 0.8 + 0.1}s` : '0s', display: 'inline-flex' }}>
                        <span className="jr-plane-dir"><span className="plane-bob"><Plane size={24} angle={0} color="#B8742A" /></span></span>
                      </span>
                    )}
                  </span>
                  <span style={{ marginTop: 8, fontSize: '0.85rem', fontWeight: status === 'here' ? 900 : 600, color: status === 'todo' ? 'rgba(255,255,255,0.55)' : '#fff', alignSelf: 'center' }}>{city}</span>
                </div>
              );
            })}
          </div>

          <div style={{ position: 'relative', marginTop: 24 }}>
            <div style={{ height: 10, borderRadius: 99, background: 'rgba(255,255,255,0.15)', overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ width: `${state.pct}%`, height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #F0C87A, #F09A4A)', transition: 'width 1s ease-out' }} />
            </div>
            <p style={{ margin: 0, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{state.nextIsRevisit ? h.jrToBack(state.toNext, state.nextCityName) : h.jrToNext(state.toNext, state.nextCityName)}</p>
            {state.allVisited && <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.75)', fontSize: '0.9rem' }}>{h.jrDone}</p>}
          </div>
        </section>

        {/* Próximo destino */}
        <section style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20, borderRadius: 22, marginBottom: 32, background: 'var(--paper)', border: '1px dashed var(--amber)' }}>
          <Flag code={next.code} size={36} />
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--amber)' }}>{h.jrNext}</span>
            <h3 style={{ margin: '2px 0', color: 'var(--text)' }}>{next.name}</h3>
            <p style={{ margin: 0, color: 'var(--muted)' }}>{nextTopic ? `${h.jrTopic}: ${nextTopic}` : h.jrNextSoon}</p>
          </div>
          <Plane size={28} angle={-20} color="var(--amber)" />
        </section>

        {/* Passaporte com carimbos */}
        <h2 style={{ fontFamily: '"Playfair Display", serif', color: 'var(--text)', margin: '0 0 14px' }}>🛂 {h.jrPassport}</h2>
        {past.length === 0 ? (
          <p style={{ color: 'var(--muted)', padding: 20, borderRadius: 18, border: '1px dashed var(--line)', margin: 0 }}>{h.jrPassportEmpty}</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '34px 26px', padding: '34px 18px', borderRadius: 18, background: 'repeating-linear-gradient(180deg, #fbf3e2 0 27px, #efe2c8 27px 28px)', boxShadow: 'inset 0 0 40px rgba(120,90,40,0.15)' }}>
            {past.map(stop => (
              <Stamp
                key={`${stop.countryIndex}-${stop.i}`}
                country={countryAt(activeCourse, stop.countryIndex).name}
                topic={stop.topic || h.jrTopicTbd}
                date={stop.endedAt}
                cities={`${stop.citiesVisited || 1}/${CITY_XP.length}`}
                index={stop.i}
                size={0.95}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
