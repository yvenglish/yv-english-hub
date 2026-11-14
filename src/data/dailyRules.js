import { studyDay } from './srs';

// Qual Daily o aluno vê hoje.
// Regra: um Daily por dia. Se a teacher agendou mais de um para hoje, o aluno faz todos os de hoje.
// Sem nada agendado para hoje, faz um só: o atrasado mais antigo ou, sem atrasados, um automático.
// Retorna { target, pendingTodayCount, needsAutopilot }.
export const pickDailyAssignment = (assignments, today = studyDay()) => {
  const valid = assignments
    .filter(a => a.scheduledDate <= today)
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));

  const pendingToday = valid.filter(a => a.status === 'pending' && a.scheduledDate === today);
  const pendingOverdue = valid.filter(a => a.status === 'pending' && a.scheduledDate < today);
  const doneToday = assignments
    .filter(a => a.status === 'completed' && a.completedAt && studyDay(a.completedAt) === today)
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt));

  if (pendingToday.length > 0) return { target: pendingToday[0], pendingTodayCount: pendingToday.length, needsAutopilot: false };
  // Já fez o do dia: mostra o último feito, sem "próximo"
  if (doneToday.length > 0) return { target: doneToday[doneToday.length - 1], pendingTodayCount: 0, needsAutopilot: false };
  // Atrasados saem um por dia
  if (pendingOverdue.length > 0) return { target: pendingOverdue[0], pendingTodayCount: 0, needsAutopilot: false };
  // Nada para hoje: o app cria um automático (ou, se não puder, mostra o último feito)
  const lastCompleted = valid.filter(a => a.status === 'completed').pop() || null;
  return { target: lastCompleted, pendingTodayCount: 0, needsAutopilot: true };
};
