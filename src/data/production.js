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
