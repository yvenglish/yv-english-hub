import { useState, useMemo } from 'react';

export default function AnalyticsDashboard({ students, globalAssignments, onSelectStudent }) {
  const [searchTerm, setSearchTerm] = useState('');

  const activeStudents = students.filter(s => s.role === 'student' && s.active);

  const analyticsData = useMemo(() => {
    return activeStudents.map(student => {
      const assigns = globalAssignments.filter(a => a.studentId === student.id);
      const totalAssigns = assigns.length;
      const completedAssigns = assigns.filter(a => a.status === 'completed').length;
      const completionRate = totalAssigns > 0 ? (completedAssigns / totalAssigns) * 100 : 0;
      
      const lastLoginDate = student.lastLogin ? new Date(student.lastLogin) : null;
      let daysSinceLogin = -1;
      if (lastLoginDate) {
        const diffTime = Math.abs(new Date() - lastLoginDate);
        daysSinceLogin = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      }

      // Determine alert status
      let alertStatus;
      let alertMsg;
      
      if (totalAssigns === 0) {
        alertStatus = 'neutral';
        alertMsg = 'Sem atividades';
      } else if (completionRate < 50) {
        alertStatus = 'danger'; // red
        alertMsg = 'Precisa de atenção';
      } else if (completionRate < 70) {
        alertStatus = 'warning'; // yellow
        alertMsg = 'Sinal amarelo';
      } else {
        alertStatus = 'good'; // green
        alertMsg = 'Ótimo engajamento';
      }

      // Rebaixa o sinal se estiver 7 dias ou mais sem login
      if (daysSinceLogin >= 7 && alertStatus !== 'neutral') {
        if (alertStatus === 'good') {
          alertStatus = 'warning';
          alertMsg = 'Sinal amarelo (7+ dias sem login)';
        } else if (alertStatus === 'warning') {
          alertStatus = 'danger';
          alertMsg = 'Precisa de atenção (7+ dias sem login)';
        }
      }

      return {
        ...student,
        totalAssigns,
        completedAssigns,
        completionRate,
        daysSinceLogin,
        alertStatus,
        alertMsg
      };
    });
  }, [activeStudents, globalAssignments]);

  const filteredData = analyticsData
    .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.email.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      const streakA = a.currentStreak || 0;
      const streakB = b.currentStreak || 0;
      if (streakB !== streakA) {
        return streakB - streakA;
      }
      if (b.completionRate !== a.completionRate) {
        return b.completionRate - a.completionRate;
      }
      const daysA = a.daysSinceLogin === -1 ? Infinity : a.daysSinceLogin;
      const daysB = b.daysSinceLogin === -1 ? Infinity : b.daysSinceLogin;
      return daysA - daysB;
    });

  return (
    <section>
      <h2>Dashboard Analytics</h2>
      <p style={{ color: 'var(--muted)', marginBottom: 20 }}>Visão geral do engajamento dos seus alunos ativos. Alunos com maior ofensiva (streak) aparecem no topo.</p>

      <div style={{ marginBottom: 20 }}>
        <input 
          type="text" 
          placeholder="Buscar aluno..." 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)} 
          style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }} 
        />
      </div>

      <div style={{ display: 'grid', gap: 15 }}>
        {filteredData.map((student, index) => {
          let dotColor = 'var(--muted)';
          
          if (student.alertStatus === 'danger') {
            dotColor = '#ef4444';
          } else if (student.alertStatus === 'warning') {
            dotColor = '#f59e0b';
          } else if (student.alertStatus === 'good') {
            dotColor = '#10b981';
          }

          return (
            <div 
              key={student.id} 
              onClick={() => onSelectStudent && onSelectStudent(student)}
              style={{ background: 'var(--paper)', border: '1px solid var(--line)', padding: 20, borderRadius: 16, display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center', cursor: 'pointer' }}
            >
              <div style={{ flex: '1 1 200px' }}>
                <h3 style={{ margin: '0 0 5px', fontSize: '1.2rem', color: 'var(--text)' }}>
                  {index + 1}. {student.name}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: dotColor, display: 'inline-block' }}></span>
                  <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>{student.alertMsg}</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 30, flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Taxa de Conclusão</span>
                  <strong style={{ fontSize: '1.5rem', color: 'var(--text)' }}>
                    {student.totalAssigns > 0 ? `${student.completionRate.toFixed(0)}%` : '-'}
                  </strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                    {student.completedAssigns} de {student.totalAssigns}
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Ofensiva</span>
                  <strong style={{ fontSize: '1.5rem', color: 'var(--text)' }}>
                    {student.currentStreak || 0} 🔥
                  </strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Dias seguidos</div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Último Login</span>
                  <strong style={{ fontSize: '1.5rem', color: 'var(--text)' }}>
                    {student.daysSinceLogin === -1 ? 'Nunca' : student.daysSinceLogin === 0 ? 'Hoje' : `Há ${student.daysSinceLogin} dia(s)`}
                  </strong>
                </div>
              </div>
            </div>
          );
        })}

        {filteredData.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Nenhum aluno encontrado.</div>
        )}
      </div>
    </section>
  );
}
