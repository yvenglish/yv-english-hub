// Cursos do YV Language Club. Conteúdo sem o campo "course" é do curso de inglês (tudo que existia antes).
// "ui" guarda os textos da interface que mudam com o curso (biblioteca, player e Voice Lab).
export const COURSES = {
  en: {
    id: 'en', label: 'English', short: 'EN', speechLang: 'en-US', greeting: 'Hello',
    answerPlaceholder: 'Write your answer in English...',
    levels: { 'easy-peasy': 'Easy Peasy', easy: 'Easy', medium: 'Medium', hard: 'Hard' },
    ui: {
      libraryEyebrow: 'YV English — Language Academy & Method',
      libraryTitle: 'YV Input Library',
      librarySubtitle: 'Listening Practice',
      librarySubtitleAccent: '& Real English',
      librarySearch: 'Pesquisar episódios, gramática, temas...',
      all: 'Todos', favorites: 'Favoritos ❤️', grammar: 'Grammar Lab 🧪', completed: 'Concluídos 🏆',
      loadingEpisodes: 'Carregando episódios...', noEpisodes: 'Nenhum conteúdo encontrado.',
      voiceEyebrow: 'YV English — Voice Lab',
      voiceTitle: 'Listen, Remember & Repeat',
      voiceSubtitle: 'Speaking Practice',
      voiceSubtitleAccent: '& Pronunciation',
      voiceSearch: 'Pesquisar desafios, diálogos, temas...',
      loadingChallenges: 'Carregando desafios...', noChallenges: 'Nenhum desafio encontrado.',
      backToLibrary: 'Back to Library', addFavorite: 'Add to Favorites', markComplete: 'Mark as Complete',
      summary: 'SUMMARY', summaryHint: 'Read before or after listening', summaryMissing: 'Summary not available.',
      showOriginal: 'Show Original', translateSummary: 'Translate Summary',
      level: 'LEVEL', time: 'TIME', type: 'TYPE',
      originalSource: 'ORIGINAL SOURCE', audioPlayer: 'Audio Player', videoPlayer: 'Video / Player',
      theaterOn: '🎬 Theater Mode', theaterOff: '🎬 Exit Theater', playerPinned: 'Player is pinned.',
      tags: 'TAGS', vocabulary: 'VOCABULARY', vocabularyHint: 'Key Words (Click to Flip)', clickToReveal: 'Click to reveal',
      transcript: 'TRANSCRIPT (SCREENPLAY FORMAT)', questions: 'QUESTIONS', sendAnswers: 'Send your answers',
      name: 'Name', submitAnswers: 'Submit Answers', excellent: 'Excellent!'
    }
  },
  es: {
    id: 'es', label: 'Español', short: 'ES', speechLang: 'es-ES', greeting: '¡Hola',
    answerPlaceholder: 'Escribe tu respuesta en español...',
    levels: { 'easy-peasy': 'Principiante', easy: 'Fácil', medium: 'Medio', hard: 'Difícil' },
    ui: {
      libraryEyebrow: 'YV Español — Language Academy & Method',
      libraryTitle: 'Biblioteca YV',
      librarySubtitle: 'Práctica de escucha',
      librarySubtitleAccent: '& español real',
      librarySearch: 'Buscar episodios, gramática, temas...',
      all: 'Todos', favorites: 'Favoritos ❤️', grammar: 'Gramática 🧪', completed: 'Completados 🏆',
      loadingEpisodes: 'Cargando episodios...', noEpisodes: 'No se encontró contenido.',
      voiceEyebrow: 'YV Español — Voice Lab',
      voiceTitle: 'Escucha, recuerda y repite',
      voiceSubtitle: 'Práctica oral',
      voiceSubtitleAccent: '& pronunciación',
      voiceSearch: 'Buscar desafíos, diálogos, temas...',
      loadingChallenges: 'Cargando desafíos...', noChallenges: 'No se encontraron desafíos.',
      backToLibrary: 'Volver a la biblioteca', addFavorite: 'Añadir a favoritos', markComplete: 'Marcar como completado',
      summary: 'RESUMEN', summaryHint: 'Léelo antes o después de escuchar', summaryMissing: 'Resumen no disponible.',
      showOriginal: 'Ver original', translateSummary: 'Traducir resumen',
      level: 'NIVEL', time: 'DURACIÓN', type: 'TIPO',
      originalSource: 'FUENTE ORIGINAL', audioPlayer: 'Audio', videoPlayer: 'Video',
      theaterOn: '🎬 Modo cine', theaterOff: '🎬 Salir del modo cine', playerPinned: 'El reproductor está fijado.',
      tags: 'ETIQUETAS', vocabulary: 'VOCABULARIO', vocabularyHint: 'Palabras clave (haz clic para girar)', clickToReveal: 'Haz clic para ver',
      transcript: 'TRANSCRIPCIÓN', questions: 'PREGUNTAS', sendAnswers: 'Envía tus respuestas',
      name: 'Nombre', submitAnswers: 'Enviar respuestas', excellent: '¡Excelente!'
    }
  }
};

export const DEFAULT_COURSE = 'en';

export const getCourse = (item) => item?.course || DEFAULT_COURSE;

export const inCourse = (item, course) => getCourse(item) === course;

export const getLevelLabel = (level, course) => COURSES[course]?.levels[level] || level;

// Cursos que o aluno faz (alunos antigos não têm o campo e são de inglês)
export const getUserCourses = (userData) =>
  (userData?.courses?.length ? userData.courses : [DEFAULT_COURSE]).filter(c => COURSES[c]);
