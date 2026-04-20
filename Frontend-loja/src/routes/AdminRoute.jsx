import { useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function AdminRoute({ children }) {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (user.tipo !== "admin") {
      navigate("/");
    }
  }, [user, navigate]);

  if (!user || user.tipo !== "admin") return null;

  return children;
}