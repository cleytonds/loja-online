import { Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export default function PrivateRoute({ children, adminOnly = false }) {
  const { user, loading } = useContext(AuthContext);

  // 🔥 evita travamento infinito
  if (loading) {
    return <p style={{ textAlign: "center", marginTop: "50px" }}>Carregando...</p>;
  }

  // não logado
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // só admin pode acessar
  if (adminOnly && user.tipo !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
}