// src/routes/PrivateRoute.jsx
import { Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export default function PrivateRoute({ children, adminOnly = false }) {
  const { user, loading } = useContext(AuthContext);

  // Enquanto carrega os dados do usuário, podemos mostrar nada ou um loading simples
  if (loading) return <p>Carregando...</p>;

  // Se não estiver logado, redireciona para login
  if (!user) return <Navigate to="/login" />;

  // Se for rota apenas para admin, mas o usuário não é admin, redireciona para home
  if (adminOnly && user.tipo !== "admin") return <Navigate to="/" />;

  // Caso tudo ok, renderiza os filhos
  return children;
}