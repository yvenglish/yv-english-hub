import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { UI_TEXTS } from '../../data/uiTexts';
import { inCourse, getLevelLabel } from '../../data/courses';
import { getLatestNews, articleUrl, newsSiteUrl } from '../../services/newsService';
import { REVIEW_BATCH_SIZE } from '../../data/srs';

const pickRandom = (list) => (list.length ? list[Math.floor(Math.random() * list.length)] : null);

const cardBase = {
  flex: '0 0 260px', scrollSnapAlign: 'start', background: 'var(--paper)', border: '1px solid var(--line)',
  borderRadius: 22, overflow: 'hidden', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column',
  color: 'var(--text)', textDecoration: 'none', padding: 0
};

function FeedCard({ kicker, title, text, cta, image, emoji, onClick, href }) {
  const content = (
    <>
      {image ? (
        <img src={image} alt="" loading="lazy" style={{ width: '100%', height: 130, objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none'; }} />
      ) : (
        <div style={{ height: 130, display: 'grid', placeItems: 'center', fontSize: '3rem', background: 'radial-gradient(circle at 70% 20%, rgba(240,154,74,0.25), transparent 60%), var(--cream)' }}>{emoji}</div>
      )}
      <span style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--amber)' }}>{kicker}</span>
        <strong style={{ fontSize: '1rem', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{title}</strong>
        {text && <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{text}</span>}
        <span style={{ marginTop: 'auto', paddingTop: 6, fontWeight: 800, color: 'var(--plum)', fontSize: '0.85rem' }}>{cta}</span>
      </span>
    </>
  );
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="feed-card" style={cardBase}>{content}</a>
  ) : (
    <button type="button" onClick={onClick} className="feed-card" style={cardBase}>{content}</button>
  );
}

// Feed "Para você hoje": notícias do The Fluency News, Daily Review, um episódio e um desafio ainda não feitos.
// onDueCount devolve à home quantas palavras há para revisar (usado no painel "Hoje").
export default function HomeFeed({ onDueCount }) {
  const { userData, activeCourse, getDueFlashcards } = useAuth();
  const h = UI_TEXTS[activeCourse];
  const navigate = useNavigate();

  const [news, setNews] = useState([]);
  const [dueCount, setDueCount] = useState(0);
  const [episode, setEpisode] = useState(null);
  const [challenge, setChallenge] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [latest, due, wordsSnap, episodesSnap, challengesSnap] = await Promise.all([
        getLatestNews(activeCourse, 3),
        getDueFlashcards().catch(() => []),
        getDocs(collection(db, 'vocabulary_global')).catch(() => null),
        getDocs(collection(db, 'library_episodes')).catch(() => null),
        getDocs(collection(db, 'voice_lab_challenges')).catch(() => null)
      ]);
      if (!alive) return;
      setNews(latest);

      // Só conta palavras do curso ativo
      const courseWordIds = new Set((wordsSnap?.docs || []).filter(d => inCourse(d.data(), activeCourse)).map(d => d.id));
      const count = due.filter(d => courseWordIds.has(d.wordId)).length;
      setDueCount(count);
      onDueCount?.(count);

      const doneEpisodes = userData?.libraryProgress || [];
      setEpisode(pickRandom((episodesSnap?.docs || []).map(d => ({ id: d.id, ...d.data() })).filter(e => inCourse(e, activeCourse) && !doneEpisodes.includes(e.id))));

      const doneChallenges = userData?.voiceLabProgress || [];
      setChallenge(pickRandom((challengesSnap?.docs || []).map(d => ({ id: d.id, ...d.data() })).filter(c => inCourse(c, activeCourse) && !doneChallenges.includes(c.id))));
    };
    load();
    return () => { alive = false; };
  }, [activeCourse]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasFeed = news.length || episode || challenge;

  return (
    <>
      <style>{'.feed-card { transition: 0.25s; } .feed-card:hover { transform: translateY(-4px); border-color: var(--amber) !important; } .review-hero { transition: 0.25s; } .review-hero:hover { transform: translateY(-3px); } .feed-scroll::-webkit-scrollbar { height: 6px; } .feed-scroll::-webkit-scrollbar-thumb { background: var(--line); border-radius: 99px; }'}</style>
      {/* Daily Review em destaque na home */}
      {dueCount > 0 && (
        <section className="section-block">
          <button type="button" onClick={() => navigate('/flashcards')} className="review-hero" style={{ width: '100%', textAlign: 'left', cursor: 'pointer', border: 'none', borderRadius: 28, padding: '28px 30px', color: '#fff', background: 'radial-gradient(circle at 90% 10%, rgba(240,154,74,0.45), transparent 45%), linear-gradient(135deg, var(--plum), var(--plum-mid))', boxShadow: '0 18px 40px rgba(0,0,0,0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--amber-soft)' }}>🔥 {h.feedReview}</span>
              <strong style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.9rem', lineHeight: 1.15 }}>{h.feedReviewText(Math.min(dueCount, REVIEW_BATCH_SIZE))}</strong>
            </span>
            <span style={{ background: '#fff', color: 'var(--plum)', padding: '12px 22px', borderRadius: 99, fontWeight: 800, whiteSpace: 'nowrap' }}>{h.feedReviewCta}</span>
          </button>
        </section>
      )}

      {hasFeed ? (
    <section className="section-block">
      <div className="section-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <p>{h.feedKicker}</p>
          <h2>{h.feedTitle}</h2>
        </div>
        {news.length > 0 && <a href={newsSiteUrl(activeCourse)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--amber)', fontWeight: 800, textDecoration: 'none' }}>{h.feedMoreNews}</a>}
      </div>
      <div className="feed-scroll" style={{ display: 'flex', gap: 16, overflowX: 'auto', scrollSnapType: 'x mandatory', paddingBottom: 10 }}>
        {news.map(a => (
          <FeedCard key={a.id} kicker={`🗞️ ${h.feedNews}${a.source ? ` · ${a.source}` : ''}`} title={a.title} cta={h.feedNewsCta} image={a.image} emoji="🗞️" href={articleUrl(a, activeCourse)} />
        ))}
        {episode && (
          <FeedCard kicker={`🎧 ${h.feedEpisode}`} title={episode.title} text={episode.level ? getLevelLabel(episode.level, activeCourse) : ''} cta={h.feedEpisodeCta} image={episode.imageUrl} emoji="🎧" onClick={() => navigate('/library', { state: { openEpisodeId: episode.id, _t: Date.now() } })} />
        )}
        {challenge && (
          <FeedCard kicker={`🎙️ ${h.feedVoice}`} title={challenge.title} text={challenge.description} cta={h.feedVoiceCta} image={challenge.coverImageUrl} emoji="🎙️" onClick={() => navigate('/voice-lab')} />
        )}
      </div>
    </section>
      ) : null}
    </>
  );
}
