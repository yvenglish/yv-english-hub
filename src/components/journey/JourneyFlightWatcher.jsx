import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UI_TEXTS } from '../../data/uiTexts';
import { cityState, countryAt, getJourney } from '../../data/journey';
import FlightAnimation from './FlightAnimation';

// Voo internacional assim que o aluno abre o hub depois de a teacher trocar o país dele.
// Aparece uma vez por troca: depois de mostrar, o app guarda em journeySeen que esse voo já foi visto.
export default function JourneyFlightWatcher() {
  const { userData, activeCourse, markJourneySeen } = useAuth();
  const [flight, setFlight] = useState(null);
  const checked = useRef(null);
  const journey = getJourney(userData, activeCourse);

  useEffect(() => {
    if (!journey || userData?.role === 'master') return;
    const key = `${activeCourse}:${journey.current.startedAt}`;
    if (checked.current === key) return;
    checked.current = key;

    const seen = userData?.journeySeen?.[activeCourse];
    const past = journey.past || [];
    if (past.length === 0 || seen?.startedAt === journey.current.startedAt) return;

    const last = past[past.length - 1];
    setFlight({
      from: { ...last, country: countryAt(activeCourse, last.countryIndex), index: past.length - 1 },
      to: { country: countryAt(activeCourse, journey.current.countryIndex), topic: journey.current.topic }
    });
    markJourneySeen(activeCourse, { startedAt: journey.current.startedAt, hops: cityState(journey, userData?.xp || 0, activeCourse).hops });
  }, [journey, activeCourse, userData, markJourneySeen]);

  if (!flight) return null;
  return <FlightAnimation h={UI_TEXTS[activeCourse]} from={flight.from} to={flight.to} onDone={() => setFlight(null)} />;
}
