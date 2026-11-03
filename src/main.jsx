import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { registerSW } from 'virtual:pwa-register'

console.log('YV English Hub - v1.0.1');

// Depois de um deploy, os arquivos das páginas mudam de nome. Quem estava com a versão antiga aberta
// tenta carregar um arquivo que não existe mais: recarrega uma vez para pegar a versão nova.
window.addEventListener('vite:preloadError', (event) => {
  const lastReload = Number(sessionStorage.getItem('chunkReloadAt') || 0);
  if (Date.now() - lastReload < 10000) return; // evita loop de reload
  event.preventDefault();
  sessionStorage.setItem('chunkReloadAt', String(Date.now()));
  window.location.reload();
});

// Auto update service worker immediately when a new version is detected
const updateSW = registerSW({
  onNeedRefresh() {
    updateSW(true)
  },
  onOfflineReady() {}
})

// Força o reload da página assim que o novo service worker assumir o controle
if ('serviceWorker' in navigator) {
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!reloading) {
      reloading = true;
      window.location.reload();
    }
  });
}
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </AuthProvider>
  </React.StrictMode>,
)
