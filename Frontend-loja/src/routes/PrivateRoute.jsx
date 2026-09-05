// src/routes/PrivateRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function PrivateRoute({ children, adminOnly = false }) {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return <p role="status">Carregando...</p>;
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  if (adminOnly && user.tipo !== 'admin') return <Navigate to="/" replace />;

  return children;
}
