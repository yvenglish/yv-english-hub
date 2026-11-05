// Ícones dos decks: o emoji escolhido no admin ou, sem ele, um palpite pelo título.

export const SUGGESTED_DECK_ICONS = ['🧍', '👕', '👜', '📅', '🍎', '🏠', '👪', '🐾', '🎨', '🔢', '☀️', '🏃', '💼', '✈️', '🗣️', '👥', '🔤', '❤️', '🎵', '📚'];

// Palavras-chave (inglês, espanhol e português) → ícone
const KEYWORDS = [
  // "vocabulary" vem primeiro: "Vocabulary of the Week" é vocabulário, não calendário
  [['vocabulary', 'vocabulario', 'vocabulário', 'vocab'], '📚'],
  [['body', 'cuerpo', 'corpo', 'face', 'cara', 'rosto'], '🧍'],
  [['cloth', 'ropa', 'roupa', 'wear'], '👕'],
  [['accessor', 'accesorio', 'acessório', 'acessorio'], '👜'],
  [['week', 'semana', 'day', 'día', 'dia', 'month', 'mes', 'date', 'fecha', 'calendar'], '📅'],
  [['food', 'comida', 'fruit', 'fruta', 'drink', 'bebida', 'restaurant', 'kitchen', 'cocina'], '🍎'],
  [['house', 'home', 'casa', 'room', 'habitación', 'furniture', 'mueble'], '🏠'],
  [['family', 'familia', 'família'], '👪'],
  [['animal', 'pet', 'mascota'], '🐾'],
  [['color', 'colour', 'cor'], '🎨'],
  [['number', 'número', 'numero'], '🔢'],
  [['weather', 'tiempo', 'clima', 'season', 'estación'], '☀️'],
  [['verb', 'verbo', 'action', 'acción'], '🏃'],
  [['work', 'job', 'trabajo', 'trabalho', 'office', 'oficina', 'business'], '💼'],
  [['travel', 'viaje', 'viagem', 'airport', 'aeropuerto', 'city', 'ciudad'], '✈️'],
  [['pronoun', 'pronombre', 'pronome', 'people', 'gente'], '👥'],
  [['th-', 'sound', 'sonido', 'pronunc', 'phonetic', 'letter', 'letra'], '🔤']
];

export const getDeckIcon = (deck) => {
  if (deck.icon) return deck.icon;
  const title = (deck.title || '').toLowerCase();
  const match = KEYWORDS.find(([words]) => words.some(w => title.includes(w)));
  return match ? match[1] : '🗂️';
};
