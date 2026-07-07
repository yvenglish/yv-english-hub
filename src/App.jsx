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
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--cream)', color: 'var(--text)' }}>
          Carregando...
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
