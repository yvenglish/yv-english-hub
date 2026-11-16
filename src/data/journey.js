// Viagem do aluno: cada tema que a teacher libera é um país; as cidades avançam com o XP.
// País e tema são só rótulos da viagem, sem ordem pedagógica. A ordem dos países é só para dar a sensação de viagem.
// Cada curso (en/es) tem a sua viagem em userData.journey[course]:
//   { current: { countryIndex, topic, tags, startedAt, startXp }, past: [...], upcoming: [{ topic, tags }] }

export const ROUTES = {
  en: [
    { flag: '🇺🇸', code: 'us', name: 'Estados Unidos', cities: ['New York', 'Boston', 'Chicago', 'New Orleans', 'Los Angeles', 'San Francisco'] },
    { flag: '🇮🇪', code: 'ie', name: 'Irlanda', cities: ['Dublin', 'Galway', 'Cork', 'Killarney', 'Limerick', 'Kilkenny'] },
    { flag: '🇬🇧', code: 'gb-eng', name: 'Inglaterra', cities: ['London', 'Oxford', 'Cambridge', 'Bath', 'Manchester', 'Liverpool'] },
    { flag: '🏴', code: 'gb-sct', name: 'Escócia', cities: ['Edinburgh', 'Glasgow', 'St Andrews', 'Inverness', 'Isle of Skye', 'Aberdeen'] },
    { flag: '🇨🇦', code: 'ca', name: 'Canadá', cities: ['Toronto', 'Montreal', 'Quebec City', 'Ottawa', 'Banff', 'Vancouver'] },
    { flag: '🇦🇺', code: 'au', name: 'Austrália', cities: ['Sydney', 'Melbourne', 'Brisbane', 'Cairns', 'Perth', 'Adelaide'] },
    { flag: '🇳🇿', code: 'nz', name: 'Nova Zelândia', cities: ['Auckland', 'Rotorua', 'Wellington', 'Queenstown', 'Christchurch', 'Milford Sound'] },
    { flag: '🇿🇦', code: 'za', name: 'África do Sul', cities: ['Cape Town', 'Stellenbosch', 'Durban', 'Johannesburg', 'Port Elizabeth', 'Kruger Park'] }
  ],
  es: [
    { flag: '🇲🇽', code: 'mx', name: 'México', cities: ['Ciudad de México', 'Puebla', 'Oaxaca', 'Guadalajara', 'Mérida', 'Cancún'] },
    { flag: '🇪🇸', code: 'es', name: 'España', cities: ['Madrid', 'Toledo', 'Sevilla', 'Granada', 'Valencia', 'Barcelona'] },
    { flag: '🇨🇴', code: 'co', name: 'Colombia', cities: ['Bogotá', 'Medellín', 'Salento', 'Cali', 'Cartagena', 'Santa Marta'] },
    { flag: '🇦🇷', code: 'ar', name: 'Argentina', cities: ['Buenos Aires', 'Córdoba', 'Mendoza', 'Salta', 'Bariloche', 'Ushuaia'] },
    { flag: '🇵🇪', code: 'pe', name: 'Perú', cities: ['Lima', 'Arequipa', 'Cusco', 'Puno', 'Trujillo', 'Iquitos'] },
    { flag: '🇨🇱', code: 'cl', name: 'Chile', cities: ['Santiago', 'Valparaíso', 'La Serena', 'San Pedro de Atacama', 'Puerto Varas', 'Puerto Natales'] },
    { flag: '🇨🇺', code: 'cu', name: 'Cuba', cities: ['La Habana', 'Viñales', 'Cienfuegos', 'Trinidad', 'Varadero', 'Santiago de Cuba'] },
    { flag: '🇺🇾', code: 'uy', name: 'Uruguay', cities: ['Montevideo', 'Colonia del Sacramento', 'Punta del Este', 'Piriápolis', 'Cabo Polonio', 'Salto'] }
  ]
};

// XP acumulado (desde a chegada no país) para chegar em cada cidade: +200, +250, +300, +350, +400.
// Com um dia de estudo normal (~60 XP) o país inteiro leva umas 4 semanas.
export const CITY_XP = [0, 200, 450, 750, 1100, 1500];

const routeOf = (course) => ROUTES[course] || ROUTES.en;

// Depois do último país a viagem recomeça pelo primeiro
export const countryAt = (course, index = 0) => {
  const route = routeOf(course);
  return route[((index % route.length) + route.length) % route.length];
};

export const newJourney = (startXp = 0) => ({
  current: { countryIndex: 0, topic: '', tags: [], startedAt: new Date().toISOString(), startXp },
  past: [],
  upcoming: []
});

export const getJourney = (userData, course) => userData?.journey?.[course] || null;

// Em que cidade o aluno está, com o XP total dele
export const cityState = (journey, xp = 0, course = 'en') => {
  const current = journey?.current || newJourney().current;
  const country = countryAt(course, current.countryIndex);
  const inCountry = Math.max(0, xp - (current.startXp || 0));
  let cityIndex = 0;
  while (cityIndex + 1 < CITY_XP.length && inCountry >= CITY_XP[cityIndex + 1]) cityIndex += 1;
  const done = cityIndex === CITY_XP.length - 1;
  const from = CITY_XP[cityIndex];
  const to = done ? from : CITY_XP[cityIndex + 1];
  return {
    country,
    cityIndex,
    cityName: country.cities[cityIndex],
    nextCityName: done ? null : country.cities[cityIndex + 1],
    toNext: done ? 0 : to - inCountry,
    pct: done ? 100 : Math.floor(((inCountry - from) / (to - from)) * 100),
    done
  };
};

const cleanTags = (tags) => (Array.isArray(tags) ? tags : String(tags || '').split(','))
  .map(t => t.trim()).filter(Boolean);
export { cleanTags };

// Teacher libera o próximo tema: o país atual vai para o passaporte e o aluno voa para o próximo.
// next: { topic, tags }. Se não vier, usa o primeiro tema anotado em "upcoming".
export const releaseNext = (journey, xp, course, next = null) => {
  const j = journey || newJourney(0);
  const upcoming = [...(j.upcoming || [])];
  const target = next || upcoming.shift() || { topic: '', tags: [] };
  const visited = cityState(j, xp, course).cityIndex + 1;
  return {
    current: { countryIndex: (j.current?.countryIndex || 0) + 1, topic: target.topic.trim(), tags: cleanTags(target.tags), startedAt: new Date().toISOString(), startXp: xp },
    past: [...(j.past || []), { ...j.current, endedAt: new Date().toISOString(), citiesVisited: visited }],
    upcoming
  };
};
