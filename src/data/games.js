// Jogos do YV Language Club. Cada jogo fica na coleção "games" do Firestore:
// { type, title, level, course, deckTitle, imageUrl (só no jogo de imagem), items: [...], createdAt }
// Os jogos aparecem para todos os alunos do curso; o aluno filtra por nível.

export const GAME_TYPES = {
  word_guess: { icon: '🔤', label: 'Word Guess', itemsKey: 'words' },
  image: { icon: '🎯', label: 'Jogo de Imagem', itemsKey: 'points' },
  sentence_builder: { icon: '🧩', label: 'Sentence Builder', itemsKey: 'sentences' },
  listen: { icon: '👂', label: 'Ouça e escolha', itemsKey: 'items' }
};

export const GAME_LEVELS = ['easy-peasy', 'easy', 'medium', 'hard'];

const text = (v) => (typeof v === 'string' ? v.trim() : '');
const percent = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? Math.round(n * 10) / 10 : null;
};

// Normaliza os itens de cada tipo e devolve a lista de problemas encontrados
const normalizeItems = (type, raw) => {
  const problems = [];
  const items = [];
  (raw || []).forEach((item, i) => {
    const n = i + 1;
    if (type === 'word_guess') {
      const word = text(item.word);
      if (!word) return problems.push(`item ${n}: falta "word"`);
      items.push({ word, hint: text(item.hint), meaning: text(item.meaning) });
    } else if (type === 'image') {
      const word = text(item.word);
      if (!word) return problems.push(`ponto ${n}: falta "word"`);
      items.push({ word, translation: text(item.translation), x: percent(item.x), y: percent(item.y), audioUrl: text(item.audioUrl) });
    } else if (type === 'sentence_builder') {
      const sentence = text(item.sentence);
      if (!sentence || sentence.split(/\s+/).length < 2) return problems.push(`frase ${n}: precisa de "sentence" com pelo menos 2 palavras`);
      items.push({ sentence, translation: text(item.translation), hint: text(item.hint) });
    } else if (type === 'listen') {
      const word = text(item.word);
      if (!word || !text(item.translation)) return problems.push(`item ${n}: precisa de "word" e "translation"`);
      items.push({ word, translation: text(item.translation), audioUrl: text(item.audioUrl) });
    }
  });
  return { items, problems };
};

// Lê o JSON importado no admin (um jogo ou uma lista de jogos)
export const parseGamesJson = (data, course) => {
  const list = Array.isArray(data) ? data : [data];
  const games = [];
  const errors = [];

  list.forEach((g, i) => {
    const label = g?.title ? `"${g.title}"` : `jogo ${i + 1}`;
    if (!g || !GAME_TYPES[g.game]) {
      errors.push(`${label}: "game" precisa ser ${Object.keys(GAME_TYPES).join(', ')}`);
      return;
    }
    if (!text(g.title)) {
      errors.push(`${label}: falta "title"`);
      return;
    }
    const { items, problems } = normalizeItems(g.game, g[GAME_TYPES[g.game].itemsKey]);
    problems.forEach(p => errors.push(`${label}, ${p}`));
    if (items.length === 0) {
      errors.push(`${label}: nenhum item válido em "${GAME_TYPES[g.game].itemsKey}"`);
      return;
    }
    if (g.game === 'image' && !text(g.imageUrl)) {
      errors.push(`${label}: o jogo de imagem precisa de "imageUrl"`);
      return;
    }
    games.push({
      type: g.game,
      title: text(g.title),
      level: GAME_LEVELS.includes(g.level) ? g.level : '',
      course,
      deckTitle: text(g.deck),
      ...(g.game === 'image' ? { imageUrl: text(g.imageUrl) } : {}),
      items
    });
  });

  return { games, errors };
};

// Itens que já dá para jogar (no jogo de imagem, só os pontos marcados na imagem)
export const playableItems = (game) =>
  game.type === 'image' ? game.items.filter(p => p.x !== null && p.y !== null) : game.items;

// Embaralhamento uniforme (Fisher–Yates)
export const shuffle = (list) => {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// Comparação sem acento e sem maiúsculas (á = a, ñ = n)
export const plain = (str) => str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
