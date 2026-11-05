// Funções e estilos compartilhados pelos jogos

// Toca o áudio gravado do item ou, sem ele, a voz do navegador no idioma do curso
export const speak = (text, lang, audioUrl) => {
  if (audioUrl) {
    new Audio(audioUrl).play().catch(() => {});
    return;
  }
  if ('speechSynthesis' in window && text) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    window.speechSynthesis.speak(u);
  }
};

export const cardStyle = { background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 24, padding: 30 };
export const pillButton = (active) => ({
  padding: '12px 18px', borderRadius: 14, border: `1px solid ${active ? 'var(--plum)' : 'var(--line)'}`,
  background: active ? 'var(--plum)' : 'var(--paper)', color: active ? '#fff' : 'var(--text)',
  fontWeight: 700, fontSize: '1rem', cursor: 'pointer', transition: '0.15s'
});
