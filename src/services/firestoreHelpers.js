import { collection, query, where, getDocs, documentId } from 'firebase/firestore';
import { db } from '../config/firebase';

// Busca só os documentos pedidos, em vez da coleção inteira.
// O Firestore aceita até 30 ids por consulta "in", então divide em lotes e busca em paralelo.
export const fetchByIds = async (collectionName, ids) => {
  const unique = [...new Set(ids)].filter(Boolean);
  const chunks = [];
  for (let i = 0; i < unique.length; i += 30) chunks.push(unique.slice(i, i + 30));
  const snaps = await Promise.all(chunks.map(chunk => getDocs(query(collection(db, collectionName), where(documentId(), 'in', chunk)))));
  return snaps.flatMap(snap => snap.docs.map(d => ({ id: d.id, ...d.data() })));
};
