import { Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export default function ProtectedRoute({ children, tipoPermitido }) {
  const { user, loading } = useContext(AuthContext);

  // 🔒 Aguarda carregar o usuário
  if (loading) {
    return <p>Carregando...</p>;
  }

  // 🔒 Não logado
  if (!user) {
    return <Navigate to="/login" />;
  }

  // 🔒 Verifica tipo (admin, etc)
  if (tipoPermitido && user.tipo !== tipoPermitido) {
    return <Navigate to="/" />;
  }

  return children;
}