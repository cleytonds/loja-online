import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function ProtectedRoute({ children, tipoPermitido }) {
  const { user } = useContext(AuthContext);

  // Não está logado
  if (!user) {
    return <Navigate to="/login" />;
  }

  // Se precisa ser admin e não é
  if (tipoPermitido && user.tipo !== tipoPermitido) {
    return <Navigate to="/" />;
  }

  return children;
}