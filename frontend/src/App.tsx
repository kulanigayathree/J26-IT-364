import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './auth/AuthContext';
import { AppLayout } from './components/Layouts';
import About from './pages/About';
import C1Page from './pages/c1/C1Page';
import C2Page from './pages/c2/C2Page';
import C3Page from './pages/c3/C3Page';
import C4Page from './pages/c4/C4Page';
import Dashboard from './pages/Dashboard';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';

/** Pages that need a login, shown inside the app navbar + footer. */
function Private({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/about" element={<About />} />
      <Route path="/dashboard" element={<Private><Dashboard /></Private>} />
      <Route path="/c1" element={<Private><C1Page /></Private>} />
      <Route path="/c2" element={<Private><C2Page /></Private>} />
      <Route path="/c3" element={<Private><C3Page /></Private>} />
      <Route path="/c4" element={<Private><C4Page /></Private>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
