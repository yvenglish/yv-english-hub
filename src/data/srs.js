// Repetição espaçada dos flashcards (variação do SM-2).
// score: 0 = errou, 1 = difícil, 2 = bom, 3 = fácil
// As datas são "dias de estudo" no formato YYYY-MM-DD (o dia vira às 6h, ver AuthContext).

export const REVIEW_BATCH_SIZE = 7; // cards por rodada da Daily Review (terminou e ainda há atrasadas? vem outra rodada)
export const DIFFICULT_LAPSES = 3;    // erros acumulados para a palavra entrar em "Palavras difíceis"
const MIN_EASE = 1.3;
const MAX_INTERVAL = 365;

const num = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

// Soma dias a uma data YYYY-MM-DD sem depender do fuso do navegador
export const addDays = (dateStr, days) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().split('T')[0];
};

export const scheduleReview = (prev = {}, score, today) => {
  let repetitions = num(prev.repetitions, 0);
  let interval = num(prev.interval, 0);
  let easeFactor = num(prev.easeFactor, 2.5);
  let lapses = num(prev.lapses, 0);

  if (score === 0) {
    // Errou: recomeça e volta ainda hoje
    return {
      repetitions: 0,
      interval: 0,
      easeFactor: Math.max(MIN_EASE, easeFactor - 0.2),
      lapses: lapses + 1,
      nextReviewDate: today
    };
  }

  repetitions += 1;
  if (score === 1) {
    easeFactor = Math.max(MIN_EASE, easeFactor - 0.15);
    interval = repetitions === 1 ? 1 : Math.max(interval + 1, Math.round(interval * 1.2));
  } else {
    if (score === 3) easeFactor += 0.15;
    if (repetitions === 1) interval = score === 3 ? 4 : 1;
    else if (repetitions === 2) interval = score === 3 ? 8 : 6;
    else interval = Math.round(interval * easeFactor * (score === 3 ? 1.3 : 1));
  }
  interval = Math.min(MAX_INTERVAL, Math.max(1, interval));

  return { repetitions, interval, easeFactor, lapses, nextReviewDate: addDays(today, interval) };
};

// Nota a partir do tempo de resposta nos modos de quiz: acertar rápido conta como "fácil"
export const scoreFromAnswer = (isCorrect, seconds, fastLimit) => {
  if (!isCorrect) return 0;
  return seconds <= fastLimit ? 3 : 2;
};

// Situação da palavra para o aluno: nova (nunca estudada), aprendendo ou dominada (2+ acertos seguidos)
export const wordStatus = (progress) => {
  if (!progress) return 'new';
  return (progress.repetitions || 0) >= 2 ? 'mastered' : 'learning';
};
