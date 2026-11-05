// Últimas notícias do The Fluency News (projeto Firebase "thefluencytimes", leitura pública).
// Usa a API REST do Firestore para não carregar um segundo app Firebase só para isso.
// Se o site fechar o acesso público, o feed simplesmente fica sem notícias.

const NEWS_SITE = 'https://the-fluency-times.vercel.app';
const API_KEY = 'AIzaSyAbmG2--G2RXDlnF9WGyTLwIRq-uNsKzpI'; // chave web pública do site (a mesma que o site usa)
const LIST_URL = `https://firestore.googleapis.com/v1/projects/thefluencytimes/databases/(default)/documents/articles?pageSize=20&orderBy=publishDate%20desc&key=${API_KEY}`;

let cache = null; // { at, articles }
const CACHE_MS = 10 * 60 * 1000;

const value = (field) => (field ? Object.values(field)[0] : undefined);

const toArticle = (doc) => {
  const f = doc.fields || {};
  const images = value(f.imageUrls)?.values || [];
  return {
    id: doc.name.split('/').pop(),
    title: value(f.title) || '',
    image: images.length ? value(images[0]) : '',
    // "CNN en Español — Adaptado por The Fluency Times" vira "CNN en Español"
    source: (value(f.source) || '').split(/\s[—/|-]\s/)[0].trim(),
    publishDate: value(f.publishDate) || '',
    language: value(f.language) || 'en' // notícias antigas não têm o campo e são em inglês
  };
};

export const newsSiteUrl = (course) => (course === 'es' ? `${NEWS_SITE}/?lang=es` : NEWS_SITE);
export const articleUrl = (article, course) => `${NEWS_SITE}/article/${article.id}${course === 'es' ? '?lang=es' : ''}`;

// As notícias mais recentes no idioma do curso
export const getLatestNews = async (course, count = 3) => {
  try {
    if (!cache || Date.now() - cache.at > CACHE_MS) {
      const res = await fetch(LIST_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      cache = { at: Date.now(), articles: (data.documents || []).map(toArticle) };
    }
    return cache.articles.filter(a => a.language === course && a.title).slice(0, count);
  } catch (err) {
    console.warn('Não foi possível carregar as notícias:', err);
    return [];
  }
};
