import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../config/firebase';
import { collection, getDocs, query, where, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import LibraryAdminTab from '../components/admin/LibraryAdminTab';
import './AdminHub.css';

export default function AdminHub() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('students');
  const [students, setStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Global Data for Dashboard
  const [globalAssignments, setGlobalAssignments] = useState([]);

  // Student Profiles
  const [editingStudent, setEditingStudent] = useState(null);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [selectedStudentProfile, setSelectedStudentProfile] = useState(null);

  // Weeks State
  const [weeks, setWeeks] = useState([]);
  const [editingWeek, setEditingWeek] = useState(null);
  const [weekTitle, setWeekTitle] = useState('');
  const [weekDescription, setWeekDescription] = useState('');
  const [weekStudents, setWeekStudents] = useState([]);
  const [weekLinks, setWeekLinks] = useState([]);
  const [currentLinkTitle, setCurrentLinkTitle] = useState('');
  const [currentLinkUrl, setCurrentLinkUrl] = useState('');

  // Daily State
  const [dailySubTab, setDailySubTab] = useState('bank');
  const [bankItems, setBankItems] = useState([]);
  const [dailySearch, setDailySearch] = useState('');
  const [editingBankItem, setEditingBankItem] = useState(null);
  const [dailyTitle, setDailyTitle] = useState('');
  const [dailyTags, setDailyTags] = useState('');
  const [dailyContent, setDailyContent] = useState('');
  const [dailyQuestions, setDailyQuestions] = useState([
    { question: '', optA: '', optB: '', optC: '', optD: '', correct: 'A' }
  ]);

  // Vocabulary State
  const [vocabSubTab, setVocabSubTab] = useState('words'); // 'words', 'decks', 'assign'
  
  const [vocabWords, setVocabWords] = useState([]);
  const [vocabWordSearch, setVocabWordSearch] = useState('');
  const [editingWord, setEditingWord] = useState(null);
  const [wordTerm, setWordTerm] = useState('');
  const [wordTranslation, setWordTranslation] = useState('');
  const [wordImage, setWordImage] = useState('');
  
  const [decks, setDecks] = useState([]);
  const [deckWordSearch, setDeckWordSearch] = useState('');
  const [editingDeck, setEditingDeck] = useState(null);
  const [deckTitle, setDeckTitle] = useState('');
  const [deckDescription, setDeckDescription] = useState('');
  const [deckWordIds, setDeckWordIds] = useState([]); 
  
  const [assignWordSearch, setAssignWordSearch] = useState('');
  const [vocabAssignStudents, setVocabAssignStudents] = useState([]);
  const [vocabAssignType, setVocabAssignType] = useState('deck');
  const [vocabAssignDeckId, setVocabAssignDeckId] = useState('');
  const [vocabAssignWordIds, setVocabAssignWordIds] = useState([]);

  const [studentVocabAssignments, setStudentVocabAssignments] = useState([]);
  const [allVocabAssignments, setAllVocabAssignments] = useState([]);
  const [profileVocabAssignments, setProfileVocabAssignments] = useState([]);
  const [vocabAssignGroupBy, setVocabAssignGroupBy] = useState('student');
  // Scheduling State
  const [scheduleStudents, setScheduleStudents] = useState([]);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleContentId, setScheduleContentId] = useState('');
  const [studentAssignments, setStudentAssignments] = useState([]);

  useEffect(() => {
    fetchStudents();
    fetchGlobalAssignments();
    fetchWeeks();
    fetchDecks();
    fetchVocabWords();
  }, []);

  useEffect(() => {
    if (activeTab === 'weeks') fetchWeeks();
    if (activeTab === 'daily') fetchDailyBank();
    if (activeTab === 'vocabulary') {
      fetchVocabWords();
      fetchDecks();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'vocabulary' && vocabSubTab === 'assign') {
      if (vocabAssignStudents.length === 1) {
        fetchVocabAssignments();
      } else if (vocabAssignStudents.length === 0) {
        fetchAllVocabAssignments();
      }
    } else {
      setStudentVocabAssignments([]);
    }
  }, [activeTab, vocabSubTab, vocabAssignStudents]);

  useEffect(() => {
    if (selectedStudentProfile) {
      const fetchProfileVocab = async () => {
        try {
          const q = query(collection(db, 'vocab_assignments'), where('studentId', '==', selectedStudentProfile.id));
          const snap = await getDocs(q);
          setProfileVocabAssignments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (err) { console.error(err); }
      };
      fetchProfileVocab();
    }
  }, [selectedStudentProfile]);

  useEffect(() => {
    if (activeTab === 'daily' && dailySubTab === 'schedule' && scheduleStudents.length === 1) {
      fetchAssignments();
    } else {
      setStudentAssignments([]);
    }
  }, [activeTab, dailySubTab, scheduleStudents]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'student'));
      const snap = await getDocs(q);
      const studentList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(studentList);
    } catch (err) { console.error(err); } 
    setLoading(false);
  };

  const confirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'users', studentToDelete.id));
      setStudentToDelete(null);
      setEditingStudent(null);
      fetchStudents();
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const fetchGlobalAssignments = async () => {
    try {
      const snap = await getDocs(collection(db, 'daily_assignments'));
      setGlobalAssignments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) { console.error(err); }
  };

  const fetchWeeks = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'weeks'));
      setWeeks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const fetchDailyBank = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'daily_bank'));
      setBankItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const fetchAssignments = async () => {
    if (scheduleStudents.length !== 1) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'daily_assignments'), where('studentId', '==', scheduleStudents[0]));
      const snap = await getDocs(q);
      setStudentAssignments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const fetchVocabWords = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'vocabulary_global'));
      setVocabWords(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const fetchDecks = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'decks'));
      setDecks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const fetchVocabAssignments = async () => {
    if (vocabAssignStudents.length !== 1) return;
    try {
      const q = query(collection(db, 'vocab_assignments'), where('studentId', '==', vocabAssignStudents[0]));
      const snap = await getDocs(q);
      setStudentVocabAssignments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) { console.error(err); }
  };

  const fetchAllVocabAssignments = async () => {
    try {
      const snap = await getDocs(collection(db, 'vocab_assignments'));
      setAllVocabAssignments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) { console.error(err); }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Nunca logou';
    return new Date(isoString).toLocaleString('pt-BR');
  };

  // Weeks Functions
  const handleAddLink = () => {
    if (!currentLinkTitle || !currentLinkUrl) return;
    setWeekLinks([...weekLinks, { title: currentLinkTitle, url: currentLinkUrl }]);
    setCurrentLinkTitle('');
    setCurrentLinkUrl('');
  };
  const handleRemoveLink = (index) => setWeekLinks(weekLinks.filter((_, i) => i !== index));

  const startEditWeek = (week) => {
    setEditingWeek(week);
    setWeekTitle(week.title);
    setWeekDescription(week.description);
    setWeekStudents([week.studentId]);
    setWeekLinks(week.links || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditWeek = () => {
    setEditingWeek(null);
    setWeekTitle(''); setWeekDescription(''); setWeekStudents([]); setWeekLinks([]);
  };

  const handleSaveWeek = async () => {
    if (!weekTitle || weekStudents.length === 0) return alert("Preencha título e selecione aluno(s)!");
    setLoading(true);
    try {
      if (editingWeek) {
        if (weekStudents.length !== 1) {
          setLoading(false);
          return alert("Na edição, deixe apenas o aluno original selecionado.");
        }
        const payload = {
          title: weekTitle,
          description: weekDescription,
          studentId: weekStudents[0],
          links: weekLinks,
          updatedAt: new Date().toISOString()
        };
        await updateDoc(doc(db, 'weeks', editingWeek.id), payload);
      } else {
        for (const studentId of weekStudents) {
          const payload = {
            title: weekTitle,
            description: weekDescription,
            studentId,
            links: weekLinks,
            updatedAt: new Date().toISOString()
          };
          await addDoc(collection(db, 'weeks'), { ...payload, createdAt: new Date().toISOString() });
        }
      }
      cancelEditWeek();
      fetchWeeks();
    } catch (err) { alert("Erro ao salvar semana."); console.error(err); }
    setLoading(false);
  };

  const handleDeleteWeek = async (id) => {
    if (!window.confirm("Excluir esta semana?")) return;
    await deleteDoc(doc(db, 'weeks', id));
    fetchWeeks();
  };

  // Daily Bank Functions
  const startEditBankItem = (item) => {
    setEditingBankItem(item);
    setDailyTitle(item.title || '');
    setDailyTags(item.tags || '');
    setDailyContent(item.content || '');
    
    // Migration logic for old items
    if (item.questions && item.questions.length > 0) {
      setDailyQuestions(item.questions.map(q => ({
        question: q.questionText || q.question,
        optA: q.options?.A || '',
        optB: q.options?.B || '',
        optC: q.options?.C || '',
        optD: q.options?.D || '',
        correct: q.correctOption || 'A'
      })));
    } else if (item.question) {
      setDailyQuestions([{
        question: item.question,
        optA: item.options?.A || '',
        optB: item.options?.B || '',
        optC: item.options?.C || '',
        optD: item.options?.D || '',
        correct: item.correctOption || 'A'
      }]);
    } else {
      setDailyQuestions([{ question: '', optA: '', optB: '', optC: '', optD: '', correct: 'A' }]);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditBankItem = () => {
    setEditingBankItem(null);
    setDailyTitle(''); setDailyTags(''); setDailyContent('');
    setDailyQuestions([{ question: '', optA: '', optB: '', optC: '', optD: '', correct: 'A' }]);
  };

  const handleAddQuestion = () => {
    setDailyQuestions([...dailyQuestions, { question: '', optA: '', optB: '', optC: '', optD: '', correct: 'A' }]);
  };

  const handleUpdateQuestion = (index, field, value) => {
    const newQs = [...dailyQuestions];
    newQs[index][field] = value;
    setDailyQuestions(newQs);
  };
  const handleRemoveQuestion = (index) => setDailyQuestions(dailyQuestions.filter((_, i) => i !== index));

  const handleSaveDailyBank = async () => {
    if (!dailyTitle || !dailyContent || dailyQuestions.length === 0) {
      return alert("Preencha título, texto e ao menos uma pergunta!");
    }
    setLoading(true);
    try {
      const payload = {
        title: dailyTitle,
        tags: dailyTags,
        content: dailyContent,
        questions: dailyQuestions.map(q => ({
          questionText: q.question,
          options: { A: q.optA, B: q.optB, C: q.optC, D: q.optD },
          correctOption: q.correct
        })),
        updatedAt: new Date().toISOString()
      };

      if (editingBankItem) {
        await updateDoc(doc(db, 'daily_bank', editingBankItem.id), payload);
      } else {
        await addDoc(collection(db, 'daily_bank'), { ...payload, createdAt: new Date().toISOString() });
      }
      cancelEditBankItem();
      fetchDailyBank();
    } catch (err) { alert("Erro ao salvar no banco."); console.error(err); }
    setLoading(false);
  };

  const handleDeleteBankItem = async (id) => {
    if (!window.confirm("Excluir exercício do banco?")) return;
    await deleteDoc(doc(db, 'daily_bank', id));
    fetchDailyBank();
  };

  // Schedule Functions
  const handleScheduleAssignment = async () => {
    if (scheduleStudents.length === 0 || !scheduleDate || !scheduleContentId) return alert("Preencha tudo!");
    setLoading(true);
    try {
      let createdCount = 0;
      for (const studentId of scheduleStudents) {
        // Usa a lista global para validar se o aluno já tem daily nessa data
        const existing = globalAssignments.find(a => a.studentId === studentId && a.scheduledDate === scheduleDate);
        if (existing) continue;

        const payload = {
          studentId,
          contentId: scheduleContentId,
          scheduledDate: scheduleDate,
          status: 'pending',
          createdAt: new Date().toISOString()
        };
        await addDoc(collection(db, 'daily_assignments'), payload);
        createdCount++;
      }
      
      if (createdCount < scheduleStudents.length) {
        alert(`Foram criados ${createdCount} agendamentos. Alguns alunos selecionados já possuíam Daily na data escolhida e foram ignorados.`);
      }

      setScheduleDate(''); setScheduleContentId('');
      if (scheduleStudents.length === 1) fetchAssignments();
      fetchGlobalAssignments();
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleDeleteAssignment = async (id) => {
    if (!window.confirm("Excluir agendamento?")) return;
    await deleteDoc(doc(db, 'daily_assignments', id));
    fetchAssignments();
    fetchGlobalAssignments();
  };

  // Vocabulary CRUD Functions
  const handleSaveWord = async () => {
    if (!wordTerm || !wordTranslation) return alert('Preencha termo e tradução!');
    setLoading(true);
    try {
      const payload = { term: wordTerm, translation: wordTranslation, imageUrl: wordImage, updatedAt: new Date().toISOString() };
      if (editingWord) await updateDoc(doc(db, 'vocabulary_global', editingWord.id), payload);
      else await addDoc(collection(db, 'vocabulary_global'), { ...payload, createdAt: new Date().toISOString() });
      setEditingWord(null); setWordTerm(''); setWordTranslation(''); setWordImage('');
      fetchVocabWords();
    } catch (e) { console.error(e); alert('Erro ao salvar.'); }
    setLoading(false);
  };

  const handleDeleteWord = async (id) => {
    if (!window.confirm('Excluir palavra?')) return;
    await deleteDoc(doc(db, 'vocabulary_global', id));
    fetchVocabWords();
  };

  const handleSaveDeck = async () => {
    if (!deckTitle || deckWordIds.length === 0) return alert('Preencha o título e adicione pelo menos 1 palavra!');
    setLoading(true);
    try {
      const payload = { title: deckTitle, description: deckDescription, wordIds: deckWordIds, updatedAt: new Date().toISOString() };
      if (editingDeck) await updateDoc(doc(db, 'decks', editingDeck.id), payload);
      else await addDoc(collection(db, 'decks'), { ...payload, createdAt: new Date().toISOString() });
      setEditingDeck(null); setDeckTitle(''); setDeckDescription(''); setDeckWordIds([]);
      fetchDecks();
    } catch (e) { console.error(e); alert('Erro ao salvar deck.'); }
    setLoading(false);
  };

  const handleDeleteDeck = async (id) => {
    if (!window.confirm('Excluir deck?')) return;
    await deleteDoc(doc(db, 'decks', id));
    fetchDecks();
  };

  const handleSaveVocabAssign = async () => {
    if (vocabAssignStudents.length === 0) return alert('Selecione pelo menos um aluno!');
    if (vocabAssignType === 'deck' && !vocabAssignDeckId) return alert('Selecione um deck!');
    if (vocabAssignType === 'words' && vocabAssignWordIds.length === 0) return alert('Selecione pelo menos 1 palavra!');
    
    setLoading(true);
    try {
      for (const studentId of vocabAssignStudents) {
        const payload = {
          studentId: studentId,
          type: vocabAssignType,
          deckId: vocabAssignType === 'deck' ? vocabAssignDeckId : null,
          wordIds: vocabAssignType === 'words' ? vocabAssignWordIds : null,
          createdAt: new Date().toISOString()
        };
        await addDoc(collection(db, 'vocab_assignments'), payload);
      }
      setVocabAssignDeckId(''); setVocabAssignWordIds([]);
      if (vocabAssignStudents.length === 1) fetchVocabAssignments();
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleDeleteVocabAssign = async (id) => {
    if (!window.confirm('Tem certeza?')) return;
    try {
      await deleteDoc(doc(db, 'vocab_assignments', id));
      fetchVocabAssignments();
    } catch (err) { console.error(err); }
  };

  const handleDeleteProfileVocab = async (id) => {
    if (!window.confirm('Tem certeza que deseja remover este acesso do aluno?')) return;
    try {
      await deleteDoc(doc(db, 'vocab_assignments', id));
      setProfileVocabAssignments(prev => prev.filter(a => a.id !== id));
    } catch (err) { console.error(err); }
  };

  const handleDeleteGlobalVocab = async (id) => {
    if (!window.confirm('Tem certeza que deseja remover este acesso do aluno?')) return;
    try {
      await deleteDoc(doc(db, 'vocab_assignments', id));
      setAllVocabAssignments(prev => prev.filter(a => a.id !== id));
    } catch (err) { console.error(err); }
  };

  const handleRemoveSingleWord = async (assignId, wordIdToRemove, currentWordIds, isGlobal = false) => {
    if (!window.confirm('Remover esta palavra?')) return;
    try {
      const newWordIds = currentWordIds.filter(id => id !== wordIdToRemove);
      if (newWordIds.length === 0) {
        await deleteDoc(doc(db, 'vocab_assignments', assignId));
        if (isGlobal) setAllVocabAssignments(prev => prev.filter(a => a.id !== assignId));
        else setProfileVocabAssignments(prev => prev.filter(a => a.id !== assignId));
      } else {
        await updateDoc(doc(db, 'vocab_assignments', assignId), { wordIds: newWordIds });
        const updateState = prev => prev.map(a => a.id === assignId ? { ...a, wordIds: newWordIds } : a);
        if (isGlobal) setAllVocabAssignments(updateState);
        else setProfileVocabAssignments(updateState);
      }
    } catch (err) { console.error(err); }
  };

  const getStudentName = (id) => students.find(s => s.id === id)?.name || 'Desconhecido';
  const getBankItemTitle = (id) => bankItems.find(i => i.id === id)?.title || 'Excluído';

  // Dashboard Alerts
  const alerts = students.filter(s => s.active && s.plan !== 'Foundation').map(s => {
    const pendingCount = globalAssignments.filter(a => a.studentId === s.id && a.status === 'pending').length;
    return { student: s, count: pendingCount };
  }).filter(res => res.count < 3);

  // Student Profile View
  if (selectedStudentProfile) {
    const s = selectedStudentProfile;
    const sWeeks = weeks.filter(w => w.studentId === s.id);
    const sAssigns = globalAssignments.filter(a => a.studentId === s.id).sort((a,b) => new Date(b.scheduledDate) - new Date(a.scheduledDate));
    const pendingCount = sAssigns.filter(a => a.status === 'pending').length;
    
    return (
      <div className="site-shell unlocked" style={{ background: 'var(--paper)', minHeight: '100vh', color: 'var(--text)' }}>
        <header className="hero" style={{ paddingBottom: 20 }}>
          <div className="hero-inner" style={{ paddingBottom: 20 }}>
            <nav className="hero-nav">
              <button onClick={() => setSelectedStudentProfile(null)} style={{ background: 'var(--cream)', border: '1px solid var(--line)', color: 'var(--text)', padding: '8px 16px', borderRadius: 99, cursor: 'pointer', fontWeight: 'bold' }}>
                ← Voltar ao Painel
              </button>
            </nav>
            <div style={{ marginTop: 20 }}>
              <span style={{ fontSize: '0.8rem', background: 'var(--plum)', color: '#fff', padding: '4px 12px', borderRadius: 99, fontWeight: 'bold' }}>{s.plan}</span>
              <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2.5rem', margin: '10px 0' }}>{s.name}</h1>
              <p style={{ margin: 0, color: 'var(--muted)' }}>{s.email} | Último login: {formatDate(s.lastLogin)}</p>
            </div>
          </div>
        </header>

        <main className="admin-grid-2" style={{ maxWidth: 1040, margin: '0 auto', padding: '34px 20px' }}>
          <div>
            <h2 style={{ borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>Semanas de Aula ({sWeeks.length})</h2>
            <div style={{ display: 'grid', gap: 10, marginTop: 15 }}>
              {sWeeks.map(w => (
                <div key={w.id} style={{ background: 'var(--cream)', padding: 15, borderRadius: 12, border: '1px solid var(--line)' }}>
                  <h4 style={{ margin: '0 0 5px' }}>{w.title}</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: 0 }}>{w.links?.length || 0} link(s) anexado(s)</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 style={{ borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>Daily Content</h2>
            {pendingCount < 3 && s.plan !== 'Foundation' && (
              <div style={{ background: '#FFF8EC', border: '1px solid var(--amber)', padding: 15, borderRadius: 12, color: 'var(--amber)', fontWeight: 'bold', marginBottom: 15 }}>
                ⚠️ Atenção: Aluno tem apenas {pendingCount} exercícios planejados. O Auto-Pilot buscará novos automaticamente se acabarem.
              </div>
            )}
            <div style={{ display: 'grid', gap: 10, marginTop: 15, maxHeight: 600, overflowY: 'auto' }}>
              {sAssigns.map(a => (
                <div key={a.id} style={{ background: a.status === 'completed' ? '#EAF7F1' : 'var(--paper)', color: a.status === 'completed' ? '#1E293B' : 'var(--text)', padding: 15, borderRadius: 12, border: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <strong>{new Date(a.scheduledDate + 'T00:00:00').toLocaleDateString('pt-BR')}</strong>
                    <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: a.status === 'completed' ? '#2D7158' : 'var(--amber)' }}>
                      {a.status.toUpperCase()}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>{getBankItemTitle(a.contentId)}</p>
                </div>
              ))}
            </div>

            <h2 style={{ borderBottom: '1px solid var(--line)', paddingBottom: 10, marginTop: 30 }}>Flashcards & Vocabulário ({profileVocabAssignments.length})</h2>
            <div style={{ display: 'grid', gap: 10, marginTop: 15, maxHeight: 600, overflowY: 'auto' }}>
              {profileVocabAssignments.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Nenhum material atribuído.</p>
              ) : (
                profileVocabAssignments.map(assign => (
                  <div key={assign.id} style={{ background: 'var(--paper)', padding: 15, borderRadius: 12, border: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 99, background: 'rgba(138, 124, 255, 0.15)', color: 'var(--purple)', fontWeight: 'bold' }}>
                        {assign.type === 'deck' ? 'DECK' : 'PALAVRAS SOLTAS'}
                      </span>
                      <p style={{ margin: '8px 0 0', fontWeight: 'bold', fontSize: '0.95rem' }}>
                        {assign.type === 'deck' 
                          ? (decks.find(d => d.id === assign.deckId)?.title || 'Deck Excluído')
                          : (
                              <details style={{ cursor: 'pointer' }}>
                                <summary style={{ outline: 'none' }}>{assign.wordIds?.length || 0} palavras atribuídas</summary>
                                <div style={{ marginTop: 10, padding: 10, background: 'var(--bg)', borderRadius: 8, fontSize: '0.85rem', fontWeight: 'normal', maxHeight: 150, overflowY: 'auto' }}>
                                  {assign.wordIds?.map(wid => {
                                    const word = vocabWords.find(w => w.id === wid);
                                    return word ? (
                                      <div key={wid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                        <span>• <strong>{word.term}</strong>: {word.translation}</span>
                                        <button onClick={(e) => { e.preventDefault(); handleRemoveSingleWord(assign.id, wid, assign.wordIds, false); }} style={{ background: 'none', border: 'none', color: '#ffb1b1', cursor: 'pointer', fontSize: '0.75rem', padding: '2px 6px' }} title="Remover palavra">✕</button>
                                      </div>
                                    ) : null;
                                  })}
                                </div>
                              </details>
                            )}
                      </p>
                    </div>
                    <button onClick={() => handleDeleteProfileVocab(assign.id)} style={{ background: 'rgba(255,140,140,0.1)', color: '#ffb1b1', border: '1px solid rgba(255,140,140,0.3)', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}>Remover</button>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="site-shell unlocked" style={{ background: 'var(--paper)', minHeight: '100vh', color: 'var(--text)' }}>
      <header className="hero" style={{ paddingBottom: 20 }}>
        <div className="hero-inner" style={{ paddingBottom: 20 }}>
          <nav className="hero-nav">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img src="/logo.png" alt="YV English" className="logo" style={{ width: 60 }} />
              <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.5rem', margin: 0 }}>Admin Panel</h1>
            </div>
            <div className="nav-actions">
              <button className="logout-btn" onClick={handleLogout}>Sair do Admin</button>
            </div>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 1040, margin: '0 auto', padding: '34px 20px' }}>
        
        {studentToDelete && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
            <div style={{ background: 'var(--paper)', padding: 30, borderRadius: 16, maxWidth: 400, width: '100%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
              <h2 style={{ margin: '0 0 15px', color: 'red' }}>Excluir Aluno?</h2>
              <p style={{ margin: '0 0 20px', lineHeight: 1.5 }}>
                Tem certeza que deseja excluir o aluno <strong>{studentToDelete.name}</strong>?
                <br /><br />
                <span style={{ fontSize: '0.85rem', color: 'var(--amber)' }}>
                  Atenção: Excluir um aluno aqui apagará seu perfil e histórico de estudos, mas <strong>não exclui</strong> sua conta do Firebase Auth (o login). Isso deve ser feito manualmente no painel do Firebase se desejar revogar o acesso completamente.
                </span>
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setStudentToDelete(null)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--line)', color: 'var(--text)', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}>Cancelar</button>
                <button disabled={loading} onClick={confirmDeleteStudent} style={{ padding: '10px 20px', background: 'red', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}>Sim, Excluir</button>
              </div>
            </div>
          </div>
        )}

        {alerts.length > 0 && (
          <div style={{ background: '#FFF8EC', border: '1px solid var(--amber)', padding: 15, borderRadius: 16, marginBottom: 25, display: 'flex', alignItems: 'center', gap: 15 }}>
            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
            <div>
              <strong style={{ display: 'block', color: 'var(--amber)' }}>Alerta de Estoque do Daily Content</strong>
              <span style={{ fontSize: '0.9rem', color: 'var(--text)' }}>
                Os seguintes alunos têm menos de 3 dias planejados: {alerts.map(a => `${a.student.name} (${a.count})`).join(', ')}. O Auto-Pilot tentará cobrir falhas automaticamente.
              </span>
            </div>
          </div>
        )}

        <div className="admin-main-tabs">
          {['students', 'weeks', 'daily', 'vocabulary', 'library'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '10px 20px', whiteSpace: 'nowrap', borderRadius: 999, border: activeTab === tab ? 'none' : '1px solid var(--line)', background: activeTab === tab ? 'var(--plum)' : 'transparent', color: activeTab === tab ? '#fff' : 'var(--text)', cursor: 'pointer', fontWeight: 800, textTransform: 'capitalize' }}>
              {tab === 'daily' ? 'Daily Content' : tab === 'students' ? 'Alunos' : tab === 'weeks' ? 'Semanas' : tab === 'library' ? 'Biblioteca' : 'Vocabulário Global'}
            </button>
          ))}
        </div>

        {activeTab === 'students' && (
          <section>
            <h2>Gestão de Alunos</h2>
            
            <div style={{ marginBottom: 20 }}>
              <input type="text" placeholder="Buscar aluno (nome ou email)..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)', marginBottom: 15 }} />
              <button onClick={() => window.open('https://console.firebase.google.com/u/0/project/yv-hub-2253d/authentication/users?hl=pt-br', '_blank')} style={{ padding: '12px 24px', background: 'var(--amber)', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 800, cursor: 'pointer' }}>
                + Adicionar Aluno no Banco
              </button>
            </div>

            {editingStudent && (
              <div style={{ padding: 20, marginBottom: 20, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 16 }}>
                <h3>Editar Aluno</h3>
                <div style={{ display: 'grid', gap: 15, marginTop: 15 }}>
                  <input type="text" value={editingStudent.name} onChange={e => setEditingStudent({...editingStudent, name: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }} />
                  <select value={editingStudent.plan} onChange={e => setEditingStudent({...editingStudent, plan: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }}>
                    <option value="Foundation">Foundation</option><option value="Fluency">Fluency</option><option value="Performance">Performance</option>
                  </select>
                  <select value={editingStudent.active ? 'true' : 'false'} onChange={e => setEditingStudent({...editingStudent, active: e.target.value === 'true'})} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }}>
                    <option value="true">Ativo</option><option value="false">Inativo</option>
                  </select>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Dia de Vencimento da Mensalidade</label>
                    <input type="number" min="1" max="31" placeholder="Ex: 5" value={editingStudent.dueDate || ''} onChange={e => setEditingStudent({...editingStudent, dueDate: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={async () => { await updateDoc(doc(db, 'users', editingStudent.id), { name: editingStudent.name, plan: editingStudent.plan, active: editingStudent.active, dueDate: editingStudent.dueDate || null }); setEditingStudent(null); fetchStudents(); }} style={{ padding: '10px 20px', background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}>Salvar</button>
                      <button onClick={() => setEditingStudent(null)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--line)', color: 'var(--text)', borderRadius: 8, cursor: 'pointer' }}>Cancelar</button>
                    </div>
                    <button onClick={() => setStudentToDelete(editingStudent)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid red', color: 'red', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}>Excluir Aluno</button>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gap: 14 }}>
              {students.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.email.toLowerCase().includes(studentSearch.toLowerCase())).map(student => (
                <div key={student.id} className="admin-flex-between" style={{ padding: 20, background: 'var(--cream)', border: '1px solid var(--line)', borderRadius: 16 }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px' }}>{student.name} {!student.active && <span style={{ background: '#ff4d4d', color: '#fff', fontSize: '0.65rem', padding: '2px 6px', borderRadius: 4, fontWeight: 'bold' }}>INATIVO</span>}</h3>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted)' }}>{student.email}</p>
                  </div>
                  <div className="admin-student-actions-wrapper">
                    <span style={{ background: 'rgba(138, 124, 255, 0.15)', color: 'var(--purple)', padding: '4px 12px', borderRadius: 99, fontSize: '0.8rem', fontWeight: 800 }}>{student.plan}</span>
                    <div className="admin-student-actions">
                      <button onClick={() => setEditingStudent(student)} style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--line)', color: 'var(--text)', borderRadius: 6, cursor: 'pointer' }}>Editar Acesso</button>
                      <button onClick={() => setSelectedStudentProfile(student)} style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'var(--plum)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold' }}>Ver Perfil Completo</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'weeks' && (
          <section>
            <h2>Semanas de Aula</h2>
            <div style={{ padding: 20, border: editingWeek ? '2px solid var(--plum)' : '1px solid var(--line)', borderRadius: 20, background: 'var(--cream)', marginBottom: 30 }}>
              <h3>{editingWeek ? '✏️ Editando Semana' : '+ Nova Semana'}</h3>
              <div style={{ display: 'grid', gap: 15, marginTop: 15 }}>
                <input type="text" value={weekTitle} onChange={e => setWeekTitle(e.target.value)} placeholder="Título" style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--line)' }} />
                <textarea value={weekDescription} onChange={e => setWeekDescription(e.target.value)} rows="3" placeholder="Descrição" style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--line)' }}></textarea>
                <div style={{ padding: 15, border: '1px solid var(--line)', borderRadius: 12, background: 'var(--bg)' }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: '0.9rem' }}>Selecionar Alunos ({weekStudents.length})</h4>
                  {weekStudents.length > 0 && !editingWeek && (
                    <button onClick={() => setWeekStudents([])} style={{ background: 'none', border: 'none', color: 'var(--plum)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: 10 }}>Limpar Seleção</button>
                  )}
                  <div style={{ maxHeight: 200, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                    {students.filter(s => s.active).map(s => (
                      <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', cursor: 'pointer', background: 'var(--paper)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)', opacity: (editingWeek && !weekStudents.includes(s.id)) ? 0.5 : 1 }}>
                        <input 
                          type="checkbox" 
                          checked={weekStudents.includes(s.id)}
                          disabled={editingWeek && !weekStudents.includes(s.id)}
                          onChange={e => {
                            if (e.target.checked) setWeekStudents([...weekStudents, s.id]);
                            else setWeekStudents(weekStudents.filter(id => id !== s.id));
                          }}
                        />
                        {s.name}
                      </label>
                    ))}
                  </div>
                </div>
                <div style={{ padding: 15, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12 }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: '0.9rem' }}>Links Extras</h4>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                    <input type="text" value={currentLinkTitle} onChange={e => setCurrentLinkTitle(e.target.value)} placeholder="Título" style={{ flex: 1, padding: '8px', borderRadius: 6, border: '1px solid var(--line)' }} />
                    <input type="text" value={currentLinkUrl} onChange={e => setCurrentLinkUrl(e.target.value)} placeholder="URL" style={{ flex: 2, padding: '8px', borderRadius: 6, border: '1px solid var(--line)' }} />
                    <button onClick={handleAddLink} style={{ padding: '8px 16px', background: 'var(--amber)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold' }}>+ Add</button>
                  </div>
                  <ul>{weekLinks.map((l, i) => <li key={i}>{l.title} <button onClick={() => handleRemoveLink(i)}>X</button></li>)}</ul>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button disabled={loading} onClick={handleSaveWeek} style={{ padding: '12px 24px', background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 800, cursor: 'pointer' }}>Salvar</button>
                  {editingWeek && <button onClick={cancelEditWeek} style={{ padding: '12px 24px', background: 'transparent', border: '1px solid var(--line)', borderRadius: 12, cursor: 'pointer' }}>Cancelar</button>}
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              {weeks.map(week => (
                <div key={week.id} className="admin-flex-between" style={{ padding: 20, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 16 }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', background: 'var(--cream)', padding: '2px 8px', borderRadius: 99, color: 'var(--muted)', fontWeight: 'bold' }}>{getStudentName(week.studentId)}</span>
                    <h3 style={{ margin: '8px 0' }}>{week.title}</h3>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => startEditWeek(week)} style={{ border: '1px solid var(--line)', background: 'var(--cream)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>Editar</button>
                    <button onClick={() => handleDeleteWeek(week.id)} style={{ border: '1px solid red', color: 'red', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>Excluir</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'daily' && (
          <section>
            <div className="admin-flex-between" style={{ marginBottom: 20 }}>
              <h2>Daily Content</h2>
              <div style={{ display: 'flex', background: 'var(--cream)', border: '1px solid var(--line)', borderRadius: 999, overflow: 'hidden' }}>
                <button onClick={() => setDailySubTab('bank')} style={{ padding: '8px 16px', background: dailySubTab === 'bank' ? 'var(--plum)' : 'transparent', color: dailySubTab === 'bank' ? '#fff' : 'var(--text)', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Banco Global</button>
                <button onClick={() => setDailySubTab('schedule')} style={{ padding: '8px 16px', background: dailySubTab === 'schedule' ? 'var(--plum)' : 'transparent', color: dailySubTab === 'schedule' ? '#fff' : 'var(--text)', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Agendar</button>
              </div>
            </div>

            {dailySubTab === 'bank' && (
              <div>
                <div style={{ padding: 20, border: editingBankItem ? '2px solid var(--plum)' : '1px solid var(--line)', borderRadius: 20, background: 'var(--cream)', marginBottom: 30 }}>
                  <h3>{editingBankItem ? '✏️ Editando Exercício' : '+ Criar Exercício no Banco'}</h3>
                  <div style={{ display: 'grid', gap: 15, marginTop: 15 }}>
                    <div style={{ display: 'flex', gap: 15 }}>
                      <input type="text" value={dailyTitle} onChange={e => setDailyTitle(e.target.value)} placeholder="Título" style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--line)' }} />
                      <input type="text" value={dailyTags} onChange={e => setDailyTags(e.target.value)} placeholder="Tags (ex: to be, past)" style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--line)' }} />
                    </div>
                    <textarea value={dailyContent} onChange={e => setDailyContent(e.target.value)} rows="4" placeholder="Texto base da lição..." style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--line)' }}></textarea>

                    <div style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 15, background: 'var(--paper)' }}>
                      <h4 style={{ margin: '0 0 15px', color: 'var(--plum)' }}>Perguntas Múltipla Escolha ({dailyQuestions.length})</h4>
                      {dailyQuestions.map((q, i) => (
                        <div key={i} style={{ background: 'var(--cream)', padding: 15, borderRadius: 12, marginBottom: 15, border: '1px dashed var(--line)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <strong>Pergunta {i + 1}</strong>
                            {dailyQuestions.length > 1 && <button onClick={() => handleRemoveQuestion(i)} style={{ color: 'red', background: 'transparent', border: 'none', cursor: 'pointer' }}>Remover</button>}
                          </div>
                          <input type="text" value={q.question} onChange={e => handleUpdateQuestion(i, 'question', e.target.value)} placeholder="Qual é a pergunta?" style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--line)', margin: '10px 0' }} />
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            {['A','B','C','D'].map(opt => (
                              <div key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span>{opt}</span>
                                <input type="text" value={q[`opt${opt}`]} onChange={e => handleUpdateQuestion(i, `opt${opt}`, e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: 6, border: '1px solid var(--line)' }} />
                              </div>
                            ))}
                          </div>
                          <div style={{ marginTop: 10 }}>
                            <label style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--amber)' }}>Correta:</label>
                            <select value={q.correct} onChange={e => handleUpdateQuestion(i, 'correct', e.target.value)} style={{ marginLeft: 10, padding: 5 }}>
                              <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
                            </select>
                          </div>
                        </div>
                      ))}
                      <button onClick={handleAddQuestion} style={{ padding: '8px 16px', background: 'var(--paper)', border: '1px solid var(--plum)', color: 'var(--plum)', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>+ Adicionar Outra Pergunta</button>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button disabled={loading} onClick={handleSaveDailyBank} style={{ padding: '12px 24px', background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 800, cursor: 'pointer' }}>Salvar</button>
                      {editingBankItem && <button onClick={cancelEditBankItem} style={{ padding: '12px 24px', background: 'transparent', border: '1px solid var(--line)', borderRadius: 12, cursor: 'pointer' }}>Cancelar</button>}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 14 }}>
                  <input type="text" placeholder="Buscar no banco (título ou tag)..." value={dailySearch} onChange={e => setDailySearch(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)', marginBottom: 5 }} />
                  {bankItems.filter(item => (item.title || '').toLowerCase().includes(dailySearch.toLowerCase()) || (item.tags || '').toLowerCase().includes(dailySearch.toLowerCase())).map(item => (
                    <div key={item.id} style={{ padding: 20, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <span style={{ fontSize: '0.7rem', background: 'rgba(200, 136, 58, 0.15)', padding: '2px 8px', borderRadius: 99, color: 'var(--amber)', fontWeight: 'bold' }}>{item.tags}</span>
                          <h3 style={{ margin: '8px 0' }}>{item.title}</h3>
                          <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{item.questions ? item.questions.length : 1} pergunta(s)</p>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => startEditBankItem(item)} style={{ background: 'var(--cream)', border: '1px solid var(--line)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>Editar</button>
                          <button onClick={() => handleDeleteBankItem(item.id)} style={{ background: 'transparent', border: '1px solid red', color: 'red', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>Excluir</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {dailySubTab === 'schedule' && (
              <div>
                <div style={{ padding: 20, background: 'var(--cream)', border: '1px solid var(--line)', borderRadius: 16, marginBottom: 30 }}>
                  <h4 style={{ margin: '0 0 10px' }}>Selecionar Alunos ({scheduleStudents.length})</h4>
                  {scheduleStudents.length > 0 && (
                    <button onClick={() => setScheduleStudents([])} style={{ background: 'none', border: 'none', color: 'var(--plum)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: 10 }}>Limpar Seleção</button>
                  )}
                  <div style={{ maxHeight: 300, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                    {students.filter(s => s.active).map(s => (
                      <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', cursor: 'pointer', background: 'var(--paper)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)' }}>
                        <input 
                          type="checkbox" 
                          checked={scheduleStudents.includes(s.id)}
                          onChange={e => {
                            if (e.target.checked) setScheduleStudents([...scheduleStudents, s.id]);
                            else setScheduleStudents(scheduleStudents.filter(id => id !== s.id));
                          }}
                        />
                        {s.name}
                      </label>
                    ))}
                  </div>
                </div>

                {scheduleStudents.length > 0 && (
                  <>
                    <div className="admin-flex-row" style={{ padding: 20, border: '1px dashed var(--plum)', borderRadius: 16, marginBottom: 30 }}>
                      <div style={{ flex: 1 }}><label>Data</label><input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--line)' }} /></div>
                      <div style={{ flex: 2 }}><label>Conteúdo</label><select value={scheduleContentId} onChange={e => setScheduleContentId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--line)' }}><option value="">Selecione...</option>{bankItems.map(i => <option key={i.id} value={i.id}>{i.title}</option>)}</select></div>
                      <button disabled={loading} onClick={handleScheduleAssignment} style={{ padding: '10px 20px', background: 'var(--plum)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', height: 40 }}>Agendar</button>
                    </div>

                    {scheduleStudents.length === 1 ? (
                      <div style={{ display: 'grid', gap: 10 }}>
                      {[...studentAssignments].sort((a,b) => new Date(a.scheduledDate) - new Date(b.scheduledDate)).map(assign => (
                        <div key={assign.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 15, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12 }}>
                          <div>
                            <strong>{new Date(assign.scheduledDate + 'T00:00:00').toLocaleDateString('pt-BR')}</strong>
                            <span style={{ marginLeft: 10, fontSize: '0.7rem', padding: '2px 8px', borderRadius: 99, background: assign.status === 'completed' ? '#EAF7F1' : '#FFF8EC', color: assign.status === 'completed' ? '#2D7158' : 'var(--amber)' }}>{assign.status.toUpperCase()}</span>
                            <p style={{ margin: '5px 0 0' }}>{getBankItemTitle(assign.contentId)}</p>
                          </div>
                          <button onClick={() => handleDeleteAssignment(assign.id)} style={{ border: 'none', background: 'none', color: 'red', textDecoration: 'underline', cursor: 'pointer' }}>Excluir</button>
                        </div>
                      ))}
                    </div>
                    ) : (
                      <div style={{ padding: 20, textAlign: 'center', background: 'var(--cream)', borderRadius: 12, border: '1px solid var(--line)', color: 'var(--muted)' }}>
                        Modo em lote ativado. Você está atribuindo Daily Content para {scheduleStudents.length} alunos simultaneamente. A lista de agendamentos individuais não é exibida neste modo.
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </section>
        )}

        {activeTab === 'vocabulary' && (
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2>Vocabulário Global</h2>
              <div className="admin-subtabs">
                <button onClick={() => setVocabSubTab('words')} style={{ padding: '8px 16px', background: vocabSubTab === 'words' ? 'var(--plum)' : 'transparent', color: vocabSubTab === 'words' ? '#fff' : 'var(--text)', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Palavras Avulsas</button>
                <button onClick={() => setVocabSubTab('decks')} style={{ padding: '8px 16px', background: vocabSubTab === 'decks' ? 'var(--plum)' : 'transparent', color: vocabSubTab === 'decks' ? '#fff' : 'var(--text)', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Decks Temáticos</button>
                <button onClick={() => setVocabSubTab('assign')} style={{ padding: '8px 16px', background: vocabSubTab === 'assign' ? 'var(--plum)' : 'transparent', color: vocabSubTab === 'assign' ? '#fff' : 'var(--text)', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Atribuir ao Aluno</button>
              </div>
            </div>

            {vocabSubTab === 'words' && (
              <div>
                <div style={{ padding: 20, border: editingWord ? '2px solid var(--plum)' : '1px solid var(--line)', borderRadius: 20, background: 'var(--cream)', marginBottom: 30 }}>
                  <h3>{editingWord ? '✏️ Editando Palavra' : '+ Nova Palavra no Banco'}</h3>
                  <div style={{ display: 'grid', gap: 15, marginTop: 15 }}>
                    <div className="admin-flex-row">
                      <input type="text" value={wordTerm} onChange={e => setWordTerm(e.target.value)} placeholder="Termo em Inglês (ex: Apple)" style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--line)' }} />
                      <input type="text" value={wordTranslation} onChange={e => setWordTranslation(e.target.value)} placeholder="Tradução (ex: Maçã)" style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--line)' }} />
                    </div>
                    <input type="text" value={wordImage} onChange={e => setWordImage(e.target.value)} placeholder="Link da Imagem (opcional)" style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--line)' }} />
                    
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button disabled={loading} onClick={handleSaveWord} style={{ padding: '12px 24px', background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 800, cursor: 'pointer' }}>Salvar</button>
                      {editingWord && <button onClick={() => { setEditingWord(null); setWordTerm(''); setWordTranslation(''); setWordImage(''); }} style={{ padding: '12px 24px', background: 'transparent', border: '1px solid var(--line)', borderRadius: 12, cursor: 'pointer' }}>Cancelar</button>}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 14 }}>
                  <input type="text" placeholder="Buscar palavra no banco..." value={vocabWordSearch} onChange={e => setVocabWordSearch(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)', marginBottom: 5 }} />
                  {vocabWords.filter(w => w.term.toLowerCase().includes(vocabWordSearch.toLowerCase()) || w.translation.toLowerCase().includes(vocabWordSearch.toLowerCase())).map(w => (
                    <div key={w.id} className="admin-flex-between" style={{ padding: 20, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 16 }}>
                      <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
                        {w.imageUrl && <img src={w.imageUrl} alt={w.term} style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 8 }} />}
                        <div>
                          <h3 style={{ margin: '0 0 5px' }}>{w.term}</h3>
                          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted)' }}>{w.translation}</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => { setEditingWord(w); setWordTerm(w.term); setWordTranslation(w.translation); setWordImage(w.imageUrl || ''); }} style={{ background: 'var(--cream)', border: '1px solid var(--line)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>Editar</button>
                        <button onClick={() => handleDeleteWord(w.id)} style={{ background: 'transparent', border: '1px solid red', color: 'red', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>Excluir</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {vocabSubTab === 'decks' && (
              <div>
                <div style={{ padding: 20, border: editingDeck ? '2px solid var(--plum)' : '1px solid var(--line)', borderRadius: 20, background: 'var(--cream)', marginBottom: 30 }}>
                  <h3>{editingDeck ? '✏️ Editando Deck' : '+ Novo Deck'}</h3>
                  <div style={{ display: 'grid', gap: 15, marginTop: 15 }}>
                    <input type="text" value={deckTitle} onChange={e => setDeckTitle(e.target.value)} placeholder="Título do Deck (ex: Body Parts)" style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--line)' }} />
                    <input type="text" value={deckDescription} onChange={e => setDeckDescription(e.target.value)} placeholder="Descrição (opcional)" style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--line)' }} />
                    
                    <div style={{ padding: 15, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12 }}>
                      <h4 style={{ margin: '0 0 10px' }}>Selecionar Palavras ({deckWordIds.length})</h4>
                      <input type="text" placeholder="Buscar palavra..." value={deckWordSearch} onChange={e => setDeckWordSearch(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)', marginBottom: 10 }} />
                      <div style={{ maxHeight: 200, overflowY: 'auto', display: 'grid', gap: 8 }}>
                        {vocabWords.filter(w => w.term.toLowerCase().includes(deckWordSearch.toLowerCase()) || w.translation.toLowerCase().includes(deckWordSearch.toLowerCase())).map(w => (
                          <label key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                            <input 
                              type="checkbox" 
                              checked={deckWordIds.includes(w.id)}
                              onChange={(e) => {
                                if (e.target.checked) setDeckWordIds([...deckWordIds, w.id]);
                                else setDeckWordIds(deckWordIds.filter(id => id !== w.id));
                              }}
                            />
                            <strong>{w.term}</strong> - {w.translation}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button disabled={loading} onClick={handleSaveDeck} style={{ padding: '12px 24px', background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 800, cursor: 'pointer' }}>Salvar</button>
                      {editingDeck && <button onClick={() => { setEditingDeck(null); setDeckTitle(''); setDeckDescription(''); setDeckWordIds([]); }} style={{ padding: '12px 24px', background: 'transparent', border: '1px solid var(--line)', borderRadius: 12, cursor: 'pointer' }}>Cancelar</button>}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 14 }}>
                  {decks.map(d => (
                    <div key={d.id} className="admin-flex-between" style={{ padding: 20, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 16 }}>
                      <div>
                        <h3 style={{ margin: '0 0 5px' }}>{d.title}</h3>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted)' }}>{d.description} • {d.wordIds?.length || 0} palavras</p>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => { setEditingDeck(d); setDeckTitle(d.title); setDeckDescription(d.description || ''); setDeckWordIds(d.wordIds || []); }} style={{ background: 'var(--cream)', border: '1px solid var(--line)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>Editar</button>
                        <button onClick={() => handleDeleteDeck(d.id)} style={{ background: 'transparent', border: '1px solid red', color: 'red', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>Excluir</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {vocabSubTab === 'assign' && (
              <div>
                <div style={{ padding: 20, background: 'var(--cream)', border: '1px solid var(--line)', borderRadius: 16, marginBottom: 30 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <h4 style={{ margin: 0 }}>Selecionar Alunos ({vocabAssignStudents.length})</h4>
                    {vocabAssignStudents.length > 0 && (
                      <button onClick={() => setVocabAssignStudents([])} style={{ background: 'none', border: 'none', color: 'var(--plum)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>Limpar Seleção</button>
                    )}
                  </div>
                  <div style={{ maxHeight: 200, overflowY: 'auto', display: 'grid', gap: 8, padding: 10, background: 'var(--paper)', borderRadius: 8, border: '1px solid var(--line)' }}>
                    {students.filter(s => s.active).map(s => (
                      <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '5px 0' }}>
                        <input 
                          type="checkbox" 
                          checked={vocabAssignStudents.includes(s.id)}
                          onChange={(e) => {
                            if (e.target.checked) setVocabAssignStudents([...vocabAssignStudents, s.id]);
                            else setVocabAssignStudents(vocabAssignStudents.filter(id => id !== s.id));
                          }}
                        />
                        {s.name}
                      </label>
                    ))}
                  </div>
                </div>

                {vocabAssignStudents.length > 0 && (
                  <>
                    <div style={{ padding: 20, border: '1px dashed var(--plum)', borderRadius: 16, marginBottom: 30 }}>
                      <div style={{ display: 'flex', gap: 20, marginBottom: 15 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 'bold', cursor: 'pointer' }}>
                          <input type="radio" name="assignType" checked={vocabAssignType === 'deck'} onChange={() => setVocabAssignType('deck')} />
                          Atribuir Deck Fechado
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 'bold', cursor: 'pointer' }}>
                          <input type="radio" name="assignType" checked={vocabAssignType === 'words'} onChange={() => setVocabAssignType('words')} />
                          Atribuir Palavras Soltas
                        </label>
                      </div>

                      {vocabAssignType === 'deck' ? (
                        <select value={vocabAssignDeckId} onChange={e => setVocabAssignDeckId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--line)', marginBottom: 15 }}>
                          <option value="">Selecione o Deck...</option>
                          {decks.map(d => <option key={d.id} value={d.id}>{d.title} ({d.wordIds?.length || 0} palavras)</option>)}
                        </select>
                      ) : (
                        <div style={{ padding: 15, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, marginBottom: 15 }}>
                          <h4 style={{ margin: '0 0 10px' }}>Selecionar Palavras</h4>
                          <input type="text" placeholder="Buscar palavra..." value={assignWordSearch} onChange={e => setAssignWordSearch(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)', marginBottom: 10 }} />
                          <div style={{ maxHeight: 200, overflowY: 'auto', display: 'grid', gap: 8 }}>
                            {vocabWords.filter(w => w.term.toLowerCase().includes(assignWordSearch.toLowerCase()) || w.translation.toLowerCase().includes(assignWordSearch.toLowerCase())).map(w => (
                              <label key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                                <input 
                                  type="checkbox" 
                                  checked={vocabAssignWordIds.includes(w.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) setVocabAssignWordIds([...vocabAssignWordIds, w.id]);
                                    else setVocabAssignWordIds(vocabAssignWordIds.filter(id => id !== w.id));
                                  }}
                                />
                                <strong>{w.term}</strong> - {w.translation}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <button disabled={loading} onClick={handleSaveVocabAssign} style={{ padding: '10px 20px', background: 'var(--plum)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}>
                        Atribuir ao Aluno
                      </button>
                    </div>

                    {vocabAssignStudents.length === 1 ? (
                      <div style={{ display: 'grid', gap: 10 }}>
                        <h3 style={{ margin: '0 0 10px' }}>Atribuições Deste Aluno</h3>
                        {studentVocabAssignments.map(assign => (
                          <div key={assign.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 15, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12 }}>
                            <div>
                              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 99, background: 'rgba(138, 124, 255, 0.15)', color: 'var(--purple)', fontWeight: 'bold' }}>
                                {assign.type === 'deck' ? 'DECK' : 'PALAVRAS SOLTAS'}
                              </span>
                              <p style={{ margin: '8px 0 0', fontWeight: 'bold' }}>
                                {assign.type === 'deck' 
                                  ? (decks.find(d => d.id === assign.deckId)?.title || 'Deck Excluído')
                                  : `${assign.wordIds?.length || 0} palavras selecionadas`
                                }
                              </p>
                            </div>
                            <button onClick={() => handleDeleteVocabAssign(assign.id)} style={{ border: 'none', background: 'none', color: 'red', textDecoration: 'underline', cursor: 'pointer' }}>Remover</button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: 15, background: '#FFF8EC', border: '1px solid var(--amber)', borderRadius: 12, color: 'var(--amber)', fontWeight: 'bold', textAlign: 'center' }}>
                        Modo em lote ativado. Você está atribuindo material para {vocabAssignStudents.length} alunos simultaneamente.
                      </div>
                    )}
                  </>
                )}
                
                {vocabAssignStudents.length === 0 && (
                  <div style={{ marginTop: 30 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingBottom: 10, borderBottom: '1px solid var(--line)' }}>
                      <h3 style={{ margin: 0 }}>Todas as Atribuições Ativas ({allVocabAssignments.length})</h3>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={() => setVocabAssignGroupBy('student')} style={{ padding: '6px 12px', borderRadius: 8, background: vocabAssignGroupBy === 'student' ? 'var(--plum)' : 'var(--paper)', color: vocabAssignGroupBy === 'student' ? '#fff' : 'var(--text)', border: '1px solid var(--line)', cursor: 'pointer', fontWeight: 'bold' }}>Por Aluno</button>
                        <button onClick={() => setVocabAssignGroupBy('material')} style={{ padding: '6px 12px', borderRadius: 8, background: vocabAssignGroupBy === 'material' ? 'var(--plum)' : 'var(--paper)', color: vocabAssignGroupBy === 'material' ? '#fff' : 'var(--text)', border: '1px solid var(--line)', cursor: 'pointer', fontWeight: 'bold' }}>Por Material</button>
                      </div>
                    </div>

                    {vocabAssignGroupBy === 'student' ? (
                      <div style={{ display: 'grid', gap: 15, maxHeight: 600, overflowY: 'auto' }}>
                        {Object.entries(
                          allVocabAssignments.reduce((acc, curr) => {
                            if (!acc[curr.studentId]) acc[curr.studentId] = [];
                            acc[curr.studentId].push(curr);
                            return acc;
                          }, {})
                        ).map(([studentId, assigns]) => (
                          <div key={studentId} style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, padding: 15 }}>
                            <h4 style={{ margin: '0 0 10px', color: 'var(--orange-soft)' }}>{getStudentName(studentId)}</h4>
                            <div style={{ display: 'grid', gap: 8 }}>
                              {assigns.map(a => (
                                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg)', padding: '10px 15px', borderRadius: 8 }}>
                                  <div>
                                    <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 99, background: 'rgba(138, 124, 255, 0.15)', color: 'var(--purple)', fontWeight: 'bold', marginRight: 10 }}>
                                      {a.type === 'deck' ? 'DECK' : 'PALAVRAS SOLTAS'}
                                    </span>
                                    <span style={{ fontWeight: 'bold' }}>
                                      {a.type === 'deck' ? (decks.find(d => d.id === a.deckId)?.title || 'Deck Excluído') : (
                                        <details style={{ cursor: 'pointer' }}>
                                          <summary style={{ outline: 'none' }}>{a.wordIds?.length || 0} palavras</summary>
                                          <div style={{ marginTop: 10, padding: 10, background: 'var(--paper)', borderRadius: 8, fontSize: '0.85rem', fontWeight: 'normal', maxHeight: 150, overflowY: 'auto' }}>
                                            {a.wordIds?.map(wid => {
                                              const word = vocabWords.find(w => w.id === wid);
                                              return word ? (
                                                <div key={wid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                  <span>• <strong>{word.term}</strong></span>
                                                  <button onClick={(e) => { e.preventDefault(); handleRemoveSingleWord(a.id, wid, a.wordIds, true); }} style={{ background: 'none', border: 'none', color: '#ffb1b1', cursor: 'pointer', fontSize: '0.75rem', padding: '2px 6px' }} title="Remover palavra">✕</button>
                                                </div>
                                              ) : null;
                                            })}
                                          </div>
                                        </details>
                                      )}
                                    </span>
                                  </div>
                                  <button onClick={() => handleDeleteGlobalVocab(a.id)} style={{ background: 'none', border: 'none', color: '#ffb1b1', textDecoration: 'underline', cursor: 'pointer' }}>Remover</button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gap: 15, maxHeight: 600, overflowY: 'auto' }}>
                        {/* Grouping by Deck and Words */}
                        {decks.map(deck => {
                          const assignmentsForDeck = allVocabAssignments.filter(a => a.type === 'deck' && a.deckId === deck.id);
                          if (assignmentsForDeck.length === 0) return null;
                          return (
                            <div key={deck.id} style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, padding: 15 }}>
                              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 99, background: 'rgba(138, 124, 255, 0.15)', color: 'var(--purple)', fontWeight: 'bold', marginRight: 10 }}>DECK</span>
                                <h4 style={{ margin: 0 }}>{deck.title}</h4>
                              </div>
                              <div style={{ display: 'grid', gap: 8 }}>
                                {assignmentsForDeck.map(a => (
                                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg)', padding: '10px 15px', borderRadius: 8 }}>
                                    <span>{getStudentName(a.studentId)}</span>
                                    <button onClick={() => handleDeleteGlobalVocab(a.id)} style={{ background: 'none', border: 'none', color: '#ffb1b1', textDecoration: 'underline', cursor: 'pointer' }}>Remover</button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* Independent Words */}
                        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, padding: 15 }}>
                           <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 99, background: 'rgba(138, 124, 255, 0.15)', color: 'var(--purple)', fontWeight: 'bold', marginRight: 10 }}>PALAVRAS SOLTAS</span>
                                <h4 style={{ margin: 0 }}>Atribuições Manuais de Palavras</h4>
                           </div>
                           <div style={{ display: 'grid', gap: 8 }}>
                              {allVocabAssignments.filter(a => a.type === 'words').length === 0 && <p style={{ color: 'var(--muted)', margin: 0 }}>Nenhuma atribuição de palavras soltas ativa.</p>}
                              {allVocabAssignments.filter(a => a.type === 'words').map(a => (
                                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'var(--bg)', padding: '10px 15px', borderRadius: 8 }}>
                                    <div>
                                      <span>{getStudentName(a.studentId)}</span>
                                      <details style={{ cursor: 'pointer', marginTop: 5 }}>
                                        <summary style={{ outline: 'none', fontSize: '0.85rem', color: 'var(--muted)' }}>{a.wordIds?.length || 0} palavras</summary>
                                        <div style={{ marginTop: 10, padding: 10, background: 'var(--paper)', borderRadius: 8, fontSize: '0.85rem', fontWeight: 'normal', maxHeight: 150, overflowY: 'auto' }}>
                                          {a.wordIds?.map(wid => {
                                            const word = vocabWords.find(w => w.id === wid);
                                            return word ? (
                                              <div key={wid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                <span>• <strong>{word.term}</strong></span>
                                                <button onClick={(e) => { e.preventDefault(); handleRemoveSingleWord(a.id, wid, a.wordIds, true); }} style={{ background: 'none', border: 'none', color: '#ffb1b1', cursor: 'pointer', fontSize: '0.75rem', padding: '2px 6px' }} title="Remover palavra">✕</button>
                                              </div>
                                            ) : null;
                                          })}
                                        </div>
                                      </details>
                                    </div>
                                    <button onClick={() => handleDeleteGlobalVocab(a.id)} style={{ background: 'none', border: 'none', color: '#ffb1b1', textDecoration: 'underline', cursor: 'pointer', marginTop: 2 }}>Remover</button>
                                  </div>
                              ))}
                           </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {activeTab === 'library' && <LibraryAdminTab setLoading={setLoading} />}
      </main>
    </div>
  );
}
