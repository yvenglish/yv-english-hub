import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

// Episódios da biblioteca compartilhados entre a home, a busca do menu e a página da Biblioteca:
// quem chega primeiro baixa, os outros reaproveitam. Depois de 5 minutos, busca de novo.
const MAX_AGE_MS = 5 * 60 * 1000;
let cache = null;
let fetchedAt = 0;
let pending = null;

export const getCachedEpisodes = () => cache;

export const getEpisodes = () => {
  if (cache && Date.now() - fetchedAt < MAX_AGE_MS) return Promise.resolve(cache);
  if (!pending) {
    pending = getDocs(collection(db, 'library_episodes'))
      .then(snap => {
        cache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        fetchedAt = Date.now();
        return cache;
      })
      .finally(() => { pending = null; });
  }
  return pending;
};

// Adianta o código da página e os episódios (chamado ao abrir o menu ou passar o mouse em "Biblioteca")
export const preloadLibrary = () => {
  import('../pages/Library');
  getEpisodes().catch(() => {});
};
