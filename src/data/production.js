// Tarefas de produção (resposta escrita/áudio da semana)
export const TASK_TYPES = {
  text: 'Resposta escrita',
  audio: 'Áudio',
  both: 'Escrita + áudio'
};

export const RUBRIC = [
  { key: 'grammar', label: 'Gramática' },
  { key: 'vocabulary', label: 'Vocabulário' },
  { key: 'pronunciation', label: 'Pronúncia' },
  { key: 'fluency', label: 'Fluência' }
];

export const RUBRIC_LEVELS = { 1: 'Precisa praticar', 2: 'Bom', 3: 'Excelente' };

export const MAX_TEXT_LENGTH = 600;
export const MAX_AUDIO_SECONDS = 120;

// Versões em espanhol para o aluno do curso ES (o admin continua em português)
const TASK_TYPES_ES = { text: 'Respuesta escrita', audio: 'Audio', both: 'Escrita + audio' };
const RUBRIC_LABELS_ES = { grammar: 'Gramática', vocabulary: 'Vocabulario', pronunciation: 'Pronunciación', fluency: 'Fluidez' };
const RUBRIC_LEVELS_ES = { 1: 'Necesita práctica', 2: 'Bien', 3: 'Excelente' };

export const getTaskTypeLabel = (type, course) => (course === 'es' ? TASK_TYPES_ES : TASK_TYPES)[type];
export const getRubricLabel = (rubric, course) => (course === 'es' ? RUBRIC_LABELS_ES[rubric.key] : rubric.label);
export const getRubricLevel = (value, course) => (course === 'es' ? RUBRIC_LEVELS_ES : RUBRIC_LEVELS)[value];
