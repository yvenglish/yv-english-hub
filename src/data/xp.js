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
  let gained = 0;
  for (const action of actions) {
    let value = XP_VALUES[action] || 0;
    if (action in DAILY_CAPS) {
      value = Math.max(0, Math.min(value, DAILY_CAPS[action] - bySource[action]));
      bySource[action] += value;
    }
    gained += value;
  }
  if (gained === 0) return { gained: 0, updates: {}, levelUp: null };
  const before = data.xp || 0;
  const xp = before + gained;
  const newLevel = levelFromXp(xp);
  return {
    gained,
    updates: { xp, xpToday: { date: today, bySource } },
    levelUp: newLevel > levelFromXp(before) ? newLevel : null
  };
};
