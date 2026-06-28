import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, addDoc } from 'firebase/firestore';
import { requestNotificationPermission } from '../services/notificationService';

export default function StudentHub() {
  const { currentUser, userData, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);

  // Daily Content State
  const [dailyAssignment, setDailyAssignment] = useState(null);
  const [dailyContentDetails, setDailyContentDetails] = useState(null);
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [dailyLoading, setDailyLoading] = useState(false);
  
  // Notification State
  const [showNotificationBanner, setShowNotificationBanner] = useState(false);

  useEffect(() => {
    if (currentUser) {
      fetchWeeks();
      fetchDailyAssignment();
      
      // Check if we should show the banner
      if ('Notification' in window && Notification.permission === 'default' && userData?.plan !== 'Foundation') {
         setShowNotificationBanner(true);
      }
    }
  }, [currentUser, userData]);

  const handleEnableNotifications = async () => {
    const success = await requestNotificationPermission(currentUser.uid);
    if (success) {
      setShowNotificationBanner(false);
      alert('Notificações ativadas com sucesso!');
    } else {
      alert('Não foi possível ativar as notificações.');
    }
  };

  // Read location state for global search selection
  useEffect(() => {
    if (location.state?.openWeekId && weeks.length > 0) {
      const targetWeek = weeks.find(w => w.id === location.state.openWeekId);
      if (targetWeek) {
        setSelectedWeek(targetWeek);
        // Clean up state so a refresh doesn't reopen it
        navigate('.', { replace: true, state: {} });
      }
    }
  }, [location.state, weeks, navigate]);

  const fetchWeeks = async () => {
    try {
      const q = query(collection(db, 'weeks'), where('studentId', '==', currentUser.uid));
      const snap = await getDocs(q);
      setWeeks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
  };

  const fetchDailyAssignment = async () => {
    try {
      const planName = userData?.plan || 'Foundation';
      const q = query(collection(db, 'daily_assignments'), where('studentId', '==', currentUser.uid));
      const snap = await getDocs(q);
      const assignments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const today = new Date().toISOString().split('T')[0];
      const valid = assignments.filter(a => a.scheduledDate <= today);
      valid.sort((a,b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

      const pending = valid.find(a => a.status === 'pending');
      let targetAssignment = null;
      
      if (pending) {
        targetAssignment = pending;
      } else {
        // --- AUTO-PILOT ENGINE ---
        const completedToday = valid.find(a => a.scheduledDate === today && a.status === 'completed');
        
        if (!completedToday && planName !== 'Foundation') {
           // Auto-Pilot: Fetch bank items
           const bankSnap = await getDocs(collection(db, 'daily_bank'));
           const allBankItems = bankSnap.docs.map(d => ({ id: d.id, ...d.data() }));
           const doneContentIds = assignments.map(a => a.contentId);
           const available = allBankItems.filter(item => !doneContentIds.includes(item.id));
           
           if (available.length > 0) {
               // Prefer picking items that match tags from past, or just pick random available
               const picked = available[0]; // For simplicity, pick first available.
               const autoPayload = {
                  studentId: currentUser.uid,
                  contentId: picked.id,
                  scheduledDate: today,
                  status: 'pending',
                  createdAt: new Date().toISOString(),
                  isAutoPilot: true
               };
               const newDoc = await addDoc(collection(db, 'daily_assignments'), autoPayload);
               targetAssignment = { id: newDoc.id, ...autoPayload };
           }
        } else if (completedToday) {
           targetAssignment = completedToday;
        } else if (valid.length > 0) {
           targetAssignment = valid[valid.length - 1]; // most recent completed
        }
      }

      if (targetAssignment) {
        setDailyAssignment(targetAssignment);
        const bankDoc = await getDoc(doc(db, 'daily_bank', targetAssignment.contentId));
        if (bankDoc.exists()) {
          const rawData = bankDoc.data();
          // Normalize to questions array for backward compatibility
          if (!rawData.questions && rawData.question) {
            rawData.questions = [{
              questionText: rawData.question,
              options: rawData.options,
              correctOption: rawData.correctOption
            }];
          }
          setDailyContentDetails({ id: bankDoc.id, ...rawData });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const studentName = userData?.name || 'Aluno';
  const planName = userData?.plan || 'Foundation';

  const handleDailyClick = () => {
    if (planName === 'Foundation') setShowUpgradeModal(true);
    else setShowDailyModal(true);
  };

  const handleFlashcardsClick = () => {
    if (planName === 'Foundation') setShowUpgradeModal(true);
    else navigate('/flashcards');
  };

  const handleAnswerDaily = async (questionIndex, optionKey) => {
    if (dailyLoading || !dailyAssignment || dailyAssignment.status === 'completed') return;
    
    setDailyLoading(true);
    const currentAnswers = dailyAssignment.studentAnswers || {};
    
    // Allow changing answer if they haven't finished yet
    const newAnswers = { ...currentAnswers, [questionIndex]: optionKey };
    
    const questionsList = dailyContentDetails.questions || [];
    const isFinished = Object.keys(newAnswers).length === questionsList.length;
    
    try {
      const updateData = { studentAnswers: newAnswers };
      
      if (isFinished) {
         updateData.status = 'completed';
         updateData.completedAt = new Date().toISOString();
         
         let correctCount = 0;
         questionsList.forEach((q, idx) => {
             if (newAnswers[idx] === q.correctOption) correctCount++;
         });
         updateData.score = correctCount;
         updateData.totalQuestions = questionsList.length;
      }
      
      await updateDoc(doc(db, 'daily_assignments', dailyAssignment.id), updateData);
      setDailyAssignment({ ...dailyAssignment, ...updateData });
    } catch (err) { console.error(err); }
    setDailyLoading(false);
  };

  return (
    <div className="site-shell unlocked">
      <header className="hero" style={{ paddingTop: 40 }}>
        <div className="hero-inner">
          <div className="hero-grid">
            <div className="hero-body">
              <p className="eyebrow">Sua área pessoal</p>
              <h1>Hello,<br/><em>{studentName}</em> ✦</h1>
              <p className="hero-sub">Seu painel com semanas, Daily Content, exercícios extras, flashcards inteligentes e conteúdos recomendados pela Yas.</p>
              <div className="hero-actions">
                <button onClick={() => document.getElementById('weeksSection').scrollIntoView({ behavior: 'smooth' })}>Ver semanas</button>
                <button className="ghost" onClick={handleFlashcardsClick}>Estudar flashcards</button>
              </div>
            </div>

            <aside className="hero-panel">
              <span>Fluency Path</span>
              <strong>Focus now</strong>
              <p>{weeks.length > 0 ? weeks[0].title : 'Aguardando novo material...'}</p>
            </aside>
          </div>
        </div>
      </header>

      <main>
        {showNotificationBanner && (
          <div style={{ background: 'rgba(138, 124, 255, 0.15)', border: '1px solid var(--purple)', borderRadius: 16, padding: '16px 24px', marginBottom: 30, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 15 }}>
            <div>
              <h4 style={{ margin: '0 0 5px 0', color: '#fff', fontSize: '1rem' }}>Lembrete Diário 🔔</h4>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.85rem' }}>Ative as notificações para receber seu alerta diário de estudos às 14h.</p>
            </div>
            <button onClick={handleEnableNotifications} style={{ background: 'var(--purple)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 99, fontWeight: 'bold', cursor: 'pointer' }}>
              Ativar Alertas
            </button>
          </div>
        )}

        <section className="quick-grid" aria-label="Atalhos principais">
          <button className="feature-card" onClick={handleDailyClick}>
            <span className="feature-icon">📌</span>
            <span className="feature-kicker">Daily Content</span>
            <strong>Texto e exercícios de hoje</strong>
            <small>
              {dailyAssignment 
                ? (dailyAssignment.status === 'completed' ? 'Feito hoje! ✅' : 'Novo material disponível!')
                : 'Você está em dia com os materiais.'}
            </small>
          </button>

          <button className="feature-card" onClick={handleFlashcardsClick}>
            <span className="feature-icon">🃏</span>
            <span className="feature-kicker">Smart Review</span>
            <strong>Flashcards do glossário</strong>
            <small>Revisão com algoritmo de repetição</small>
          </button>
          
          <button className="feature-card" onClick={() => window.open('https://yvenglish.github.io/The-Fluency-Times/', '_blank')}>
            <span className="feature-icon" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span>🗞️</span>
              <span style={{ fontSize: '0.65rem', background: 'rgba(200, 136, 58, 0.15)', padding: '2px 8px', borderRadius: 99, color: 'var(--amber)', fontWeight: 800 }}>NEWS</span>
            </span>
            <span className="feature-kicker">The Fluency Times</span>
            <strong>Notícias no seu nível</strong>
            <small>Leitura, áudio e interpretação</small>
          </button>

          <button className="feature-card" onClick={() => navigate('/library')}>
            <span className="feature-icon" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span>🎧</span>
              <span style={{ fontSize: '0.65rem', background: 'rgba(138, 124, 255, 0.15)', padding: '2px 8px', borderRadius: 99, color: 'var(--purple)', fontWeight: 800 }}>LIBRARY</span>
            </span>
            <span className="feature-kicker">YV Input</span>
            <strong>Biblioteca de Imersão</strong>
            <small>Pratique o seu listening com materiais autênticos</small>
          </button>
        </section>

        <section className="section-block" id="weeksSection">
          <div className="section-heading">
            <p>Semanas</p>
            <h2>Material organizado por aula</h2>
            <span>Abra cada semana para ver foco, exercícios, vocabulário e links extras.</span>
          </div>
          <section className="weeks-grid">
            {weeks.length === 0 ? (
              <p style={{ color: 'var(--muted)' }}>Nenhuma semana disponível ainda.</p>
            ) : (
              weeks.map((week, index) => (
                <article key={week.id} className="week-card" onClick={() => setSelectedWeek(week)}>
                  <div className="card-head">
                    <p className="card-number">Semana {index + 1}</p>
                    <h2 className="card-title">{week.title}</h2>
                  </div>
                  <div className="card-body">
                    <p className="card-focus">{week.description}</p>
                    <div className="card-cta">
                      <span>Ver material</span>
                      <span className="card-cta-arrow">→</span>
                    </div>
                  </div>
                </article>
              ))
            )}
          </section>
        </section>
      </main>

      {showUpgradeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(20, 10, 20, 0.85)', backdropFilter: 'blur(12px)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <div style={{ background: 'var(--paper)', width: '100%', maxWidth: 450, borderRadius: 28, overflow: 'hidden', position: 'relative', border: '1px solid var(--plum)', textAlign: 'center', padding: 40 }}>
            <button onClick={() => setShowUpgradeModal(false)} style={{ position: 'absolute', top: 20, right: 20, background: 'var(--cream)', border: '1px solid var(--line)', color: 'var(--text)', width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', display: 'grid', placeItems: 'center', fontWeight: 'bold' }}>✕</button>
            <span style={{ fontSize: '3.5rem', display: 'block', margin: '0 auto 15px' }}>🔒</span>
            <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2.2rem', color: 'var(--plum)', marginBottom: 15, lineHeight: 1.1 }}>Ops...</h2>
            <p style={{ color: 'var(--text)', fontSize: '1rem', lineHeight: 1.6, marginBottom: 30 }}>
              Este recurso incrível só faz parte do plano <strong>Fluency</strong> ou superior. Quer ter acesso? Fale com a teacher para fazer o upgrade e destravar todo o seu potencial agora mesmo!
            </p>
            <button onClick={() => setShowUpgradeModal(false)} style={{ padding: '14px 28px', background: 'var(--plum)', color: '#fff', border: 'none', borderRadius: 999, fontWeight: 800, fontSize: '1rem', width: '100%', cursor: 'pointer' }}>Entendi</button>
          </div>
        </div>
      )}

      {showDailyModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(20, 10, 20, 0.6)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 20, animation: 'fadeIn 0.3s ease-out' }}>
          <div style={{ background: 'var(--paper)', width: '100%', maxWidth: 800, borderRadius: 32, overflow: 'hidden', position: 'relative', border: '1px solid var(--line)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '30px 30px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)' }}>
              <div>
                <span style={{ fontSize: '0.7rem', background: 'rgba(200, 136, 58, 0.15)', padding: '2px 8px', borderRadius: 99, color: 'var(--amber)', fontWeight: 'bold', textTransform: 'uppercase' }}>YV DAILY EXERCISE</span>
                <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.8rem', color: 'var(--plum)', margin: '10px 0 0' }}>Daily Content</h2>
              </div>
              <button onClick={() => setShowDailyModal(false)} style={{ background: 'var(--cream)', border: '1px solid var(--line)', color: 'var(--text)', width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', display: 'grid', placeItems: 'center', fontWeight: 'bold' }}>✕</button>
            </div>

            <div style={{ padding: '30px', overflowY: 'auto', flex: 1, background: 'var(--paper)' }}>
              {!dailyAssignment || !dailyContentDetails ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
                  <span style={{ fontSize: '3rem', display: 'block', margin: '0 auto 15px' }}>✨</span>
                  <p>Você está em dia com todos os exercícios!</p>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 30 }}>
                    <h3 style={{ fontSize: '1.6rem', color: 'var(--text)', margin: '0 0 15px' }}>{dailyContentDetails.title}</h3>
                    <div style={{ background: 'var(--cream)', padding: 25, borderRadius: 16, border: '1px solid var(--line)', fontSize: '1.05rem', lineHeight: 1.7, color: 'var(--muted)', whiteSpace: 'pre-wrap' }}>
                      {dailyContentDetails.content}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {dailyContentDetails.questions?.map((q, index) => {
                      const isDone = dailyAssignment.status === 'completed';
                      const currentAnswers = dailyAssignment.studentAnswers || {};
                      const isSelectedOpt = (opt) => currentAnswers[index] === opt;
                      const isCorrectOpt = (opt) => q.correctOption === opt;
                      
                      return (
                        <div key={index} style={{ background: 'var(--paper)', border: '1px solid var(--plum-mid)', padding: 25, borderRadius: 20 }}>
                          <h4 style={{ margin: '0 0 20px', fontSize: '1.1rem', color: 'var(--plum)' }}>{index + 1}. {q.questionText}</h4>
                          <div style={{ display: 'grid', gap: 12 }}>
                            {['A', 'B', 'C', 'D'].map(opt => {
                              const optionText = q.options ? q.options[opt] : '';
                              let bgColor = 'var(--cream)';
                              let borderColor = 'var(--line)';
                              let textColor = 'var(--text)';
                              let icon = null;

                              if (isDone) {
                                if (isSelectedOpt(opt) && isCorrectOpt(opt)) {
                                  bgColor = '#EAF7F1'; borderColor = '#2D7158'; textColor = '#2D7158'; icon = '✅';
                                } else if (isSelectedOpt(opt) && !isCorrectOpt(opt)) {
                                  bgColor = '#FDEBEB'; borderColor = '#9D2828'; textColor = '#9D2828'; icon = '❌';
                                } else if (isCorrectOpt(opt)) {
                                  bgColor = '#EAF7F1'; borderColor = '#2D7158'; textColor = '#2D7158'; icon = '✅';
                                }
                              } else {
                                if (isSelectedOpt(opt)) {
                                  bgColor = 'var(--plum-light)'; borderColor = 'var(--plum)'; textColor = 'var(--plum)'; icon = '🔘';
                                }
                              }

                              return (
                                <button 
                                  key={opt}
                                  disabled={isDone || dailyLoading}
                                  onClick={() => handleAnswerDaily(index, opt)}
                                  style={{ 
                                    display: 'flex', alignItems: 'center', gap: 15, padding: '16px 20px', 
                                    background: bgColor, border: `1px solid ${borderColor}`, borderRadius: 12, 
                                    cursor: isDone ? 'default' : 'pointer', textAlign: 'left',
                                    color: textColor, transition: '0.2s', width: '100%',
                                    opacity: isDone && !isSelectedOpt(opt) && !isCorrectOpt(opt) ? 0.5 : 1
                                  }}
                                >
                                  <span style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--paper)', border: `1px solid ${borderColor}`, display: 'grid', placeItems: 'center', fontWeight: 'bold', flexShrink: 0 }}>{opt}</span>
                                  <span style={{ flex: 1, fontSize: '0.95rem' }}>{optionText}</span>
                                  {icon && <span style={{ fontSize: '1.2rem' }}>{icon}</span>}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {dailyAssignment.status === 'completed' && (
                    <div style={{ marginTop: 25, textAlign: 'center', padding: 20, background: '#EAF7F1', borderRadius: 16, color: '#2D7158', border: '1px solid #2D7158' }}>
                      <span style={{ fontSize: '2rem', display: 'block', marginBottom: 10 }}>🎉</span>
                      <h3 style={{ margin: '0 0 5px' }}>Exercício Concluído!</h3>
                      <p style={{ margin: 0 }}>Você acertou {dailyAssignment.score} de {dailyAssignment.totalQuestions} questões.</p>
                    </div>
                  )}
                  
                  {dailyAssignment.status === 'pending' && Object.keys(dailyAssignment.studentAnswers || {}).length > 0 && Object.keys(dailyAssignment.studentAnswers || {}).length < (dailyContentDetails.questions?.length || 1) && (
                    <div style={{ marginTop: 25, textAlign: 'center', padding: 15, color: 'var(--muted)' }}>
                      Faltam {(dailyContentDetails.questions?.length || 1) - Object.keys(dailyAssignment.studentAnswers || {}).length} perguntas para concluir o exercício.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedWeek && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(20, 10, 20, 0.6)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 20, animation: 'fadeIn 0.3s ease-out' }}>
          <div style={{ background: 'var(--paper)', width: '100%', maxWidth: 650, borderRadius: 32, overflow: 'hidden', position: 'relative', border: '1px solid var(--line)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ background: 'radial-gradient(ellipse at 100% 0%,rgba(200,136,58,.15),transparent 50%),linear-gradient(140deg,var(--plum),var(--plum-mid))', padding: '40px 30px', position: 'relative' }}>
              <button onClick={() => setSelectedWeek(null)} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', display: 'grid', placeItems: 'center', fontWeight: 'bold' }}>✕</button>
              <h2 style={{ margin: '0 0 10px', fontSize: '2.4rem', color: '#fff', fontFamily: '"Playfair Display", serif' }}>{selectedWeek.title}</h2>
              <p style={{ color: 'rgba(255,255,255,0.85)', margin: 0, fontSize: '1rem', maxWidth: '90%', lineHeight: 1.5 }}>{selectedWeek.description}</p>
            </div>
            <div style={{ padding: '30px', overflowY: 'auto', flex: 1, background: 'var(--paper)' }}>
              <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 20, fontWeight: 800 }}>Materiais da Aula</h3>
              {(!selectedWeek.links || selectedWeek.links.length === 0) ? (
                <div style={{ padding: 30, textAlign: 'center', background: 'var(--cream)', borderRadius: 20, border: '1px dashed var(--line)' }}>
                  <p style={{ color: 'var(--muted)', margin: 0 }}>Nenhum material extra cadastrado.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 14 }}>
                  {selectedWeek.links.map((link, i) => (
                    <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', justifyContent: 'space-between', padding: '20px', background: 'var(--cream)', borderRadius: 20, textDecoration: 'none', color: 'var(--text)', border: '1px solid var(--line)', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                        <div style={{ width: 44, height: 44, background: 'var(--paper)', borderRadius: 12, display: 'grid', placeItems: 'center', fontSize: '1.2rem' }}>🔗</div>
                        <div><span style={{ fontWeight: 'bold', fontSize: '1.05rem', display: 'block' }}>{link.title}</span></div>
                      </div>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--plum)', color: '#fff', display: 'grid', placeItems: 'center' }}>→</div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
