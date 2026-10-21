import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './auth/AuthContext';
import C1Page from './pages/c1/C1Page';
import C2Page from './pages/c2/C2Page';
import C3Page from './pages/c3/C3Page';
import C4Page from './pages/c4/C4Page';
import Home from './pages/Home';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Home />} />
      <Route path="/register" element={<Home />} />
      <Route path="/dashboard" element={<Navigate to="/#models" replace />} />
      <Route path="/c1" element={<ProtectedRoute><C1Page /></ProtectedRoute>} />
      <Route path="/c2" element={<ProtectedRoute><C2Page /></ProtectedRoute>} />
      <Route path="/c3" element={<ProtectedRoute><C3Page /></ProtectedRoute>} />
      <Route path="/c4" element={<ProtectedRoute><C4Page /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
