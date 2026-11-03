import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { auth, db } from '../config/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc, getDocs, collection, query, limit, where, addDoc, updateDoc, arrayUnion, getCountFromServer } from 'firebase/firestore';
import { BADGES } from '../data/badges';

const AuthContext = createContext();

// Dia de estudo com virada às 6h (offsetDays = -1 para ontem)
const getStudyDayStr = (offsetDays = 0) => {
  const day = new Date(Date.now() - 6 * 60 * 60 * 1000);
  day.setHours(0, 0, 0, 0);
  day.setDate(day.getDate() + offsetDays);
  return day.toISOString().split('T')[0];
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unlockedBadges, setUnlockedBadges] = useState([]); // fila de badges recém-conquistadas para o toast

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
          // Se o documento não existir, verifica se é o primeiro usuário do sistema
          const q = query(collection(db, 'users'), limit(1));
          const usersSnap = await getDocs(q);
          
          if (usersSnap.empty) {
            // Primeiro usuário a logar no sistema ganha Admin (Master)
            const masterData = { role: 'master', name: 'Yasmin (Admin)', plan: 'Master', email: user.email, active: true };
            await setDoc(docRef, masterData);
            setUserData(masterData);
          } else {
            // Demais usuários viram alunos normais
            const studentData = { role: 'student', name: 'Novo Aluno', plan: 'Foundation', email: user.email, active: true };
            await setDoc(docRef, studentData);
            setUserData(studentData);
          }
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
      libraryLevels: data.libraryLevelsCompleted || []
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

  const recordStudy = async (wordsCount, extraUpdates = {}) => {
    if (!currentUser || !userData) return false;
    
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

    let newWordsToday = userData.wordsStudiedToday || 0;
    let newStreak = userData.currentStreak || 0;
    let newStreakDate = userData.lastStreakDate || null;
    let goalJustReached = false;
    let streakGoalCompleted = false;

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

      const targetGoal = userData.streakGoal || 3;
      if (newStreak === targetGoal) {
        streakGoalCompleted = true;
      }
    }

    const updates = {
      wordsStudiedToday: newWordsToday,
      lastStudyDate: todayStr,
      currentStreak: newStreak,
      lastStreakDate: newStreakDate,
      ...extraUpdates
    };

    await setDoc(doc(db, 'users', currentUser.uid), updates, { merge: true });
    setUserData(prev => ({ ...prev, ...updates }));

    const earnedBadges = await awardBadges({ ...userData, ...updates });

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
    return recordStudy(3, { dailyStreak, lastDailyDate: todayStr });
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
    const updates = {
      streakGoal: goal,
      currentStreak: 0,
      lastStreakDate: null
    };
    await setDoc(doc(db, 'users', currentUser.uid), updates, { merge: true });
    setUserData(prev => ({ ...prev, ...updates }));
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
  };

  const recordVoiceLabProgress = async (challengeId) => {
    if (!currentUser || !userData) return;
    const currentProg = userData.voiceLabProgress || [];
    if (currentProg.includes(challengeId)) return; // Already completed

    // Salva o progresso junto com o streak; as badges são conferidas no recordStudy
    const result = await recordStudy(1, { voiceLabProgress: [...currentProg, challengeId] });
    return { earnedBadge: (result?.earnedBadges || []).length > 0 };
  };

  const updateFlashcardProgress = async (wordId, score) => {
    if (!currentUser) return;
    
    try {
      const docRef = doc(db, `users/${currentUser.uid}/flashcard_progress`, wordId);
      const docSnap = await getDoc(docRef);
      
      let interval = 0;
      let repetitions = 0;
      let easeFactor = 2.5;

      if (docSnap.exists()) {
        const data = docSnap.data();
        repetitions = Number(data.repetitions);
        if (isNaN(repetitions)) repetitions = 0;
        
        interval = Number(data.interval);
        if (isNaN(interval)) interval = 0;
        
        easeFactor = Number(data.easeFactor);
        if (isNaN(easeFactor)) easeFactor = 2.5;
      }

      if (score === 0) {
        repetitions = 0;
        interval = 1;
      } else {
        repetitions += 1;
        if (repetitions === 1) {
          interval = 1;
        } else if (repetitions === 2) {
          interval = 2; // Acertou -> aparece em 2 dias
        } else {
          interval = Math.round(interval * easeFactor);
          if (isNaN(interval) || interval < 1) interval = 1;
        }
        
        easeFactor = easeFactor + (0.1 - (3 - score) * (0.08 + (3 - score) * 0.02));
        if (isNaN(easeFactor)) easeFactor = 2.5;
        if (easeFactor < 1.3) easeFactor = 1.3;
      }

      const nextDate = new Date();
      if (score > 0) {
        let daysToAdd = Number(interval);
        if (isNaN(daysToAdd)) daysToAdd = 1;
        nextDate.setDate(nextDate.getDate() + daysToAdd);
      }
      const nextReviewDate = nextDate.toISOString().split('T')[0];

      await setDoc(docRef, {
        repetitions,
        interval,
        easeFactor,
        nextReviewDate,
        lastStudied: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.error("Error updating flashcard progress:", error);
    }
  };

  // Adiciona uma palavra do Daily Content ao deck "Minhas Palavras Soltas" do aluno
  const addWordToFlashcards = async (term, translation) => {
    if (!currentUser) return false;
    const cleanTerm = term.trim();

    // Reaproveita a palavra se ela já existir no vocabulário global
    const wordSnap = await getDocs(query(collection(db, 'vocabulary_global'), where('term', '==', cleanTerm), limit(1)));
    let wordId;
    if (!wordSnap.empty) {
      wordId = wordSnap.docs[0].id;
    } else {
      const newWord = await addDoc(collection(db, 'vocabulary_global'), {
        term: cleanTerm,
        translation: translation.trim(),
        tags: ['daily'],
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

  const getDueFlashcards = async () => {
    if (!currentUser) return [];
    
    // Build query for cards due today or earlier (using the 6-hour shifted day)
    const now = new Date();
    const today = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    today.setHours(0,0,0,0);
    const todayStr = today.toISOString().split('T')[0];
    
    const q = query(
      collection(db, `users/${currentUser.uid}/flashcard_progress`),
      where('nextReviewDate', '<=', todayStr)
    );
    
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ wordId: doc.id, ...doc.data() }));
  };


  const value = {
    currentUser,
    userData,
    login,
    logout,
    resetPassword,
    recordStudy,
    recordDailyCompletion,
    syncLibraryLevels,
    unlockedBadges,
    dismissUnlockedBadge,
    toggleLibraryFavorite,
    toggleLibraryProgress,
    recordVoiceLabProgress,
    updateFlashcardProgress,
    getDueFlashcards,
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
