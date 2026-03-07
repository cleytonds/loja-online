import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";

export default function Confirmacao() {
  const { token } = useParams();
  const [status, setStatus] = useState("confirmando"); // "confirmando", "sucesso", "erro"

  useEffect(() => {
    async function confirmar() {
      try {
        await api.get(`/auth/confirmar/${token}`);
        setStatus("sucesso");
      } catch (err) {
        setStatus("erro");
      }
    }
    confirmar();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md text-center">
        {status === "confirmando" && <p>Confirmando seu email...</p>}

        {status === "sucesso" && (
          <>
            <h1 className="text-2xl font-bold mb-4">Email confirmado ✅</h1>
            <p className="mb-6">Sua conta foi ativada. Agora você pode fazer login!</p>
            <Link
              to="/login"
              className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800"
            >
              Ir para Login
            </Link>
          </>
        )}

        {status === "erro" && (
          <>
            <h1 className="text-2xl font-bold mb-4 text-red-500">Erro ❌</h1>
            <p className="mb-6">Token inválido ou expirado.</p>
            <Link
              to="/cadastro"
              className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800"
            >
              Voltar para Cadastro
            </Link>
          </>
        )}
      </div>
    </div>
  );
}