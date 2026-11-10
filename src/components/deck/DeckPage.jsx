import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UI_TEXTS } from '../../data/uiTexts';
import { GAME_TYPES } from '../../data/games';
import { getDeckIcon } from '../../data/deckIcons';
import { speak } from '../games/gameUi';
import { wordStatus } from '../../data/srs';

const BUCKETS = [
  { id: 'new', color: '#8a8fb8', key: 'bucketNew' },
  { id: 'learning', color: '#F09A4A', key: 'bucketLearning' },
  { id: 'mastered', color: '#2ed573', key: 'bucketMastered' }
];

// Anel de progresso (como o "Seu progresso" do Quizlet)
function Ring({ value, total, color }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const pct = total ? value / total : 0;
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" style={{ flexShrink: 0 }}>
      <circle cx="28" cy="28" r={r} fill="none" stroke="var(--line)" strokeWidth="5" />
      <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 28 28)" />
      <text x="28" y="33" textAnchor="middle" fontSize="15" fontWeight="800" fill="var(--text)">{value}</text>
    </svg>
  );
}

// Página do deck: prévia dos cartões, modos de estudo e jogos, progresso e lista de termos
export default function DeckPage({ deck, progressById, scores, linkedGames, favoriteIds, onBack, onPlay, onPlayGame, onToggleFavorite }) {
  const { activeCourse, activeCourseInfo } = useAuth();
  const h = UI_TEXTS[activeCourse];
  const [previewIndex, setPreviewIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const words = deck.words;
  const preview = words[previewIndex];
  const byStatus = (status) => words.filter(w => wordStatus(progressById[w.id]) === status);
  const masteredPct = words.length ? Math.round((byStatus('mastered').length / words.length) * 100) : 0;
  const record = (mode) => scores[`${mode}_${deck.id}`]?.best;

  const movePreview = (step) => {
    setFlipped(false);
    setPreviewIndex(i => (i + step + words.length) % words.length);
  };

  const modes = [
    { id: 'cards', icon: '🃏', title: h.modeCards, text: h.modeCardsText },
    { id: 'learn', icon: '🧠', title: h.modeLearn, text: h.modeLearnText, badge: `${masteredPct}%` },
    { id: 'match', icon: '🧩', title: h.modeMatch, text: h.modeMatchText, minWords: 2 },
    { id: 'blast', icon: '🚀', title: h.modeBlast, text: h.modeBlastText, minWords: 2 },
    { id: 'listen', icon: '👂', title: h.gameTypeListen, text: h.modeListenText, minWords: 2 },
    { id: 'hangman', icon: '🔤', title: h.modeHangman, text: h.modeHangmanText },
    { id: 'write', icon: '✍️', title: h.modeWritten, text: h.modeWrittenText }
  ].filter(m => words.length >= (m.minWords || 1) && !(deck.disabledModes || []).includes(m.id));

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <style>{'.mode-row { transition: 0.2s; } .mode-row:hover { border-color: var(--amber) !important; transform: translateX(4px); }'}</style>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontWeight: 800, cursor: 'pointer', marginBottom: 15, padding: 0 }}>{h.backToDecks}</button>

      {/* Prévia: cartão que vira, com setas e pontinhos */}
      {preview && (
        <div style={{ marginBottom: 25 }}>
          <button onClick={() => setFlipped(f => !f)} style={{ width: '100%', minHeight: 220, borderRadius: 26, border: '1px solid var(--line)', background: flipped ? 'linear-gradient(135deg, var(--plum), var(--plum-mid))' : 'var(--paper)', color: flipped ? '#fff' : 'var(--text)', display: 'grid', placeItems: 'center', padding: 30, cursor: 'pointer', transition: '0.3s', boxShadow: '0 12px 30px rgba(0,0,0,0.12)' }}>
            <span style={{ display: 'grid', gap: 10, justifyItems: 'center' }}>
              {preview.imageUrl && !flipped && <img src={preview.imageUrl} alt="" style={{ maxHeight: 90, borderRadius: 12 }} />}
              <span style={{ fontSize: '2rem', fontWeight: 700, fontFamily: '"Playfair Display", serif' }}>{flipped ? preview.translation : preview.term}</span>
              <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>{h.tapToFlip}</span>
            </span>
          </button>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 12 }}>
            <button onClick={() => movePreview(-1)} style={{ width: 38, height: 38, borderRadius: '50%', border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--text)', cursor: 'pointer' }}>‹</button>
            <span style={{ display: 'flex', gap: 5 }}>
              {words.slice(0, 10).map((w, i) => (
                <span key={w.id} style={{ width: 7, height: 7, borderRadius: '50%', background: i === previewIndex % 10 ? 'var(--amber)' : 'var(--line)' }} />
              ))}
            </span>
            <button onClick={() => movePreview(1)} style={{ width: 38, height: 38, borderRadius: '50%', border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--text)', cursor: 'pointer' }}>›</button>
          </div>
        </div>
      )}

      <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2.3rem', color: 'var(--text)', margin: '0 0 6px' }}>{deck.id === 'custom_words_deck' ? '📝' : getDeckIcon(deck)} {deck.title}</h1>
      <p style={{ color: 'var(--muted)', margin: '0 0 25px' }}>{deck.description ? `${deck.description} · ` : ''}{h.cardsCount(words.length)}</p>

      {/* Modos de estudo e jogos */}
      <h2 style={{ fontSize: '1.2rem', color: 'var(--text)', margin: '0 0 12px' }}>{h.modesTitle}</h2>
      <div style={{ display: 'grid', gap: 10, marginBottom: 30 }}>
        {modes.map(m => (
          <button key={m.id} className="mode-row" onClick={() => onPlay(m.id, words)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 16, border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--text)', cursor: 'pointer', textAlign: 'left' }}>
            <span style={{ fontSize: '1.7rem', width: 36, textAlign: 'center' }}>{m.icon}</span>
            <span style={{ flex: 1 }}>
              <strong style={{ display: 'block', fontSize: '1.05rem' }}>{m.title}</strong>
              <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>{m.text}</span>
            </span>
            {(m.badge || record(m.id)) && (
              <span style={{ background: 'var(--cream)', padding: '4px 10px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 800, color: m.badge ? 'var(--plum)' : 'var(--amber)', whiteSpace: 'nowrap' }}>{m.badge || `🏆 ${record(m.id)}`}</span>
            )}
          </button>
        ))}
        {linkedGames.map(g => (
          <button key={g.id} className="mode-row" onClick={() => onPlayGame(g)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 16, border: '1px dashed var(--line)', background: 'var(--paper)', color: 'var(--text)', cursor: 'pointer', textAlign: 'left' }}>
            <span style={{ fontSize: '1.7rem', width: 36, textAlign: 'center' }}>{GAME_TYPES[g.type]?.icon}</span>
            <span style={{ flex: 1 }}>
              <strong style={{ display: 'block', fontSize: '1.05rem' }}>{g.title}</strong>
              <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>{h.deckExtraGames}</span>
            </span>
            {scores[g.id]?.best > 0 && <span style={{ background: 'var(--cream)', padding: '4px 10px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 800, color: 'var(--amber)' }}>🏆 {scores[g.id].best}</span>}
          </button>
        ))}
      </div>

      {/* Progresso: clicar num grupo estuda só aquelas palavras */}
      <h2 style={{ fontSize: '1.2rem', color: 'var(--text)', margin: '0 0 12px' }}>{h.progressTitle}</h2>
      <div style={{ display: 'grid', gap: 10, marginBottom: 30 }}>
        {BUCKETS.map(b => {
          const list = byStatus(b.id);
          return (
            <button key={b.id} disabled={list.length === 0} onClick={() => onPlay('learn', list)} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 18px', borderRadius: 16, border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--text)', cursor: list.length ? 'pointer' : 'default', textAlign: 'left', opacity: list.length ? 1 : 0.6 }}>
              <Ring value={list.length} total={words.length} color={b.color} />
              <strong style={{ flex: 1, fontSize: '1.05rem' }}>{h[b.key]}</strong>
              {list.length > 0 && <span style={{ color: 'var(--amber)', fontWeight: 800, fontSize: '0.85rem' }}>{h.studyBucket} →</span>}
            </button>
          );
        })}
      </div>

      {/* Termos, com áudio e estrela */}
      <h2 style={{ fontSize: '1.2rem', color: 'var(--text)', margin: '0 0 12px' }}>{h.termsTitle}</h2>
      <div style={{ display: 'grid', gap: 8 }}>
        {words.map(w => {
          const fav = favoriteIds.includes(w.id);
          const status = wordStatus(progressById[w.id]);
          return (
            <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 14, border: '1px solid var(--line)', background: 'var(--paper)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: BUCKETS.find(b => b.id === status).color }} title={h[BUCKETS.find(b => b.id === status).key]} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ display: 'block', color: 'var(--text)' }}>{w.term}</strong>
                <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{w.translation}</span>
              </span>
              <button onClick={() => speak(w.term, activeCourseInfo.speechLang)} title="🔊" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}>🔊</button>
              <button onClick={() => onToggleFavorite(w.id)} title={h.favoritesTitle} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: fav ? '#F0C87A' : 'var(--muted)' }}>{fav ? '★' : '☆'}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
