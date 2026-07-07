import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { firebaseConfig } from './src/config/firebaseConfig.js'; // I'll need the right path

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const priorityTitles = [
  "bad habits",
  "rapunzel",
  "dua lipa",
  "introduc", // "Introducing a Friend" or "How to Introduce Yourself"
  "toy story 5",
  "communication"
];

async function updateOrder() {
  const snap = await getDocs(collection(db, 'library_episodes'));
  const episodes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  let orderMap = {};
  
  for (const ep of episodes) {
    let title = ep.title.toLowerCase();
    let matchIndex = priorityTitles.findIndex(pt => title.includes(pt));
    
    let order = 999;
    if (matchIndex !== -1) {
      order = matchIndex + 1; // 1 to 6
    }
    
    console.log(`Updating ${ep.title} to order ${order}`);
    await updateDoc(doc(db, 'library_episodes', ep.id), { order });
  }
  
  console.log("Done updating order.");
}

updateOrder();
