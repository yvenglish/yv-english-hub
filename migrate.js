import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar config do firebase (pode ler do source)
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
const db = getFirestore(app);

// Precisamos importar o libraryData dinamicamente ou copiar o EPISODES para cá.
// Para evitar problemas com importação de React e JSX que pode ter no projeto,
// vamos apenas importar o data se for possível.
import { EPISODES } from './src/data/libraryData.js';

async function run() {
  console.log("Iniciando migração de", EPISODES.length, "episódios...");
  for (const ep of EPISODES) {
    const payload = { ...ep, originalId: ep.id, migratedAt: new Date().toISOString() };
    delete payload.id;
    await addDoc(collection(db, 'library_episodes'), payload);
    console.log("Migrado:", ep.title);
  }
  console.log("Feito!");
  process.exit(0);
}

run().catch(console.error);
