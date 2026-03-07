import { useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";

export default function ConfirmarEmail() {
  const { token } = useParams();

  useEffect(() => {
    async function confirmar() {
      try {
        const res = await api.post("/auth/verificar-codigo", { codigo: token });
        alert(res.data.mensagem);
        window.location.href = "/login";
      } catch (err) {
        console.error(err);
        alert(err.response?.data?.mensagem || "Erro ao verificar o código.");
      }
    }

    confirmar();
  }, [token]);

  return (
    <div style={{ maxWidth: "400px", margin: "50px auto", textAlign: "center" }}>
      <h2>Confirmando seu email...</h2>
    </div>
  );
}