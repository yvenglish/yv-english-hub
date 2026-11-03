// Cursos do YV Language Club. Conteúdo sem o campo "course" é do curso de inglês (tudo que existia antes).
export const COURSES = {
  en: { id: 'en', label: 'English', flag: '🇺🇸', speechLang: 'en-US', greeting: 'Hello', answerPlaceholder: 'Write your answer in English...' },
  es: { id: 'es', label: 'Español', flag: '🇪🇸', speechLang: 'es-ES', greeting: '¡Hola', answerPlaceholder: 'Escribe tu respuesta en español...' }
};

export const DEFAULT_COURSE = 'en';

export const getCourse = (item) => item?.course || DEFAULT_COURSE;

export const inCourse = (item, course) => getCourse(item) === course;

// Cursos que o aluno faz (alunos antigos não têm o campo e são de inglês)
export const getUserCourses = (userData) =>
  (userData?.courses?.length ? userData.courses : [DEFAULT_COURSE]).filter(c => COURSES[c]);
