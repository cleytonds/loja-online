import { createContext, useCallback, useEffect, useState } from 'react';
import api, { AUTH_NETWORK_TIMEOUT_MS } from '../services/api';
import {
  limparSessao,
  obterAccessToken,
  observarSessao,
  salvarSessao,
  salvarUsuario,
} from '../utils/authSession';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => observarSessao(({ type, usuario }) => {
    setUser(usuario || null);
    setSessionExpired(type === 'session-expired');
  }), []);

  useEffect(() => {
    let active = true;
    async function iniciarSessao() {
      const startupToken = obterAccessToken();
      if (!startupToken) {
        if (active) setLoading(false);
        return;
      }

      try {
        const { data: usuario } = await api.get('/auth/me', { timeout: AUTH_NETWORK_TIMEOUT_MS });
        if (!usuario) throw new Error('Usuario ausente');
        if (!active || obterAccessToken() !== startupToken) return;
        salvarSessao({ token: startupToken, usuario });

        try {
          if (!active || obterAccessToken() !== startupToken) return;
          const { data: upgraded } = await api.post('/auth/session/upgrade');
          if (active && obterAccessToken() === startupToken && upgraded?.token && upgraded?.usuario) {
            salvarSessao({ token: upgraded.token, usuario: upgraded.usuario });
          }
        } catch {
          // O upgrade e opcional enquanto o backend ainda opera sem refresh.
        }
      } catch (error) {
        if (active && obterAccessToken() === startupToken && error.response?.status === 401) {
          limparSessao('session-expired');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    iniciarSessao();
    return () => { active = false; };
  }, []);

  const login = useCallback((usuario, token) => {
    salvarSessao({ token, usuario });
  }, []);

  const atualizarUsuario = useCallback((usuarioAtualizado) => {
    salvarUsuario(usuarioAtualizado);
  }, []);

  const logout = useCallback(async () => {
    limparSessao('logout');
    try {
      await api.post('/auth/logout');
    } catch {
      // O logout local ja ocorreu mesmo quando a revogacao remota falhar.
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        atualizarUsuario,
        loading,
        sessionExpired,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
