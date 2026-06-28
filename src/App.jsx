import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import StudentHub from './pages/StudentHub';
import AdminHub from './pages/AdminHub';
import Flashcards from './pages/Flashcards';
import InstallPrompt from './components/InstallPrompt';
import Account from './pages/Account';
import Navbar from './components/layout/Navbar';

import StudentLayout from './components/layout/StudentLayout';
import Library from './pages/Library'; // We will create this

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
    </BrowserRouter>
  );
}

export default App;
