import { useState, useMemo } from 'react';

export default function AnalyticsDashboard({ students, globalAssignments }) {
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
      let alertStatus = 'good'; // green
      let alertMsg = 'Ótimo engajamento';
      
      if (daysSinceLogin > 5 || (totalAssigns > 0 && completionRate < 50)) {
        alertStatus = 'danger'; // red
        alertMsg = 'Precisa de atenção';
      } else if (daysSinceLogin > 2 || (totalAssigns > 0 && completionRate < 80)) {
        alertStatus = 'warning'; // yellow
        alertMsg = 'Sinal amarelo';
      } else if (totalAssigns === 0) {
        alertStatus = 'neutral';
        alertMsg = 'Sem atividades';
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
    .sort((a, b) => b.completionRate - a.completionRate);

  return (
    <section>
      <h2>Dashboard Analytics</h2>
      <p style={{ color: 'var(--muted)', marginBottom: 20 }}>Visão geral do engajamento dos seus alunos ativos. Alunos com maior taxa de conclusão aparecem no topo.</p>

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
        {filteredData.map(student => {
          let statusBg = 'var(--paper)';
          let statusBorder = 'var(--line)';
          
          if (student.alertStatus === 'danger') {
            statusBg = '#FDEBEB'; statusBorder = '#9D2828';
          } else if (student.alertStatus === 'warning') {
            statusBg = '#FFF8EC'; statusBorder = 'var(--amber)';
          } else if (student.alertStatus === 'good') {
            statusBg = '#EAF7F1'; statusBorder = '#2D7158';
          }

          return (
            <div key={student.id} style={{ background: statusBg, border: `1px solid ${statusBorder}`, padding: 20, borderRadius: 16, display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center' }}>
              <div style={{ flex: '1 1 200px' }}>
                <h3 style={{ margin: '0 0 5px', fontSize: '1.2rem', color: 'var(--text)' }}>{student.name}</h3>
                <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>{student.alertMsg}</p>
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
