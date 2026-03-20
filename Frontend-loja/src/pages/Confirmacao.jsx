import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Confirmacao() {

  const { token } = useParams();
  const navigate = useNavigate();

  const [codigo, setCodigo] = useState("");
  const [mensagem, setMensagem] = useState("");

  async function confirmar(e) {
    e.preventDefault();

    try {

      const res = await api.post("/auth/verificar-codigo", {
        token,
        codigo
      });

      localStorage.setItem("token", res.data.token);

      setMensagem("Conta confirmada com sucesso!");

      setTimeout(() => {
        navigate("/");
      }, 2000);

    } catch (err) {

      setMensagem("Código ou token inválido");

    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">

      <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md">

        <h1 className="text-2xl font-bold mb-6 text-center">
          Confirmar Cadastro
        </h1>

        <form onSubmit={confirmar} className="flex flex-col gap-4">

          <input
            type="text"
            placeholder="Digite o código do email"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            className="border p-2 rounded"
            required
          />

          <button
            className="bg-yellow-400 p-2 rounded font-bold"
          >
            Confirmar Conta
          </button>

        </form>

        {mensagem && (
          <p className="text-center mt-4">{mensagem}</p>
        )}

      </div>

    </div>
  );
}