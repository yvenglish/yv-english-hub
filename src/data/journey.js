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

// XP para ir de uma cidade à próxima, crescente: 25, 50, 75, 100, 125 (acumulado desde a chegada no país).
// O país inteiro leva 375 XP: uns 6 dias de estudo normal (~60 XP por dia).
const CITY_STEPS = [25, 50, 75, 100, 125];
export const CITY_XP = CITY_STEPS.reduce((acc, step) => [...acc, acc[acc.length - 1] + step], [0]);

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

// Depois da última cidade o aluno não fica parado: continua voando e volta às cidades que já visitou,
// em ordem (1ª, 2ª…), até a teacher liberar o próximo país. Cada volta custa REVISIT_XP.
// O país só muda pela teacher (releaseNext); o XP sozinho nunca troca de país.
export const REVISIT_XP = 125;

// Em que cidade o aluno está, com o XP total dele.
// hops: quantos voos ele já fez dentro do país (só cresce, mesmo quando volta a cidades visitadas).
export const cityState = (journey, xp = 0, course = 'en') => {
  const current = journey?.current || newJourney().current;
  const country = countryAt(course, current.countryIndex);
  const n = country.cities.length;
  const last = CITY_XP[CITY_XP.length - 1];
  const inCountry = Math.max(0, xp - (current.startXp || 0));
  let hops = 0;
  while (hops + 1 < CITY_XP.length && inCountry >= CITY_XP[hops + 1]) hops += 1;
  if (hops === CITY_XP.length - 1) hops += Math.floor((inCountry - last) / REVISIT_XP);
  const reachedAt = hops < CITY_XP.length - 1 ? CITY_XP[hops] : last + (hops - (CITY_XP.length - 1)) * REVISIT_XP;
  const nextAt = hops + 1 < CITY_XP.length ? CITY_XP[hops + 1] : reachedAt + REVISIT_XP;
  const cityIndex = hops % n;
  const nextIndex = (hops + 1) % n;
  return {
    country,
    hops,
    cityIndex,
    cityName: country.cities[cityIndex],
    nextIndex,
    nextCityName: country.cities[nextIndex],
    toNext: nextAt - inCountry,
    pct: Math.floor(((inCountry - reachedAt) / (nextAt - reachedAt)) * 100),
    allVisited: hops >= n - 1,     // já conhece todas as cidades do país
    revisit: hops >= n,            // está numa cidade que já tinha visitado
    nextIsRevisit: hops + 1 >= n   // o próximo voo volta a uma cidade conhecida
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
  const visited = Math.min(cityState(j, xp, course).hops + 1, countryAt(course, j.current?.countryIndex || 0).cities.length);
  return {
    current: { countryIndex: (j.current?.countryIndex || 0) + 1, topic: target.topic.trim(), tags: cleanTags(target.tags), startedAt: new Date().toISOString(), startXp: xp },
    past: [...(j.past || []), { ...j.current, endedAt: new Date().toISOString(), citiesVisited: visited }],
    upcoming
  };
};
