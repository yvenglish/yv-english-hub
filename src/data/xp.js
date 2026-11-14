// XP e níveis. Todos os valores ficam aqui para ajustar depois de ver os alunos usando.
// Referência: um dia de estudo normal (Daily + 1 rodada da Daily Review + 1 jogo) rende uns 55-60 XP.

export const XP_VALUES = {
  daily: 30,            // Daily concluído
  review_round: 15,     // rodada da Daily Review
  study: 10,            // sessão de flashcards (Aprender, Cards…) até o fim
  game: 10,             // partida de jogo
  record: 10,           // bônus por bater o recorde num jogo
  library_episode: 25,  // episódio da Biblioteca marcado como visto (uma vez por episódio)
  extra_content: 15,    // conteúdo extra concluído (uma vez por conteúdo)
  week_task: 40,        // tarefa da semana enviada (uma vez por semana)
  voice_lab: 20,        // desafio do Voice Lab concluído (uma vez por desafio)
  streak_goal: 50       // bônus por bater a meta de streak
};

// XP em dobro: vale do dia "from" até o dia "until" (inclusive), em dias de estudo.
// Lançamento do XP: 15 dias em dobro (14/11 a 28/11/2026). Os tetos diários também dobram.
export const XP_BOOST = { multiplier: 2, from: '2026-11-14', until: '2026-11-28' };
export const boostFor = (today) => (today >= XP_BOOST.from && today <= XP_BOOST.until ? XP_BOOST.multiplier : 1);

// Teto diário das atividades que dá para repetir à vontade (evita "farmar" XP)
export const DAILY_CAPS = { study: 40, game: 60, record: 30 };

// Nível N começa em 50·N·(N-1) XP: 2 → 100, 3 → 300, 4 → 600, 5 → 1000, 10 → 4500
export const levelThreshold = (level) => 50 * level * (level - 1);

export const levelFromXp = (xp = 0) => {
  let level = 1;
  while (xp >= levelThreshold(level + 1)) level += 1;
  return level;
};

export const levelProgress = (xp = 0) => {
  const level = levelFromXp(xp);
  const start = levelThreshold(level);
  const next = levelThreshold(level + 1);
  return { level, current: xp - start, needed: next - start, toNext: next - xp, pct: Math.round(((xp - start) / (next - start)) * 100) };
};

// Calcula o XP ganho por uma ou mais ações e os campos a salvar no usuário.
// xpToday guarda quanto cada fonte com teto já rendeu no dia (sempre com todas as chaves,
// porque o setDoc com merge não apaga chaves antigas de um mapa).
export const applyXp = (data = {}, actions = [], today) => {
  const prev = data.xpToday?.date === today ? data.xpToday.bySource || {} : {};
  const bySource = Object.fromEntries(Object.keys(DAILY_CAPS).map(k => [k, prev[k] || 0]));
  const multiplier = boostFor(today);
  let gained = 0;
  for (const action of actions) {
    let value = (XP_VALUES[action] || 0) * multiplier;
    if (action in DAILY_CAPS) {
      value = Math.max(0, Math.min(value, DAILY_CAPS[action] * multiplier - bySource[action]));
      bySource[action] += value;
    }
    gained += value;
  }
  if (gained === 0) return { gained: 0, updates: {}, levelUp: null, multiplier };
  const before = data.xp || 0;
  const xp = before + gained;
  const newLevel = levelFromXp(xp);
  return {
    gained,
    updates: { xp, xpToday: { date: today, bySource } },
    levelUp: newLevel > levelFromXp(before) ? newLevel : null,
    multiplier
  };
};

// Bônus de boas-vindas: XP pelo que o aluno já fez antes do sistema de XP existir.
// Dado uma vez só. Episódios, extras e tarefas viram "claims" para não renderem XP de novo.
// history: { dailies, episodes: [ids], extras: [ids], tasks: [ids], voiceLab, goals, records, claimed: [claims] }
export const welcomeBonus = (history) => {
  const claimed = new Set(history.claimed || []);
  const fresh = (prefix, ids = []) => ids.map(id => `${prefix}:${id}`).filter(c => !claimed.has(c));
  const episodes = fresh('lib', history.episodes);
  const extras = fresh('extra', history.extras);
  const tasks = fresh('task', history.tasks);
  const parts = {
    daily: (history.dailies || 0) * XP_VALUES.daily,
    library_episode: episodes.length * XP_VALUES.library_episode,
    extra_content: extras.length * XP_VALUES.extra_content,
    week_task: tasks.length * XP_VALUES.week_task,
    voice_lab: (history.voiceLab || 0) * XP_VALUES.voice_lab,
    streak_goal: (history.goals || 0) * XP_VALUES.streak_goal,
    record: (history.records || 0) * XP_VALUES.record
  };
  return { amount: Object.values(parts).reduce((a, b) => a + b, 0), parts, claims: [...episodes, ...extras, ...tasks] };
};
