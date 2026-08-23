import { useState, useRef, useMemo } from 'react';
import { LEVELS } from '../../data/libraryData';
import { useAuth } from '../../context/AuthContext';

export default function EpisodePlayer({ episode, onBack, isFavorite, isCompleted, onToggleFavorite, onToggleProgress }) {
  const { userData, recordStudy } = useAuth();
  const [showSummaryPt, setShowSummaryPt] = useState(false);
  const [isFloating, setIsFloating] = useState(false);
  const [flippedVocab, setFlippedVocab] = useState({});
  const [answers, setAnswers] = useState({});
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [localStreak, setLocalStreak] = useState(null);
  
  const audioRef = useRef(null);
  const videoRef = useRef(null);

  const toggleVocab = (index) => {
    setFlippedVocab({ ...flippedVocab, [index]: !flippedVocab[index] });
  };

  const handleSubmit = async () => {
    if (userData) {
      const { newStreak } = await recordStudy(7); // Conta 7 pontos simbólicos para garantir o streak diário
      if (newStreak !== undefined) {
        setLocalStreak(newStreak);
      }
    }
    setShowGoalModal(true);
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%', padding: '40px 20px', fontFamily: '"Inter", sans-serif' }}>
      
      {showGoalModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(20, 10, 20, 0.85)', backdropFilter: 'blur(12px)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <div style={{ background: 'var(--paper)', width: '100%', maxWidth: 450, borderRadius: 28, overflow: 'hidden', position: 'relative', border: '1px solid #A78BFA', textAlign: 'center', padding: '50px 40px', boxShadow: '0 20px 60px rgba(167, 139, 250, 0.2)' }}>
            <span style={{ fontSize: '5rem', display: 'block', margin: '0 auto 15px', animation: 'bounce 1s infinite' }}>🎉</span>
            <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2.5rem', color: '#A78BFA', marginBottom: 15, lineHeight: 1.1 }}>Excellent!</h2>
            <p style={{ color: 'var(--text)', fontSize: '1.1rem', lineHeight: 1.6, marginBottom: 10 }}>Suas respostas foram enviadas com sucesso para a Teacher Yas.</p>
            <p style={{ color: 'var(--muted)', fontSize: '0.95rem', marginBottom: 30 }}>Você está em um streak de <strong>{localStreak ?? userData?.currentStreak ?? 0} dias</strong>. Continue assim!</p>
            <button onClick={() => setShowGoalModal(false)} style={{ padding: '16px 28px', background: '#A78BFA', color: '#0d071a', border: 'none', borderRadius: 999, fontWeight: 800, fontSize: '1.1rem', width: '100%', cursor: 'pointer', transition: '0.2s' }}>Fechar</button>
          </div>
        </div>
      )}

      {/* Header Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 15, marginBottom: 30 }}>
        <button 
          onClick={onBack} 
          style={{ background: '#201633', border: 'none', color: '#fff', padding: '10px 24px', borderRadius: 99, cursor: 'pointer', fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <span>←</span> Back to Library
        </button>
        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            onClick={onToggleFavorite} 
            style={{ background: '#201633', border: 'none', color: '#fff', padding: '10px 24px', borderRadius: 99, cursor: 'pointer', fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <span>{isFavorite ? '❤️' : '🤍'}</span> Add to Favorites
          </button>
          <button 
            onClick={onToggleProgress} 
            style={{ background: '#201633', border: 'none', color: '#fff', padding: '10px 24px', borderRadius: 99, cursor: 'pointer', fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <span style={{ color: isCompleted ? '#4ADE80' : '#A78BFA' }}>{isCompleted ? '☑️' : '☑️'}</span> Mark as Complete
          </button>
        </div>
      </div>

      {episode.externalLink ? (
        <iframe src={episode.externalLink} style={{ width: '100%', height: '80vh', border: 'none', borderRadius: 24, background: '#fff' }} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          
          {/* Top Dark Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 350px), 1fr))', gap: 20 }}>
            
            {/* Left Card: Info & Summary */}
            <div style={{ background: 'linear-gradient(145deg, #1A112C, #2A1B3D)', padding: 40, borderRadius: 24, color: '#fff', display: 'flex', flexDirection: 'column' }}>
              <p style={{ fontSize: '0.75rem', color: '#F59E0B', textTransform: 'uppercase', fontWeight: 900, margin: '0 0 8px', letterSpacing: '0.1em' }}>
                {episode.type}
              </p>
              <h2 style={{ fontSize: '2.5rem', fontFamily: '"Playfair Display", serif', margin: '0 0 16px', fontWeight: 800, lineHeight: 1.1 }}>
                {episode.title}
              </h2>
              <p style={{ color: '#E2E8F0', margin: '0 0 32px', fontSize: '1rem' }}>
                {episode.source}
              </p>

              <p style={{ fontSize: '0.75rem', color: '#F59E0B', textTransform: 'uppercase', fontWeight: 900, margin: '0 0 8px', letterSpacing: '0.1em' }}>
                SUMMARY
              </p>
              <h3 style={{ fontSize: '1.6rem', margin: '0 0 16px', fontWeight: 700 }}>
                Read before or after listening
              </h3>

              <div style={{ background: '#fff', padding: 24, borderRadius: 16, color: '#1E293B', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: 16 }}>
                {showSummaryPt ? (episode.summary?.pt || 'Resumo indisponível.') : (episode.summary?.en || 'Summary not available.')}
              </div>
              
              <button 
                onClick={() => setShowSummaryPt(!showSummaryPt)} 
                style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '10px 24px', borderRadius: 99, cursor: 'pointer', fontWeight: 800, fontSize: '0.9rem', marginBottom: 40 }}
              >
                {showSummaryPt ? 'Show Original' : 'Translate Summary'}
              </button>

              <div style={{ display: 'flex', gap: 12, marginTop: 'auto' }}>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', padding: '16px', borderRadius: 16 }}>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: '#CBD5E1', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', marginBottom: 4 }}>LEVEL</span>
                  <strong style={{ fontSize: '1.1rem' }}>{LEVELS[episode.level]?.title || episode.level}</strong>
                </div>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', padding: '16px', borderRadius: 16 }}>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: '#CBD5E1', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', marginBottom: 4 }}>TIME</span>
                  <strong style={{ fontSize: '1.1rem' }}>{episode.estimatedTime}</strong>
                </div>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', padding: '16px', borderRadius: 16 }}>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: '#CBD5E1', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', marginBottom: 4 }}>TYPE</span>
                  <strong style={{ fontSize: '1.1rem' }}>{episode.type}</strong>
                </div>
              </div>
            </div>

            {/* Right Card: Player */}
            <div style={{ background: 'linear-gradient(145deg, #1A112C, #2A1B3D)', padding: 40, borderRadius: 24, color: '#fff', display: 'flex', flexDirection: 'column', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#F59E0B', textTransform: 'uppercase', fontWeight: 900, margin: '0 0 8px', letterSpacing: '0.1em' }}>
                    ORIGINAL SOURCE
                  </p>
                  <h3 style={{ fontSize: '2.5rem', fontFamily: '"Playfair Display", serif', margin: 0, fontWeight: 800 }}>
                    {episode.hasVideo ? 'Video / Player' : 'Audio Player'}
                  </h3>
                </div>
                {(episode.hasVideo || episode.embed || episode.hasAudio) && (
                  <button 
                    onClick={() => setIsFloating(!isFloating)}
                    style={{ background: isFloating ? '#F59E0B' : 'rgba(255,255,255,0.1)', color: isFloating ? '#000' : '#fff', border: 'none', padding: '8px 16px', borderRadius: 99, fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}
                  >
                    {isFloating ? '🎬 Exit Theater' : '🎬 Theater Mode'}
                  </button>
                )}
              </div>
              
              {useMemo(() => (
                <div className={isFloating ? "floating-player" : ""} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', background: '#000', borderRadius: isFloating ? 0 : 16, overflow: 'hidden', width: '100%', aspectRatio: '16/9' }}>
                  {isFloating && (
                     <button className="floating-close-btn" onClick={() => setIsFloating(false)}>×</button>
                  )}
                  {episode.hasVideo ? (
                    episode.embed ? (
                      <div 
                        dangerouslySetInnerHTML={{ __html: episode.embed.replace('<iframe', '<iframe style="width: 100%; height: 100%; border: none;"') }} 
                        style={{ width: '100%', height: '100%' }} 
                      />
                    ) : (
                      <video ref={videoRef} controls src={`/${episode.videoFile}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    )
                  ) : episode.hasAudio ? (
                    <div style={{ padding: 30 }}>
                      <audio ref={audioRef} controls src={`/${episode.audioFile}`} style={{ width: '100%', borderRadius: 99 }} />
                      <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'center' }}>
                        <button onClick={() => { if(audioRef.current) audioRef.current.currentTime -= 5 }} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '8px 15px', borderRadius: 99, cursor: 'pointer', fontWeight: 'bold' }}>⏪ -5s</button>
                        <button onClick={() => { if(audioRef.current) audioRef.current.playbackRate = 0.8 }} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '8px 15px', borderRadius: 99, cursor: 'pointer', fontWeight: 'bold' }}>0.8x</button>
                        <button onClick={() => { if(audioRef.current) audioRef.current.playbackRate = 1.0 }} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '8px 15px', borderRadius: 99, cursor: 'pointer', fontWeight: 'bold' }}>1.0x</button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ), [isFloating, episode])}

              {/* Placeholder when floating to maintain layout */}
              {isFloating && <div style={{ width: '100%', aspectRatio: '16/9', background: 'rgba(0,0,0,0.2)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>Player is pinned.</div>}
            </div>
            
          </div>

          <div style={{ height: 1, background: 'var(--line)', margin: '10px 0' }} />

          {/* Tags */}
          {episode.tags && episode.tags.length > 0 && (
            <div>
              <p style={{ fontSize: '0.75rem', color: '#C2824D', textTransform: 'uppercase', fontWeight: 900, margin: '0 0 16px', letterSpacing: '0.1em' }}>
                TAGS
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {episode.tags.map(tag => (
                  <span key={tag} style={{ background: '#EDE9FE', color: '#311F53', padding: '8px 16px', borderRadius: 99, fontWeight: 800, fontSize: '0.85rem' }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ height: 1, background: 'var(--line)', margin: '10px 0' }} />

          {/* Vocabulary */}
          {episode.vocabulary && episode.vocabulary.length > 0 && (
            <div>
              <p style={{ fontSize: '0.75rem', color: '#C2824D', textTransform: 'uppercase', fontWeight: 900, margin: '0 0 8px', letterSpacing: '0.1em' }}>
                VOCABULARY
              </p>
              <h2 style={{ fontSize: '2.2rem', fontFamily: '"Playfair Display", serif', margin: '0 0 30px', color: 'var(--text)', fontWeight: 800 }}>
                Key Words (Click to Flip)
              </h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
                {(episode.vocabulary || []).map((v, i) => {
                  const isFlipped = flippedVocab[i];
                  return (
                    <div 
                      key={i} 
                      onClick={() => toggleVocab(i)}
                      style={{ 
                        background: '#FAFAFA', 
                        border: '1px solid #E2E8F0', 
                        borderRadius: 24, 
                        padding: 30, 
                        minHeight: 140,
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.02)'
                      }}
                    >
                      {!isFlipped ? (
                        <>
                          <h4 style={{ margin: '0 0 8px', fontSize: '1.2rem', color: '#1E293B', fontWeight: 800 }}>{v.term}</h4>
                          <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Click to reveal</span>
                        </>
                      ) : (
                        <>
                          <h4 style={{ margin: '0 0 8px', fontSize: '1.2rem', color: '#4F46E5', fontWeight: 800 }}>{v.meaning}</h4>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Transcript */}
          {episode.transcript && (
            <>
              <div style={{ height: 1, background: 'var(--line)', margin: '10px 0' }} />
              <div>
                <p style={{ fontSize: '0.75rem', color: '#C2824D', textTransform: 'uppercase', fontWeight: 900, margin: '0 0 16px', letterSpacing: '0.1em' }}>
                  TRANSCRIPT (SCREENPLAY FORMAT)
                </p>
                <div style={{ background: '#fdfdfc', border: '1px solid #E2E8F0', borderRadius: 8, padding: '40px 20px', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.02)' }}>
                  <div className="screenplay-container" style={{ 
                    fontFamily: '"Courier New", Courier, monospace', 
                    color: '#000', 
                    fontSize: '1.1rem', 
                    lineHeight: 1.5, 
                    maxHeight: 600, 
                    overflowY: 'auto',
                    maxWidth: 700,
                    margin: '0 auto',
                    padding: '0 10px'
                  }}>
                    {(() => {
                      const text = typeof episode.transcript === 'string' ? episode.transcript : (episode.transcript.en || '');
                      if (!text) return null;
                      return text.split('\n').map((line, idx) => {
                        if (!line.trim()) return <div key={idx} style={{ height: 16 }} />;
                        
                        const colonIndex = line.indexOf(':');
                        if (colonIndex > 0 && colonIndex < 35) {
                          const character = line.substring(0, colonIndex).trim();
                          const dialogue = line.substring(colonIndex + 1).trim();
                          
                          return (
                            <div key={idx} style={{ marginBottom: 16 }}>
                              <div style={{ textAlign: 'center', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 2 }}>
                                {character}
                              </div>
                              <div style={{ width: '80%', margin: '0 auto' }}>
                                {dialogue}
                              </div>
                            </div>
                          );
                        }
                        
                        if (line.trim().startsWith('(') || line.trim().startsWith('[')) {
                          return (
                            <div key={idx} style={{ textAlign: 'center', fontStyle: 'italic', marginBottom: 16, color: '#475569' }}>
                              {line.trim()}
                            </div>
                          );
                        }
                        
                        return (
                          <div key={idx} style={{ marginBottom: 16, textTransform: (line === line.toUpperCase() && line.match(/[A-Z]/)) ? 'uppercase' : 'none' }}>
                            {line.trim()}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Questions Form */}
          {episode.questions && episode.questions.length > 0 && (
            <>
              <div style={{ height: 1, background: 'var(--line)', margin: '10px 0' }} />
              <div>
                <p style={{ fontSize: '0.75rem', color: '#C2824D', textTransform: 'uppercase', fontWeight: 900, margin: '0 0 8px', letterSpacing: '0.1em' }}>
                  QUESTIONS
                </p>
                <h2 style={{ fontSize: '2.2rem', fontFamily: '"Playfair Display", serif', margin: '0 0 30px', color: 'var(--text)', fontWeight: 800 }}>
                  Send your answers
                </h2>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <div style={{ background: '#FAFAFA', border: '1px solid #E2E8F0', borderRadius: 24, padding: '30px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <label style={{ fontWeight: 900, color: '#1E293B', fontSize: '1rem' }}>Name</label>
                    <textarea 
                      rows={1}
                      style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: 12, padding: 16, background: '#F8FAFC', fontSize: '1rem', outline: 'none', resize: 'vertical', color: '#1E293B' }}
                    />
                  </div>

                  {(episode.questions || []).map((q, i) => (
                    <div key={i} style={{ background: '#FAFAFA', border: '1px solid #E2E8F0', borderRadius: 24, padding: '30px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <label style={{ fontWeight: 900, color: '#1E293B', fontSize: '1.05rem' }}>
                        {i + 1}. {q.label}
                      </label>
                      <textarea 
                        rows={3}
                        value={answers[i] || ''}
                        onChange={(e) => setAnswers({ ...answers, [i]: e.target.value })}
                        style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: 12, padding: 16, background: '#F8FAFC', fontSize: '1rem', outline: 'none', resize: 'vertical', color: '#1E293B' }}
                      />
                    </div>
                  ))}
                </div>

                <button 
                  onClick={handleSubmit}
                  style={{ width: '100%', background: '#442b79', color: '#fff', padding: 20, borderRadius: 20, border: 'none', marginTop: 24, fontSize: '1.1rem', fontWeight: 800, cursor: 'pointer', transition: '0.2s', boxShadow: '0 8px 20px rgba(68, 43, 121, 0.2)' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.01)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  Submit Answers
                </button>
                <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: '0.9rem', marginTop: 12 }}>
                  Your answers will be sent to Teacher Yas.
                </p>
              </div>
            </>
          )}

          {/* Bottom Back Button */}
          <button 
            onClick={onBack} 
            style={{ alignSelf: 'flex-start', background: '#201633', border: 'none', color: '#fff', padding: '12px 28px', borderRadius: 99, cursor: 'pointer', fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8, marginTop: 20 }}
          >
            <span>←</span> Back to Library
          </button>

        </div>
      )}
    </div>
  );
}
