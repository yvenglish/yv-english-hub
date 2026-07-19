import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function VoiceLabPlayer({ challenge, onBack }) {
  const { recordVoiceLabProgress } = useAuth();
  
  const lines = challenge.lines || [];
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Status: 'step1_listen', 'step2_reveal', 'step3_record', 'step4_compare', 'finished'
  const [status, setStatus] = useState('step1_listen');
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const originalAudioRef = useRef(null);
  const recordedAudioRef = useRef(null);

  const [playbackRate, setPlaybackRate] = useState(1);
  const [isPlayingOrig, setIsPlayingOrig] = useState(false);
  const [isPlayingRec, setIsPlayingRec] = useState(false);

  const currentLine = lines[currentIndex];

  useEffect(() => {
    // Reset state when line changes
    setStatus('step1_listen');
    setRecordedBlobUrl(null);
    setPlaybackRate(1);
    setIsPlayingOrig(false);
    setIsPlayingRec(false);
    
    // Auto play original audio on new line
    if (originalAudioRef.current && currentIndex < lines.length) {
      originalAudioRef.current.playbackRate = 1;
      originalAudioRef.current.play().catch(() => {});
    }
  }, [currentIndex]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedBlobUrl(url);
        setStatus('step4_compare'); // Auto advance to compare
        stream.getTracks().forEach(track => track.stop()); // release microphone
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Não foi possível acessar o microfone. Verifique as permissões do navegador.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleAssessment = (color) => {
    if (color === 'red') {
      // Retry line
      setStatus('step1_listen');
      setRecordedBlobUrl(null);
    } else {
      // Advance
      if (currentIndex < lines.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        handleFinish();
      }
    }
  };

  const handleFinish = async () => {
    setStatus('finished');
    const result = await recordVoiceLabProgress(challenge.id);
    if (result?.earnedBadge) {
      // Could show a badge alert here
    }
  };

  const toggleOrigSpeed = () => {
    const newRate = playbackRate === 1 ? 0.75 : 1;
    setPlaybackRate(newRate);
    if (originalAudioRef.current) {
      originalAudioRef.current.playbackRate = newRate;
    }
  };

  const playAlternating = () => {
    if (!originalAudioRef.current || !recordedAudioRef.current) return;
    
    originalAudioRef.current.playbackRate = 1;
    originalAudioRef.current.play();
    
    originalAudioRef.current.onended = () => {
      setTimeout(() => {
        recordedAudioRef.current.play();
      }, 1000);
      originalAudioRef.current.onended = null;
    };
  };

  if (status === 'finished') {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', maxWidth: 800, margin: '0 auto' }}>
        <span style={{ fontSize: '5rem', display: 'block', marginBottom: 20 }}>🎉</span>
        <h1 style={{ color: 'var(--amber)', fontSize: '2.5rem', marginBottom: 20 }}>Desafio Concluído!</h1>
        <p style={{ color: 'var(--muted)', fontSize: '1.1rem', marginBottom: 40 }}>
          Você completou o desafio <strong>{challenge.title}</strong> e treinou sua pronúncia. Ótimo trabalho!
        </p>
        <button onClick={onBack} style={{ padding: '14px 40px', borderRadius: 99, background: 'var(--purple)', color: '#fff', fontSize: '1.1rem', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
          Voltar para a Biblioteca
        </button>
      </div>
    );
  }

  if (!currentLine) return null;

  // Calculate Progress (Line progress + sub-step progress)
  const totalLines = lines.length;
  const baseProgress = (currentIndex / totalLines) * 100;
  
  let stepMultiplier = 0;
  if (status === 'step1_listen') stepMultiplier = 0.25;
  if (status === 'step2_reveal') stepMultiplier = 0.50;
  if (status === 'step3_record') stepMultiplier = 0.75;
  if (status === 'step4_compare') stepMultiplier = 1.0;

  const stepProgress = (1 / totalLines) * 100 * stepMultiplier;
  const currentProgress = baseProgress + stepProgress;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '20px', minHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header & Progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 30 }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 40, height: 40, color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>
          ←
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontWeight: 'bold', color: 'var(--amber)' }}>{challenge.title}</span>
            <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Linha {currentIndex + 1} de {totalLines}</span>
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${currentProgress}%`, height: '100%', background: 'var(--purple)', transition: 'width 0.5s ease-out' }}></div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 30 }}>
        
        {/* Hidden Audio/Video elements */}
        {currentLine.audioUrl?.includes('.mp4') ? (
          <video 
            ref={originalAudioRef} 
            src={currentLine.audioUrl} 
            poster={challenge.coverImageUrl}
            onPlay={() => setIsPlayingOrig(true)}
            onPause={() => setIsPlayingOrig(false)}
            onEnded={() => setIsPlayingOrig(false)}
            style={{ width: '100%', maxHeight: 350, borderRadius: 16, objectFit: 'contain', background: 'transparent', marginBottom: 10, display: (status === 'step1_listen' || status === 'step4_compare') ? 'block' : 'none' }}
            controls={false}
          />
        ) : (
          <audio 
            ref={originalAudioRef} 
            src={currentLine.audioUrl} 
            onPlay={() => setIsPlayingOrig(true)}
            onPause={() => setIsPlayingOrig(false)}
            onEnded={() => setIsPlayingOrig(false)}
          />
        )}

        {/* Step 1: Listen */}
        {status === 'step1_listen' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 30, alignItems: 'center' }}>
            
            <div style={{ width: '100%', background: 'var(--paper)', padding: 30, borderRadius: 20, border: '1px solid var(--line)', textAlign: 'center' }}>
              <p style={{ color: 'var(--muted)', fontSize: '1.2rem', fontStyle: 'italic', margin: 0 }}>
                "{currentLine.translation}"
              </p>
            </div>

            <div style={{ display: 'flex', gap: 15, alignItems: 'center', justifyContent: 'center' }}>
              <button 
                onClick={() => originalAudioRef.current?.play()}
                style={{ background: 'var(--purple)', color: '#fff', border: 'none', padding: '15px 30px', borderRadius: 99, fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center' }}
              >
                {isPlayingOrig ? '🔊 Ouvindo...' : '▶️ Ouvir Cena'}
              </button>
              <button 
                onClick={toggleOrigSpeed}
                style={{ background: 'transparent', border: '1px solid var(--line)', color: 'var(--muted)', padding: '10px 20px', borderRadius: 99, cursor: 'pointer' }}
              >
                {playbackRate}x
              </button>
            </div>
            
            <button 
              onClick={() => setStatus('step2_reveal')}
              style={{ background: '#ffffff', color: '#0d071a', border: 'none', padding: '15px 40px', borderRadius: 99, fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', marginTop: 20 }}
            >
              Próximo: Ver o texto em Inglês →
            </button>
          </div>
        )}

        {/* Step 2: Reveal English Text */}
        {status === 'step2_reveal' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 30, alignItems: 'center' }}>
            <div style={{ width: '100%', background: 'var(--bg)', padding: 40, borderRadius: 20, border: '2px dashed var(--purple)', textAlign: 'center' }}>
              <h2 style={{ fontSize: '2.2rem', color: '#fff', margin: 0, fontFamily: '"Playfair Display", serif' }}>
                {currentLine.originalText}
              </h2>
            </div>
            
            <button 
              onClick={() => setStatus('step3_record')}
              style={{ background: '#ffffff', color: '#0d071a', border: 'none', padding: '15px 40px', borderRadius: 99, fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Próximo: Gravar minha voz →
            </button>
          </div>
        )}

        {/* Step 3: Record */}
        {status === 'step3_record' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 30, alignItems: 'center' }}>
            
            <div style={{ width: '100%', background: 'var(--bg)', padding: 40, borderRadius: 20, border: '2px dashed var(--line)', textAlign: 'center', opacity: isRecording ? 0.2 : 1, filter: isRecording ? 'blur(8px)' : 'none', transition: 'all 0.3s' }}>
              <h2 style={{ fontSize: '2.2rem', color: isRecording ? 'var(--muted)' : '#fff', margin: 0, fontFamily: '"Playfair Display", serif' }}>
                {currentLine.originalText}
              </h2>
            </div>

            <div style={{ background: 'var(--paper)', padding: 30, borderRadius: 20, border: '1px solid var(--line)', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
              {!isRecording ? (
                <button 
                  onClick={startRecording}
                  style={{ background: '#ff4757', color: '#fff', border: 'none', padding: '20px 40px', borderRadius: 99, fontSize: '1.3rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center', boxShadow: '0 10px 20px rgba(255, 71, 87, 0.3)' }}
                >
                  🎙️ Gravar Minha Voz
                </button>
              ) : (
                <>
                  <div className="recording-pulse" style={{ fontSize: '4rem', animation: 'pulse 1.5s infinite' }}>🎙️</div>
                  <p style={{ color: '#ff4757', fontWeight: 'bold', margin: 0 }}>Gravando...</p>
                  <button 
                    onClick={stopRecording}
                    style={{ background: '#ffffff', color: '#0d071a', border: 'none', padding: '15px 40px', borderRadius: 99, fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Parar e Comparar
                  </button>
                  <style>{`
                    @keyframes pulse {
                      0% { transform: scale(0.95); opacity: 0.8; }
                      50% { transform: scale(1.1); opacity: 1; filter: drop-shadow(0 0 10px #ff4757); }
                      100% { transform: scale(0.95); opacity: 0.8; }
                    }
                  `}</style>
                </>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Compare */}
        {status === 'step4_compare' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 30, alignItems: 'center' }}>
            <div style={{ width: '100%', background: 'var(--bg)', padding: 30, borderRadius: 20, border: '1px solid var(--line)', textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.8rem', color: '#fff', margin: 0, fontFamily: '"Playfair Display", serif' }}>
                {currentLine.originalText}
              </h2>
            </div>

            <div style={{ width: '100%', background: 'var(--paper)', padding: 30, borderRadius: 20, border: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 30 }}>
              
              <audio 
                ref={recordedAudioRef} 
                src={recordedBlobUrl} 
                onPlay={() => setIsPlayingRec(true)}
                onPause={() => setIsPlayingRec(false)}
                onEnded={() => setIsPlayingRec(false)}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div style={{ background: 'var(--bg)', padding: 20, borderRadius: 16, textAlign: 'center' }}>
                  <p style={{ color: 'var(--muted)', margin: '0 0 15px', fontSize: '0.9rem' }}>Áudio Original</p>
                  <button 
                    onClick={() => { originalAudioRef.current.playbackRate = 1; originalAudioRef.current?.play(); }}
                    style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: 8, width: '100%', cursor: 'pointer' }}
                  >
                    ▶️ Ouvir Cena
                  </button>
                </div>
                
                <div style={{ background: 'rgba(138, 124, 255, 0.1)', padding: 20, borderRadius: 16, textAlign: 'center', border: '1px solid rgba(138, 124, 255, 0.2)' }}>
                  <p style={{ color: 'var(--purple)', margin: '0 0 15px', fontSize: '0.9rem', fontWeight: 'bold' }}>Sua Gravação</p>
                  <button 
                    onClick={() => recordedAudioRef.current?.play()}
                    style={{ background: 'var(--purple)', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: 8, width: '100%', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    ▶️ Ouvir Minha Versão
                  </button>
                </div>
              </div>

              <button 
                onClick={playAlternating}
                style={{ background: 'transparent', border: '1px solid var(--amber)', color: 'var(--amber)', padding: '15px', borderRadius: 12, fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}
              >
                🔁 Cara a Cara (Original → Sua Voz)
              </button>

              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 20 }}>
                <h3 style={{ textAlign: 'center', color: '#fff', margin: '0 0 20px' }}>Como você avalia sua repetição?</h3>
                <div style={{ display: 'flex', gap: 15, justifyContent: 'center' }}>
                  <button onClick={() => handleAssessment('red')} style={{ flex: 1, padding: '15px', background: 'rgba(255, 71, 87, 0.1)', border: '1px solid #ff4757', color: '#ff4757', borderRadius: 12, fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}>
                    🔴 Tentar Novamente
                  </button>
                  <button onClick={() => handleAssessment('yellow')} style={{ flex: 1, padding: '15px', background: 'rgba(255, 165, 2, 0.1)', border: '1px solid #ffa502', color: '#ffa502', borderRadius: 12, fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}>
                    🟡 Quase Lá
                  </button>
                  <button onClick={() => handleAssessment('green')} style={{ flex: 1, padding: '15px', background: 'rgba(46, 213, 115, 0.1)', border: '1px solid #2ed573', color: '#2ed573', borderRadius: 12, fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}>
                    🟢 Mandou Bem!
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
