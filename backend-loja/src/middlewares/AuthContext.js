import { createContext, useState, useEffect } from "react";
import api from "../services/api";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarUsuario() {
      const token = localStorage.getItem("token");
      const usuarioSalvo = localStorage.getItem("usuario");

      // 🔥 Se não tem token → não está logado
      if (!token) {
        setLoading(false);
        return;
      }

      // 🔥 Se já tem usuário salvo → usa ele primeiro (evita tela piscando)
      if (usuarioSalvo) {
        setUser(JSON.parse(usuarioSalvo));
      }

      try {
        const response = await api.get("/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // 🔥 Atualiza com dados reais do backend
        setUser(response.data);
        localStorage.setItem("usuario", JSON.stringify(response.data));

      } catch (err) {
        console.log("Token inválido ou expirado");
        logout();
      } finally {
        setLoading(false);
      }
    }

    carregarUsuario();
  }, []);

  function login(usuario, token) {
    // 🔥 função padrão de login (opcional usar)
    localStorage.setItem("token", token);
    localStorage.setItem("usuario", JSON.stringify(usuario));
    localStorage.setItem("tipoUsuario", usuario.tipo);

    setUser(usuario);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    localStorage.removeItem("tipoUsuario");
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        login,   // 🔥 agora disponível globalmente
        logout,
        loading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}