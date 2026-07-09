import { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /**
   *  BOOTSTRAP DE AUTENTICAÇÃO
   * Sempre valida sessão no backend (/auth/me)
   * O localStorage serve apenas como suporte, nunca como fonte de verdade
   */
  useEffect(() => {
    async function carregarUsuario() {
      const token = localStorage.getItem('token');

      //  Sem token = usuário deslogado
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        /**
         *  Fonte da verdade sempre é o backend
         * Nunca confiar apenas em localStorage
         */
        const response = await api.get('/auth/me');

        setUser(response.data);

        //  Cache opcional (apenas para evitar flicker visual)
        localStorage.setItem('usuario', JSON.stringify(response.data));
      } catch (err) {
        console.log('Token inválido ou expirado');

        /**
         *  Limpeza total de segurança
         * Remove qualquer vestígio de sessão inválida
         */
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        localStorage.removeItem('tipoUsuario');

        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    carregarUsuario();
  }, []);

  /**
   *  LOGIN
   * Salva token e usuário localmente + atualiza estado global
   */
  function login(usuario, token) {
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify(usuario));
    localStorage.setItem('tipoUsuario', usuario.tipo);

    setUser(usuario);
  }

  /**
   *  LOGOUT PROFISSIONAL
   * Remove tudo e garante que UI seja resetada imediatamente
   */
  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('tipoUsuario');

    //  ESSENCIAL: limpa estado global imediatamente
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user, // usuário logado
        login, // função de login
        logout, // função de logout
        loading, // estado de carregamento inicial
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
