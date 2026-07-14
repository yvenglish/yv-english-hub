import React, { Suspense, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import InstallPrompt from './components/InstallPrompt';
import Navbar from './components/layout/Navbar';
import StudentLayout from './components/layout/StudentLayout';

const Login = React.lazy(() => import('./pages/Login'));
const StudentHub = React.lazy(() => import('./pages/StudentHub'));
const AdminHub = React.lazy(() => import('./pages/AdminHub'));
const Flashcards = React.lazy(() => import('./pages/Flashcards'));
const Account = React.lazy(() => import('./pages/Account'));
const Library = React.lazy(() => import('./pages/Library'));
const Glossary = React.lazy(() => import('./pages/Glossary'));

function PrivateRoute({ children, requireMaster }) {
  const { currentUser, userData } = useAuth();
  
  if (!currentUser) return <Navigate to="/login" />;
  if (requireMaster && userData?.role !== 'master') return <Navigate to="/" />;
  if (!requireMaster && userData?.role === 'master') return <Navigate to="/admin" />;
  
  return children;
}

function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  const SplashContent = (
    <div style={{ 
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      background: '#15121b', display: 'flex', justifyContent: 'center', 
      alignItems: 'center', zIndex: 9999 
    }}>
      <img 
        src="/logocirculartransparente.png" 
        alt="" 
        style={{
          width: 140, height: 140,
          animation: 'pulse-transparent 2.5s infinite ease-in-out'
        }} 
      />
      <style>
        {`
          @keyframes pulse-transparent {
            0% { transform: scale(0.9); opacity: 0.7; }
            50% { transform: scale(1.05); opacity: 1; filter: drop-shadow(0 0 15px rgba(200, 136, 58, 0.4)); }
            100% { transform: scale(0.9); opacity: 0.7; }
          }
        `}
      </style>
    </div>
  );

  if (showSplash) {
    return SplashContent;
  }

  return (
    <BrowserRouter>
      <InstallPrompt />
      <Suspense fallback={SplashContent}>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Rotas do Aluno agrupadas no StudentLayout */}
          <Route element={<PrivateRoute><StudentLayout /></PrivateRoute>}>
            <Route path="/" element={<StudentHub />} />
            <Route path="/flashcards" element={<Flashcards />} />
            <Route path="/library" element={<Library />} />
            <Route path="/glossary" element={<Glossary />} />
          </Route>

          <Route path="/admin" element={<PrivateRoute requireMaster><AdminHub /></PrivateRoute>} />

          <Route path="/account" element={
            <PrivateRoute>
              <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                <Navbar />
                <Account />
              </div>
            </PrivateRoute>
          } />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
