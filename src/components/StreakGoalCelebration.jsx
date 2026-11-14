import { useAuth } from '../context/AuthContext';
import { UI_TEXTS } from '../data/uiTexts';
import { Confetti } from './games/RecordCelebration';

// Comemoração global quando o aluno bate a meta de streak (vale para qualquer atividade que conte para o streak)
export default function StreakGoalCelebration() {
  const { goalCelebration, dismissGoalCelebration, activeCourse } = useAuth();
  if (!goalCelebration) return null;
  const h = UI_TEXTS[activeCourse];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2500, display: 'grid', placeItems: 'center', padding: 20, background: 'radial-gradient(circle at 50% 35%, rgba(255,120,40,0.55), rgba(217,103,69,0.35) 35%, rgba(20,10,30,0.92) 75%)', backdropFilter: 'blur(6px)' }}>
      <style>{`
        @keyframes goal-flame { 0%, 100% { transform: scale(1) rotate(-4deg); } 50% { transform: scale(1.15) rotate(4deg); } }
        @keyframes goal-in { from { transform: scale(0.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
      <Confetti />
      <div style={{ width: '100%', maxWidth: 420, textAlign: 'center', padding: '40px 30px 30px', borderRadius: 32, background: 'linear-gradient(160deg, #3a1a10, #2a1220 60%, #1c0f24)', border: '2px solid #FF8A3D', boxShadow: '0 0 60px rgba(255,138,61,0.4), 0 30px 80px rgba(0,0,0,0.5)', animation: 'goal-in 0.45s cubic-bezier(.2,1.4,.4,1)' }}>
        <span style={{ fontSize: '5rem', display: 'block', lineHeight: 1, animation: 'goal-flame 1s ease-in-out infinite', filter: 'drop-shadow(0 8px 20px rgba(255,138,61,0.7))' }}>🔥</span>
        <h2 style={{ margin: '16px 0 8px', fontFamily: '"Playfair Display", serif', fontSize: '2.1rem', lineHeight: 1.1, color: '#FFB27A' }}>{h.goalCelebTitle(goalCelebration.goal)}</h2>
        <p style={{ margin: '0 0 18px', color: 'rgba(255,255,255,0.85)', fontSize: '1.05rem' }}>{h.goalCelebText(goalCelebration.streak)}</p>
        <p style={{ margin: '0 0 24px', display: 'inline-block', padding: '8px 16px', borderRadius: 99, background: 'rgba(255,255,255,0.1)', color: '#F0C87A', fontWeight: 800 }}>🎯 {h.goalCelebNext(goalCelebration.next)}</p>
        <button onClick={dismissGoalCelebration} style={{ width: '100%', padding: 16, borderRadius: 999, border: 'none', background: '#FF8A3D', color: '#2a1220', fontWeight: 900, fontSize: '1.05rem', cursor: 'pointer' }}>{h.goalCelebButton}</button>
      </div>
    </div>
  );
}
