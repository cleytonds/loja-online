// src/context/AuthContext.jsx
import { createContext, useState, useEffect } from "react";
import api from "../services/api";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔑 função para logar o usuário
  async function login(usuario, token) {
    // Salva no localStorage
    localStorage.setItem("token", token);
    localStorage.setItem("usuario", JSON.stringify(usuario));
    localStorage.setItem("tipoUsuario", usuario.tipo);

    setUser(usuario);
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`; // seta token no axios
  }

  // 🔑 função para carregar usuário via token
  async function loadUser() {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.get("/auth/me", { // 🔥 corrigido para /auth/me
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(res.data);
    } catch (err) {
      console.error("Erro ao carregar usuário:", err);
      logout();
    } finally {
      setLoading(false);
    }
  }

  // 🔑 logout
  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    localStorage.removeItem("tipoUsuario");
    setUser(null);
    delete api.defaults.headers.common["Authorization"];
  }

  useEffect(() => {
    loadUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}