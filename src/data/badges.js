// Catálogo de conquistas. A ordem aqui é a ordem de exibição em "Minhas Conquistas".
// check(stats) recebe: streak, dailyStreak, wordsCount, voiceLabCount, libraryLevels
export const BADGES = [
  { id: 'streak_3', icon: '🔥', title: 'Streak 3', description: '3 dias seguidos', check: s => s.streak >= 3 },
  { id: 'streak_5', icon: '🔥', title: 'Streak 5', description: '5 dias seguidos', check: s => s.streak >= 5 },
  { id: 'streak_10', icon: '🔥', title: 'Streak 10', description: '10 dias seguidos', check: s => s.streak >= 10 },
  { id: 'streak_15', icon: '⚡', title: 'Streak 15', description: '15 dias seguidos', check: s => s.streak >= 15 },
  { id: 'streak_20', icon: '⚡', title: 'Streak 20', description: '20 dias seguidos', check: s => s.streak >= 20 },
  { id: 'streak_30', icon: '👑', title: 'Streak 30', description: '30 dias seguidos', check: s => s.streak >= 30 },
  { id: 'daily_3', icon: '📰', title: 'Daily x3', description: 'Daily 3 dias seguidos', check: s => s.dailyStreak >= 3 },
  { id: 'daily_7', icon: '🗞️', title: 'Daily x7', description: 'Daily 7 dias seguidos', check: s => s.dailyStreak >= 7 },
  { id: 'words_100', icon: '📚', title: '100 Palavras', description: '100 palavras estudadas', check: s => s.wordsCount >= 100 },
  { id: 'library_easy', icon: '🌱', title: 'Easy', description: '1º episódio Easy', check: s => s.libraryLevels.includes('easy') || s.libraryLevels.includes('easy-peasy') },
  { id: 'library_medium', icon: '🌿', title: 'Medium', description: '1º episódio Medium', check: s => s.libraryLevels.includes('medium') },
  { id: 'library_hard', icon: '🌳', title: 'Hard', description: '1º episódio Hard', check: s => s.libraryLevels.includes('hard') },
  { id: 'voice_lab_first', icon: '🎙️', title: 'Voice Lab', description: '1º desafio', check: s => s.voiceLabCount >= 1 }
];
