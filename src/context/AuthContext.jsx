import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { auth, db } from '../config/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc, getDocs, collection, query, limit, where, addDoc, updateDoc, arrayUnion, getCountFromServer, increment } from 'firebase/firestore';
import { BADGES } from '../data/badges';
import { getUserCourses, COURSES } from '../data/courses';
import { scheduleReview, DIFFICULT_LAPSES, studyDay, nextStreakGoal } from '../data/srs';
import { applyXp, welcomeBonus, levelFromXp } from '../data/xp';
import { newJourney, getJourney, cityState } from '../data/journey';

const AuthContext = createContext();

// Dia de estudo com virada às 6h (offsetDays = -1 para ontem)
const getStudyDayStr = (offsetDays = 0) => studyDay(new Date(), offsetDays);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unlockedBadges, setUnlockedBadges] = useState([]); // fila de badges recém-conquistadas para o toast
  const [xpEvents, setXpEvents] = useState([]); // fila de "+20 XP" / "Nível 5!" para o XpToast
  const [goalCelebration, setGoalCelebration] = useState(null); // { goal, next, streak } quando bate a meta de streak
  const [courseChoice, setCourseChoice] = useState(() => {
    try { return localStorage.getItem('yv_course'); } catch { return null; }
  });

  // Curso ativo do aluno: a última escolha no seletor, se ele ainda fizer esse curso
  const userCourses = getUserCourses(userData);
  const activeCourse = userCourses.includes(courseChoice) ? courseChoice : userCourses[0];

  const setActiveCourse = (course) => {
    setCourseChoice(course);
    try { localStorage.setItem('yv_course', course); } catch { /* sem storage */ }
  };

  // O tema de cores segue o curso (ver [data-course] no index.css). No admin, quem define é o seletor de curso do AdminHub.
  useEffect(() => {
    const root = document.documentElement;
    if (!userData) delete root.dataset.course;
    else if (userData.role !== 'master') root.dataset.course = activeCourse;
  }, [userData, activeCourse]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Fetch user data from Firestore
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          if (data.active === false) {
            await signOut(auth);
            setUserData(null);
            setCurrentUser(null);
            alert('Sua conta foi desativada. Entre em contato com a YV English.');
            return;
          }

          // Streak reset logic with 6-hour offset (giving 30 hours for the previous day)
          const now = new Date();
          const today = new Date(now.getTime() - 6 * 60 * 60 * 1000);
          today.setHours(0,0,0,0);
          const todayStr = today.toISOString().split('T')[0];
          
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          
          const dayBeforeYesterday = new Date(today);
          dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
          const dayBeforeYesterdayStr = dayBeforeYesterday.toISOString().split('T')[0];

          if (data.currentStreak > 0 && data.lastStreakDate !== todayStr && data.lastStreakDate !== yesterdayStr && data.lastStreakDate !== dayBeforeYesterdayStr) {
            data.currentStreak = 0;
            // Also reset words for today just in case
            data.wordsStudiedToday = 0;
            await setDoc(docRef, { currentStreak: 0, wordsStudiedToday: 0 }, { merge: true });
          }

          setUserData(data);
          
          // Update lastLogin tracking
          await setDoc(docRef, { lastLogin: new Date().toISOString() }, { merge: true });
        } else {
          // Conta sem cadastro (ex.: criada direto no Firebase): vira aluno.
          // As regras do Firestore só deixam criar o próprio cadastro como aluno (nunca como admin).
          const studentData = { role: 'student', name: 'Novo Aluno', plan: 'Foundation', email: user.email, active: true };
          await setDoc(docRef, studentData);
          setUserData(studentData);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
  const logout = () => signOut(auth);
  const resetPassword = (email) => sendPasswordResetEmail(auth, email);

  // Confere o catálogo e concede as badges novas. "data" é o userData já com as últimas alterações.
  const awardBadges = async (data) => {
    if (!currentUser) return [];
    const owned = data.badges || [];

    let wordsCount = 0;
    if (!owned.includes('words_100')) {
      try {
        const agg = await getCountFromServer(collection(db, `users/${currentUser.uid}/flashcard_progress`));
        wordsCount = agg.data().count;
      } catch (err) { console.error(err); } // offline: confere na próxima vez
    }

    const stats = {
      streak: data.currentStreak || 0,
      dailyStreak: data.dailyStreak || 0,
      wordsCount,
      voiceLabCount: (data.voiceLabProgress || []).length,
      libraryLevels: data.libraryLevelsCompleted || [],
      goals: data.goalsCompleted || 0,
      records: data.recordsCount || 0
    };
    const earned = BADGES.filter(b => !owned.includes(b.id) && b.check(stats));
    if (earned.length === 0) return [];

    const ids = earned.map(b => b.id);
    await updateDoc(doc(db, 'users', currentUser.uid), { badges: arrayUnion(...ids) });
    setUserData(prev => ({ ...prev, badges: [...(prev.badges || []), ...ids] }));
    setUnlockedBadges(prev => [...prev, ...earned]);
    return earned;
  };

  const dismissUnlockedBadge = useCallback(() => setUnlockedBadges(prev => prev.slice(1)), []);

  const pushXpEvent = (result) => {
    if (!(result.gained > 0)) return;
    // Chegou numa cidade nova da viagem?
    let city = null;
    const journey = getJourney(userData, activeCourse);
    if (journey && result.updates?.xp != null) {
      const before = cityState(journey, result.updates.xp - result.gained, activeCourse);
      const after = cityState(journey, result.updates.xp, activeCourse);
      if (after.cityIndex > before.cityIndex) city = { name: after.cityName, from: before.cityName, code: after.country.code };
    }
    setXpEvents(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, amount: result.gained, levelUp: result.levelUp, boosted: result.multiplier > 1, city }]);
  };

  // Guarda o que o aluno já viu da viagem (para cada animação aparecer uma vez só)
  const markJourneySeen = useCallback(async (course, seen) => {
    if (!currentUser) return;
    await setDoc(doc(db, 'users', currentUser.uid), { journeySeen: { [course]: seen } }, { merge: true });
    setUserData(prev => ({ ...prev, journeySeen: { ...(prev?.journeySeen || {}), [course]: seen } }));
  }, [currentUser]);

  // Primeira visita à viagem do curso atual: começa no primeiro país
  const startJourney = useCallback(async () => {
    if (!currentUser) return;
    const journey = newJourney(0);
    await setDoc(doc(db, 'users', currentUser.uid), { journey: { [activeCourse]: journey } }, { merge: true });
    setUserData(prev => ({ ...prev, journey: { ...(prev?.journey || {}), [activeCourse]: journey } }));
  }, [currentUser, activeCourse]);
  const dismissXpEvent = useCallback(() => setXpEvents(prev => prev.slice(1)), []);

  // Bônus de boas-vindas do XP: uma vez por aluno, pelo histórico de antes do XP existir
  const welcomeRunning = useRef(false);
  useEffect(() => {
    if (!currentUser || !userData || userData.role !== 'student' || userData.xpWelcome || welcomeRunning.current) return;
    welcomeRunning.current = true;
    const uid = currentUser.uid;
    const docsOf = async (q) => { try { return (await getDocs(q)).docs; } catch (err) { console.warn(err); return []; } };
    (async () => {
      const dailyDocs = await docsOf(query(collection(db, 'daily_assignments'), where('studentId', '==', uid)));
      const taskDocs = await docsOf(query(collection(db, 'submissions'), where('studentId', '==', uid)));
      const bonus = welcomeBonus({
        dailies: dailyDocs.filter(d => d.data().status === 'completed').length,
        episodes: userData.libraryProgress || [],
        extras: userData.completedExtraContents || [],
        tasks: taskDocs.map(d => d.id),
        voiceLab: (userData.voiceLabProgress || []).length,
        goals: userData.goalsCompleted || 0,
        records: userData.recordsCount || 0,
        claimed: userData.xpClaimed || []
      });
      const xpWelcome = { amount: bonus.amount, parts: bonus.parts, date: new Date().toISOString() };
      await setDoc(doc(db, 'users', uid), {
        xpWelcome,
        ...(bonus.amount > 0 ? { xp: increment(bonus.amount) } : {}),
        ...(bonus.claims.length ? { xpClaimed: arrayUnion(...bonus.claims) } : {})
      }, { merge: true });
      let newXp = 0;
      setUserData(prev => {
        newXp = (prev.xp || 0) + bonus.amount;
        return { ...prev, xp: newXp, xpWelcome, xpClaimed: [...(prev.xpClaimed || []), ...bonus.claims] };
      });
      if (bonus.amount > 0) {
        const total = (userData.xp || 0) + bonus.amount;
        setXpEvents(prev => [...prev, { id: `welcome-${uid}`, amount: bonus.amount, welcome: true, level: levelFromXp(newXp || total) }]);
      }
    })().catch(err => { console.error('Bônus de XP:', err); welcomeRunning.current = false; });
  }, [currentUser, userData]);

  // XP de atividades que não contam para o streak (episódio da Biblioteca, conteúdo extra).
  // claim: identificador para dar o XP uma vez só (ex.: "lib:ID"), mesmo se o aluno desmarcar e marcar de novo.
  const awardXp = async (actions, claim = null) => {
    if (!currentUser || !userData) return;
    if (claim && (userData.xpClaimed || []).includes(claim)) return;
    const result = applyXp(userData, actions, getStudyDayStr());
    if (result.gained === 0) return;
    await setDoc(doc(db, 'users', currentUser.uid), { ...result.updates, ...(claim ? { xpClaimed: arrayUnion(claim) } : {}) }, { merge: true });
    setUserData(prev => ({ ...prev, ...result.updates, ...(claim ? { xpClaimed: [...(prev.xpClaimed || []), claim] } : {}) }));
    pushXpEvent(result);
  };

  // xp: { actions: ['daily', …], claim: 'task:ID' } — o XP é salvo junto com o streak
  const recordStudy = async (wordsCount, extraUpdates = {}, xp = {}) => {
    if (!currentUser || !userData) return false;
    
    const todayStr = getStudyDayStr();
    const yesterdayStr = getStudyDayStr(-1);
    const dayBeforeYesterdayStr = getStudyDayStr(-2);

    let newWordsToday = userData.wordsStudiedToday || 0;
    let newStreak = userData.currentStreak || 0;
    let newStreakDate = userData.lastStreakDate || null;
    let goalJustReached = false;
    let streakGoalCompleted = false;
    const goalUpdates = {};

    // Reset words count if it's a new day
    if (userData.lastStudyDate !== todayStr) {
      newWordsToday = 0;
    }
    
    newWordsToday += wordsCount;

    // Check if goal reached today for the first time
    if (newWordsToday >= 1 && newStreakDate !== todayStr) {
      goalJustReached = true;
      newStreakDate = todayStr;
      
      if (userData.lastStreakDate === yesterdayStr || userData.lastStreakDate === dayBeforeYesterdayStr) {
        newStreak += 1;
      } else {
        newStreak = 1;
      }

      // Meta batida quando o streak chega ou passa da meta, uma vez por sequência.
      // Depois disso a meta sobe sozinha para o próximo degrau (3 → 7 → 14…).
      const targetGoal = userData.streakGoal || 3;
      const streakStart = getStudyDayStr(-(newStreak - 1));
      const alreadyCounted = userData.goalReached?.goal === targetGoal && userData.goalReached?.streakStart === streakStart;
      if (newStreak >= targetGoal && !alreadyCounted) {
        streakGoalCompleted = true;
        goalUpdates.goalReached = { goal: targetGoal, streakStart };
        goalUpdates.goalsCompleted = (userData.goalsCompleted || 0) + 1;
        goalUpdates.streakGoal = nextStreakGoal(targetGoal);
      }
    }

    const alreadyClaimed = xp.claim && (userData.xpClaimed || []).includes(xp.claim);
    const xpActions = [...(alreadyClaimed ? [] : xp.actions || []), ...(streakGoalCompleted ? ['streak_goal'] : [])];
    const xpResult = applyXp(userData, xpActions, todayStr);
    const claimNow = xp.claim && !alreadyClaimed && xpResult.gained > 0;

    const updates = {
      ...xpResult.updates,
      wordsStudiedToday: newWordsToday,
      lastStudyDate: todayStr,
      currentStreak: newStreak,
      lastStreakDate: newStreakDate,
      ...goalUpdates,
      ...extraUpdates
    };

    await setDoc(doc(db, 'users', currentUser.uid), claimNow ? { ...updates, xpClaimed: arrayUnion(xp.claim) } : updates, { merge: true });
    setUserData(prev => ({ ...prev, ...updates, ...(claimNow ? { xpClaimed: [...(prev.xpClaimed || []), xp.claim] } : {}) }));
    pushXpEvent(xpResult);

    const earnedBadges = await awardBadges({ ...userData, ...updates });
    if (streakGoalCompleted) setGoalCelebration({ goal: goalUpdates.goalReached.goal, next: goalUpdates.streakGoal, streak: newStreak });

    return { goalJustReached, streakGoalCompleted, newStreak, earnedBadges };
  };

  // Daily concluído: atualiza a sequência de dias com Daily e conta para o streak
  const recordDailyCompletion = async () => {
    if (!currentUser || !userData) return false;
    const todayStr = getStudyDayStr();
    let dailyStreak = userData.dailyStreak || 0;
    if (userData.lastDailyDate === todayStr) {
      // já contou hoje
    } else if (userData.lastDailyDate === getStudyDayStr(-1)) {
      dailyStreak += 1;
    } else {
      dailyStreak = 1;
    }
    return recordStudy(3, { dailyStreak, lastDailyDate: todayStr }, { actions: ['daily'] });
  };

  // Concede retroativamente as badges de nível para episódios já concluídos
  const syncLibraryLevels = async (levels) => {
    if (!currentUser || !userData) return;
    const current = userData.libraryLevelsCompleted || [];
    const missing = levels.filter(l => l && !current.includes(l));
    if (missing.length === 0) return;
    const libraryLevelsCompleted = [...current, ...missing];
    await setDoc(doc(db, 'users', currentUser.uid), { libraryLevelsCompleted }, { merge: true });
    setUserData(prev => ({ ...prev, libraryLevelsCompleted }));
    await awardBadges({ ...userData, libraryLevelsCompleted });
  };

  const setStreakGoal = async (goal) => {
    if (!currentUser || !userData) return;
    // Trocar a meta mantém o streak; se a nova meta já foi alcançada, ela conta no próximo dia de estudo
    const updates = { streakGoal: goal };
    await setDoc(doc(db, 'users', currentUser.uid), updates, { merge: true });
    setUserData(prev => ({ ...prev, ...updates }));
  };

  // Palavras marcadas com ⭐ (formam o deck "Favoritas")
  const toggleFavoriteWord = async (wordId) => {
    if (!currentUser || !userData) return;
    const current = userData.favoriteWords || [];
    const favoriteWords = current.includes(wordId) ? current.filter(id => id !== wordId) : [...current, wordId];
    await setDoc(doc(db, 'users', currentUser.uid), { favoriteWords }, { merge: true });
    setUserData(prev => ({ ...prev, favoriteWords }));
  };

  const toggleLibraryFavorite = async (episodeId) => {
    if (!currentUser || !userData) return;
    const currentFavs = userData.libraryFavorites || [];
    const newFavs = currentFavs.includes(episodeId) 
      ? currentFavs.filter(id => id !== episodeId)
      : [...currentFavs, episodeId];
    
    await setDoc(doc(db, 'users', currentUser.uid), { libraryFavorites: newFavs }, { merge: true });
    setUserData(prev => ({ ...prev, libraryFavorites: newFavs }));
  };

  const toggleLibraryProgress = async (episodeId, level) => {
    if (!currentUser || !userData) return;
    const currentProg = userData.libraryProgress || [];
    const isMarking = !currentProg.includes(episodeId);
    const newProg = isMarking
      ? [...currentProg, episodeId]
      : currentProg.filter(id => id !== episodeId);

    const updates = { libraryProgress: newProg };
    const levels = userData.libraryLevelsCompleted || [];
    if (isMarking && level && !levels.includes(level)) {
      updates.libraryLevelsCompleted = [...levels, level];
    }

    await setDoc(doc(db, 'users', currentUser.uid), updates, { merge: true });
    setUserData(prev => ({ ...prev, ...updates }));
    if (updates.libraryLevelsCompleted) await awardBadges({ ...userData, ...updates });
    if (isMarking) await awardXp(['library_episode'], `lib:${episodeId}`);
  };

  const recordVoiceLabProgress = async (challengeId) => {
    if (!currentUser || !userData) return;
    const currentProg = userData.voiceLabProgress || [];
    if (currentProg.includes(challengeId)) return; // Already completed

    // Salva o progresso junto com o streak; as badges são conferidas no recordStudy
    const result = await recordStudy(1, { voiceLabProgress: [...currentProg, challengeId] }, { actions: ['voice_lab'] });
    return { earnedBadge: (result?.earnedBadges || []).length > 0 };
  };

  const updateFlashcardProgress = async (wordId, score) => {
    if (!currentUser) return;
    try {
      const docRef = doc(db, `users/${currentUser.uid}/flashcard_progress`, wordId);
      const docSnap = await getDoc(docRef);
      const next = scheduleReview(docSnap.exists() ? docSnap.data() : {}, score, getStudyDayStr());
      await setDoc(docRef, { ...next, lastStudied: new Date().toISOString() }, { merge: true });
    } catch (error) {
      console.error("Error updating flashcard progress:", error);
    }
  };

  // Adiciona uma palavra do Daily Content ao deck "Minhas Palavras Soltas" do aluno
  const addWordToFlashcards = async (term, translation) => {
    if (!currentUser) return false;
    const cleanTerm = term.trim();

    // Reaproveita a palavra se ela já existir no vocabulário global do mesmo curso
    const wordSnap = await getDocs(query(collection(db, 'vocabulary_global'), where('term', '==', cleanTerm)));
    const existing = wordSnap.docs.find(d => (d.data().course || 'en') === activeCourse);
    let wordId;
    if (existing) {
      wordId = existing.id;
    } else {
      const newWord = await addDoc(collection(db, 'vocabulary_global'), {
        term: cleanTerm,
        translation: translation.trim(),
        tags: ['daily'],
        course: activeCourse,
        source: 'daily_content',
        createdBy: currentUser.uid,
        createdAt: new Date().toISOString()
      });
      wordId = newWord.id;
    }

    const assignSnap = await getDocs(query(
      collection(db, 'vocab_assignments'),
      where('studentId', '==', currentUser.uid),
      where('type', '==', 'words'),
      limit(1)
    ));
    if (!assignSnap.empty) {
      await updateDoc(assignSnap.docs[0].ref, { wordIds: arrayUnion(wordId) });
    } else {
      await addDoc(collection(db, 'vocab_assignments'), {
        studentId: currentUser.uid,
        type: 'words',
        deckId: null,
        wordIds: [wordId],
        createdAt: new Date().toISOString()
      });
    }
    return true;
  };

  // Recorde de um jogo (users/{uid}/game_scores/{gameId}). Jogar conta para o streak.
  const saveGameScore = async (gameId, score) => {
    if (!currentUser) return { isRecord: false, best: score };
    const ref = doc(db, `users/${currentUser.uid}/game_scores`, gameId);
    const snap = await getDoc(ref);
    const prev = snap.exists() ? snap.data() : { best: 0, plays: 0 };
    const previous = prev.best || 0;
    // Recorde = superou uma pontuação anterior (a primeira partida só define o recorde, sem festa)
    const isRecord = previous > 0 && score > previous;
    const best = Math.max(score, previous);
    await setDoc(ref, { best, plays: (prev.plays || 0) + 1, lastScore: score, lastPlayed: new Date().toISOString() }, { merge: true });
    // Recordes batidos contam para as badges de recordista
    await recordStudy(Math.max(1, score), isRecord ? { recordsCount: (userData?.recordsCount || 0) + 1 } : {}, { actions: isRecord ? ['game', 'record'] : ['game'] });
    return { isRecord, best, previous, firstPlay: previous === 0 };
  };

  const getGameScores = async () => {
    if (!currentUser) return {};
    const snap = await getDocs(collection(db, `users/${currentUser.uid}/game_scores`));
    return Object.fromEntries(snap.docs.map(d => [d.id, d.data()]));
  };

  // Rodadas da Daily Review concluídas hoje (cada rodada tem até 7 palavras)
  const reviewBatchesToday = userData?.reviewBatches?.date === getStudyDayStr() ? userData.reviewBatches.count : 0;

  const recordReviewBatch = async () => {
    if (!currentUser) return;
    const reviewBatches = { date: getStudyDayStr(), count: reviewBatchesToday + 1 };
    await setDoc(doc(db, 'users', currentUser.uid), { reviewBatches }, { merge: true });
    setUserData(prev => ({ ...prev, reviewBatches }));
  };

  // Cards para revisar hoje, dos mais atrasados para os mais recentes
  const getDueFlashcards = async () => {
    if (!currentUser) return [];
    const q = query(
      collection(db, `users/${currentUser.uid}/flashcard_progress`),
      where('nextReviewDate', '<=', getStudyDayStr())
    );
    const snap = await getDocs(q);
    return snap.docs
      .map(d => ({ wordId: d.id, ...d.data() }))
      .sort((a, b) => a.nextReviewDate.localeCompare(b.nextReviewDate));
  };

  // Palavras que o aluno errou várias vezes e ainda não consolidou
  const getDifficultFlashcards = async () => {
    if (!currentUser) return [];
    const q = query(
      collection(db, `users/${currentUser.uid}/flashcard_progress`),
      where('lapses', '>=', DIFFICULT_LAPSES)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ wordId: d.id, ...d.data() })).filter(p => (p.repetitions || 0) < 3);
  };


  const value = {
    currentUser,
    userData,
    userCourses,
    activeCourse,
    activeCourseInfo: COURSES[activeCourse],
    setActiveCourse,
    login,
    logout,
    resetPassword,
    recordStudy,
    recordDailyCompletion,
    syncLibraryLevels,
    unlockedBadges,
    xpEvents,
    startJourney,
    markJourneySeen,
    dismissXpEvent,
    awardXp,
    goalCelebration,
    dismissGoalCelebration: () => setGoalCelebration(null),
    dismissUnlockedBadge,
    toggleLibraryFavorite,
    toggleFavoriteWord,
    toggleLibraryProgress,
    recordVoiceLabProgress,
    updateFlashcardProgress,
    getDueFlashcards,
    getDifficultFlashcards,
    reviewBatchesToday,
    saveGameScore,
    getGameScores,
    recordReviewBatch,
    addWordToFlashcards,
    setStreakGoal
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
