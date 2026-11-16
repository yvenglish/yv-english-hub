import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UI_TEXTS } from '../../data/uiTexts';
import { cityState, countryAt, getJourney } from '../../data/journey';
import FlightAnimation from './FlightAnimation';

// Voos que aparecem assim que o aluno abre o hub (uma vez cada):
//   - troca de país feita pela teacher: carimbo do país anterior + voo até o novo;
//   - primeira entrada depois da chegada da viagem: voo de boas-vindas saindo do Brasil até o primeiro país.
export default function JourneyFlightWatcher() {
  const { userData, activeCourse, startJourney, markJourneySeen, markJourneyIntro } = useAuth();
  const [flight, setFlight] = useState(null);
  const checked = useRef(null);
  const journey = getJourney(userData, activeCourse);
  const isStudent = userData && userData.role !== 'master';

  // Quem ainda não tem viagem neste curso começa agora (para o voo de boas-vindas ter destino)
  useEffect(() => { if (isStudent && !journey) startJourney(); }, [isStudent, journey, startJourney]);

  useEffect(() => {
    if (!isStudent || !journey) return;
    const key = `${activeCourse}:${journey.current.startedAt}`;
    if (checked.current === key) return;
    checked.current = key;

    const h = UI_TEXTS[activeCourse];
    const seen = userData?.journeySeen?.[activeCourse];
    const introSeen = !!userData?.journeyIntro?.[activeCourse];
    const past = journey.past || [];
    const to = { country: countryAt(activeCourse, journey.current.countryIndex), topic: journey.current.topic };
    const hops = cityState(journey, userData?.xp || 0, activeCourse).hops;

    if (past.length > 0 && seen?.startedAt !== journey.current.startedAt) {
      const last = past[past.length - 1];
      setFlight({ intro: false, to, from: { ...last, country: countryAt(activeCourse, last.countryIndex), index: past.length - 1 } });
    } else if (!introSeen) {
      setFlight({ intro: true, to, from: { country: { name: h.jrHome, code: 'br' } } });
    } else {
      return;
    }
    markJourneySeen(activeCourse, { startedAt: journey.current.startedAt, hops });
    if (!introSeen) markJourneyIntro(activeCourse);
  }, [isStudent, journey, activeCourse, userData, markJourneySeen, markJourneyIntro]);

  if (!flight) return null;
  return <FlightAnimation h={UI_TEXTS[activeCourse]} from={flight.from} to={flight.to} intro={flight.intro} onDone={() => setFlight(null)} />;
}
