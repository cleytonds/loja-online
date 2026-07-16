import { Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function ProtectedRoute({ children, tipoPermitido }) {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <p role="status">Carregando...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (tipoPermitido && user.tipo !== tipoPermitido) {
    return <Navigate to="/" replace />;
  }

  return children;
}