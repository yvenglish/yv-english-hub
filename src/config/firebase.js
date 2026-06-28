import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDcwGG7pZu_coWB2G_vtI99LurRCZijFVw",
  authDomain: "yv-hub-2253d.firebaseapp.com",
  projectId: "yv-hub-2253d",
  storageBucket: "yv-hub-2253d.firebasestorage.app",
  messagingSenderId: "715533060042",
  appId: "1:715533060042:web:7a3e88ed4085258ad8f133",
  measurementId: "G-5RL7T9E1SY"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Só inicializa o messaging se estiver no navegador e se for suportado
let messaging = null;
if (typeof window !== 'undefined') {
  messaging = getMessaging(app);
}
export { messaging };
