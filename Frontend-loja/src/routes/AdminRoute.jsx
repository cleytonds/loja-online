import { useEffect, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

export default function AdminRoute({ children }) {
  const { user, logout } = useContext(AuthContext);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function validarAcesso() {
      if (!user) {
        setChecking(false);
        navigate('/login');
        return;
      }

      if (user.tipo !== 'admin') {
        setChecking(false);
        navigate('/');
        return;
      }

      try {
        const { data } = await api.get('/auth/me');

        if (!data || data.tipo !== 'admin') {
          logout();
          navigate('/login');
          return;
        }
      } catch (err) {
        logout();
        navigate('/login');
        return;
      } finally {
        setChecking(false);
      }
    }

    validarAcesso();
  }, [user, navigate, logout]);

  if (checking) return null;
  if (!user || user.tipo !== 'admin') return null;

  return children;
}