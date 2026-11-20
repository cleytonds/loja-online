import { useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function AdminRoute({ children }) {
  const { user, loading } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate('/login', { replace: true });
    else if (user.tipo !== 'admin') navigate('/', { replace: true });
  }, [loading, user, navigate]);

  if (loading) return null;
  if (!user || user.tipo !== 'admin') return null;

  return children;
}
