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

      if (!token) {
        setLoading(false);
        return;
      }

      // 🔥 evita piscar tela
      if (usuarioSalvo) {
        setUser(JSON.parse(usuarioSalvo));
      }

      try {
        const response = await api.get("/auth/me");

        setUser(response.data);
        localStorage.setItem("usuario", JSON.stringify(response.data));

      } catch (err) {
        console.log("Token inválido ou expirado");

        // 🔥 limpa tudo corretamente
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        localStorage.removeItem("tipoUsuario");

        setUser(null);
      } finally {
        setLoading(false); // 🔥 ESSENCIAL
      }
    }

    carregarUsuario();
  }, []);

  function login(usuario, token) {
    localStorage.setItem("token", token);
    localStorage.setItem("usuario", JSON.stringify(usuario));
    localStorage.setItem("tipoUsuario", usuario.tipo);

    setUser(usuario); // 🔥 sem spread desnecessário
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    localStorage.removeItem("tipoUsuario");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}