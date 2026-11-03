import { useState, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { TASK_TYPES, RUBRIC, RUBRIC_LEVELS, MAX_TEXT_LENGTH, MAX_AUDIO_SECONDS } from '../../data/production';

const boxStyle = { padding: 20, background: 'var(--cream)', borderRadius: 20, border: '1px solid var(--line)' };
const titleStyle = { fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 15, fontWeight: 800 };

// Tarefa de produção da semana: o aluno responde por escrito e/ou em áudio e a teacher corrige.
// O documento em "submissions" usa o mesmo id da semana (cada semana é de um aluno só).
export default function WeekTask({ week }) {
  const { currentUser, userData, recordStudy, activeCourseInfo } = useAuth();
  const task = week.task;
  const needsText = task?.type !== 'audio';
  const needsAudio = task?.type !== 'text';

  const [submission, setSubmission] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState('');
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [sending, setSending] = useState(false);

  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!task) return;
    getDoc(doc(db, 'submissions', week.id))
      .then(snap => setSubmission(snap.exists() ? snap.data() : null))
      .catch(err => console.error(err))
      .finally(() => setLoaded(true));
  }, [week.id, task]);

  // Libera o microfone e o timer se o modal fechar no meio da gravação
  useEffect(() => () => {
    clearInterval(timerRef.current);
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }, []);

  if (!task) return null;

  if (userData?.plan === 'Foundation') {
    return (
      <div>
        <h3 style={titleStyle}>Tarefa da Semana</h3>
        <div style={{ ...boxStyle, textAlign: 'center' }}>
          <span style={{ fontSize: '2rem' }}>🔒</span>
          <p style={{ margin: '10px 0 0', color: 'var(--muted)' }}>Responda tarefas e receba correção da teacher no plano <strong>Fluency</strong> ou superior.</p>
        </div>
      </div>
    );
  }

  const stopRecording = () => {
    clearInterval(timerRef.current);
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    setIsRecording(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let mimeType = 'audio/webm';
      if (typeof MediaRecorder.isTypeSupported === 'function' && !MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/mp4';
      }
      try {
        recorderRef.current = new MediaRecorder(stream, { mimeType });
      } catch {
        recorderRef.current = new MediaRecorder(stream); // Safari antigo
      }
      chunksRef.current = [];
      recorderRef.current.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorderRef.current.mimeType || mimeType });
        setAudioBlob(blob);
        setAudioPreviewUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      recorderRef.current.start();
      setSeconds(0);
      setIsRecording(true);
      timerRef.current = setInterval(() => {
        setSeconds(prev => {
          if (prev + 1 >= MAX_AUDIO_SECONDS) stopRecording();
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error(err);
      alert('Não foi possível acessar o microfone. Verifique as permissões do navegador.');
    }
  };

  const handleSubmit = async () => {
    if (needsText && !text.trim()) return alert('Escreva sua resposta antes de enviar.');
    if (needsAudio && !audioBlob) return alert('Grave seu áudio antes de enviar.');
    setSending(true);
    try {
      let audioUrl = null;
      let audioPath = null;
      if (audioBlob) {
        const ext = audioBlob.type.includes('mp4') ? 'mp4' : 'webm';
        audioPath = `submissions/${currentUser.uid}/${week.id}.${ext}`;
        const fileRef = ref(storage, audioPath);
        await uploadBytes(fileRef, audioBlob, { contentType: audioBlob.type });
        audioUrl = await getDownloadURL(fileRef);
      }
      const payload = {
        weekId: week.id,
        weekTitle: week.title || '',
        studentId: currentUser.uid,
        studentName: userData?.name || '',
        prompt: task.prompt,
        type: task.type,
        text: needsText ? text.trim() : null,
        audioUrl,
        audioPath,
        status: 'submitted',
        submittedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'submissions', week.id), payload);
      setSubmission(payload);
      await recordStudy(1);
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar a tarefa. Tente novamente.');
    }
    setSending(false);
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div>
      <h3 style={titleStyle}>Tarefa da Semana · {TASK_TYPES[task.type]}</h3>
      <div style={{ ...boxStyle, display: 'grid', gap: 16 }}>
        <p style={{ margin: 0, fontSize: '1.05rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{task.prompt}</p>

        {!loaded ? (
          <p style={{ margin: 0, color: 'var(--muted)' }}>Carregando...</p>
        ) : submission ? (
          <>
            {submission.text && (
              <div style={{ padding: 14, background: 'var(--paper)', borderRadius: 12, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{submission.text}</div>
            )}
            {submission.audioUrl && <audio controls src={submission.audioUrl} style={{ width: '100%' }} />}

            {submission.status === 'reviewed' && submission.feedback ? (
              <div style={{ padding: 16, background: 'var(--paper)', borderRadius: 12, border: '1px solid var(--amber)' }}>
                <p style={{ margin: '0 0 12px', fontWeight: 800, color: 'var(--amber)' }}>✨ Feedback da teacher</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginBottom: submission.feedback.comment ? 12 : 0 }}>
                  {RUBRIC.filter(r => submission.feedback[r.key]).map(r => (
                    <div key={r.key} style={{ fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--muted)' }}>{r.label}</span><br />
                      <strong>{'★'.repeat(submission.feedback[r.key])}{'☆'.repeat(3 - submission.feedback[r.key])}</strong> {RUBRIC_LEVELS[submission.feedback[r.key]]}
                    </div>
                  ))}
                </div>
                {submission.feedback.comment && <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{submission.feedback.comment}</p>}
              </div>
            ) : (
              <p style={{ margin: 0, color: 'var(--muted)', fontWeight: 600 }}>✅ Enviado! Aguardando a correção da teacher.</p>
            )}
          </>
        ) : (
          <>
            {needsText && (
              <div>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value.slice(0, MAX_TEXT_LENGTH))}
                  rows="5"
                  placeholder={activeCourseInfo.answerPlaceholder}
                  style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--text)', fontSize: '1rem', resize: 'vertical' }}
                />
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--muted)', textAlign: 'right' }}>{text.length}/{MAX_TEXT_LENGTH}</p>
              </div>
            )}

            {needsAudio && (
              <div style={{ display: 'grid', gap: 10 }}>
                {isRecording ? (
                  <button onClick={stopRecording} style={{ padding: 14, background: '#ff4757', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 800, cursor: 'pointer' }}>
                    ⏹ Parar gravação ({formatTime(seconds)} / {formatTime(MAX_AUDIO_SECONDS)})
                  </button>
                ) : (
                  <button onClick={startRecording} style={{ padding: 14, background: 'transparent', color: 'var(--plum)', border: '1px solid var(--plum)', borderRadius: 12, fontWeight: 800, cursor: 'pointer' }}>
                    🎙️ {audioBlob ? 'Gravar de novo' : 'Gravar áudio'} (até {MAX_AUDIO_SECONDS / 60} min)
                  </button>
                )}
                {audioPreviewUrl && !isRecording && <audio controls src={audioPreviewUrl} style={{ width: '100%' }} />}
              </div>
            )}

            <button onClick={handleSubmit} disabled={sending || isRecording} style={{ padding: 14, background: 'var(--plum)', color: '#fff', border: 'none', borderRadius: 999, fontWeight: 800, fontSize: '1rem', cursor: sending ? 'wait' : 'pointer', opacity: isRecording ? 0.5 : 1 }}>
              {sending ? 'Enviando...' : 'Enviar para a teacher'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
