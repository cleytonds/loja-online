// src/routes/PrivateRoute.jsx
import { Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function PrivateRoute({ children, adminOnly = false }) {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <p role="status">Carregando...</p>;
  }

  if (!user) return <Navigate to="/login" replace />;

  if (adminOnly && user.tipo !== 'admin') return <Navigate to="/" replace />;

  return children;
}