import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";

export default function ConfirmarEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState("confirmando");

  useEffect(() => {
    async function confirmar() {
      try {
        await api.get(`/confirmar/${token}`);
        setStatus("sucesso");
      } catch (err) {
        setStatus("erro");
      }
    }

    confirmar();
  }, [token]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-white p-6 rounded shadow text-center max-w-md">
        {status === "confirmando" && <p>⏳ Confirmando email...</p>}

        {status === "sucesso" && (
          <>
            <p className="text-green-600 font-semibold mb-4">
              ✅ Email confirmado com sucesso!
            </p>
            <Link to="/login" className="text-blue-600 underline">
              Ir para login
            </Link>
          </>
        )}

        {status === "erro" && (
          <p className="text-red-600 font-semibold">
            ❌ Token inválido ou expirado.
          </p>
        )}
      </div>
    </div>
  );
}