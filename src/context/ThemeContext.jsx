import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

// Só guarda o tema quando o aluno troca no perfil. A chave antiga ('yv_theme') salvava o tema
// automaticamente e deixava gente presa no modo claro; ela é ignorada para todo mundo voltar ao escuro.
const STORAGE_KEY = 'yv_theme_choice';

const readSavedTheme = () => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => readSavedTheme() || 'dark');

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => setTheme(prev => {
    const next = prev === 'light' ? 'dark' : 'light';
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch { /* sem storage: vale só nesta sessão */ }
    return next;
  });

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
