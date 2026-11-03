import { initializeApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { db, firebaseConfig } from "../config/firebase";

// App secundário: criar a conta nele não desloga a teacher do app principal
const getSecondaryAuth = () => {
  const existing = getApps().find(a => a.name === 'student-creator');
  return getAuth(existing || initializeApp(firebaseConfig, 'student-creator'));
};

// Cria a conta do aluno com a senha definida pela teacher.
// Para trocar depois, o aluno usa "Esqueci minha senha" no login.
export const createStudent = async ({ name, email, password, plan, dueDate, courses }) => {
  const secondaryAuth = getSecondaryAuth();
  const cleanEmail = email.trim().toLowerCase();

  const { user } = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, password);
  await signOut(secondaryAuth);

  await setDoc(doc(db, 'users', user.uid), {
    role: 'student',
    name: name.trim(),
    plan,
    email: cleanEmail,
    active: true,
    dueDate: dueDate || null,
    courses: courses?.length ? courses : ['en'],
    createdAt: new Date().toISOString()
  });

  return user.uid;
};
