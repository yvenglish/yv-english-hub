import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../config/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc, getDocs, collection, query, limit, where } from 'firebase/firestore';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

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

          // Streak reset logic
          const today = new Date();
          today.setHours(0,0,0,0);
          const todayStr = today.toISOString().split('T')[0];
          
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];

          if (data.currentStreak > 0 && data.lastStreakDate !== todayStr && data.lastStreakDate !== yesterdayStr) {
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

  const recordStudy = async (wordsCount) => {
    if (!currentUser || !userData) return false;
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayStr = today.toISOString().split('T')[0];
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newWordsToday = userData.wordsStudiedToday || 0;
    let newStreak = userData.currentStreak || 0;
    let newStreakDate = userData.lastStreakDate || null;
    let goalJustReached = false;

    // Reset words count if it's a new day
    if (userData.lastStudyDate !== todayStr) {
      newWordsToday = 0;
    }
    
    newWordsToday += wordsCount;

    // Check if goal reached today for the first time
    if (newWordsToday >= 7 && newStreakDate !== todayStr) {
      goalJustReached = true;
      newStreakDate = todayStr;
      
      if (userData.lastStreakDate === yesterdayStr) {
        newStreak += 1;
      } else {
        newStreak = 1;
      }
    }

    const updates = {
      wordsStudiedToday: newWordsToday,
      lastStudyDate: todayStr,
      currentStreak: newStreak,
      lastStreakDate: newStreakDate
    };

    await setDoc(doc(db, 'users', currentUser.uid), updates, { merge: true });
    setUserData({ ...userData, ...updates });

    return goalJustReached;
  };

  const toggleLibraryFavorite = async (episodeId) => {
    if (!currentUser || !userData) return;
    const currentFavs = userData.libraryFavorites || [];
    const newFavs = currentFavs.includes(episodeId) 
      ? currentFavs.filter(id => id !== episodeId)
      : [...currentFavs, episodeId];
    
    await setDoc(doc(db, 'users', currentUser.uid), { libraryFavorites: newFavs }, { merge: true });
    setUserData({ ...userData, libraryFavorites: newFavs });
  };

  const toggleLibraryProgress = async (episodeId) => {
    if (!currentUser || !userData) return;
    const currentProg = userData.libraryProgress || [];
    const newProg = currentProg.includes(episodeId)
      ? currentProg.filter(id => id !== episodeId)
      : [...currentProg, episodeId];
    
    await setDoc(doc(db, 'users', currentUser.uid), { libraryProgress: newProg }, { merge: true });
    setUserData({ ...userData, libraryProgress: newProg });
  };

  const updateFlashcardProgress = async (wordId, score) => {
    if (!currentUser) return;
    
    const docRef = doc(db, `users/${currentUser.uid}/flashcard_progress`, wordId);
    const docSnap = await getDoc(docRef);
    
    let interval = 0;
    let repetitions = 0;
    let easeFactor = 2.5;

    if (docSnap.exists()) {
      const data = docSnap.data();
      repetitions = data.repetitions || 0;
      interval = data.interval || 0;
      easeFactor = data.easeFactor || 2.5;
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
      }
      
      easeFactor = easeFactor + (0.1 - (3 - score) * (0.08 + (3 - score) * 0.02));
      if (easeFactor < 1.3) easeFactor = 1.3;
    }

    const nextDate = new Date();
    if (score > 0) {
      nextDate.setDate(nextDate.getDate() + interval);
    }
    const nextReviewDate = nextDate.toISOString().split('T')[0];

    await setDoc(docRef, {
      interval,
      repetitions,
      easeFactor,
      nextReviewDate,
      lastReviewed: new Date().toISOString()
    }, { merge: true });
  };

  const getDueFlashcards = async () => {
    if (!currentUser) return [];
    
    // Build query for cards due today or earlier
    const today = new Date();
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
    toggleLibraryFavorite,
    toggleLibraryProgress,
    updateFlashcardProgress,
    getDueFlashcards
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
