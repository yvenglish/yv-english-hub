import React, { Suspense } from 'react';
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

function PrivateRoute({ children, requireMaster }) {
  const { currentUser, userData } = useAuth();
  
  if (!currentUser) return <Navigate to="/login" />;
  if (requireMaster && userData?.role !== 'master') return <Navigate to="/" />;
  if (!requireMaster && userData?.role === 'master') return <Navigate to="/admin" />;
  
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <InstallPrompt />
      <Suspense fallback={
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: '#05002e', display: 'flex', justifyContent: 'center', 
          alignItems: 'center', zIndex: 9999 
        }}>
          <img 
            src="/logocircular.jpeg" 
            alt="Carregando..." 
            style={{
              width: 120, height: 120, borderRadius: '50%',
              animation: 'pulse 2s infinite',
              boxShadow: '0 0 30px rgba(200, 136, 58, 0.3)'
            }} 
          />
          <style>
            {`
              @keyframes pulse {
                0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(200, 136, 58, 0.7); }
                70% { transform: scale(1.05); box-shadow: 0 0 0 20px rgba(200, 136, 58, 0); }
                100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(200, 136, 58, 0); }
              }
            `}
          </style>
        </div>
      }>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Rotas do Aluno agrupadas no StudentLayout */}
          <Route element={<PrivateRoute><StudentLayout /></PrivateRoute>}>
            <Route path="/" element={<StudentHub />} />
            <Route path="/flashcards" element={<Flashcards />} />
            <Route path="/library" element={<Library />} />
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
