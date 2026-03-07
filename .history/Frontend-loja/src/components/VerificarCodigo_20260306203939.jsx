import { useState } from "react";
import api from "../services/api"; // seu arquivo de configuração do axios

export default function VerificarCodigo() {
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");

  async function verificar(e) {
    e.preventDefault();

    try {
      const res = await api.post("/auth/verificarCodigo", {
      email: localStorage.getItem("emailCadastro"),
      codigo
      });

      // Mostra a mensagem do servidor e redireciona
      alert(res.data.mensagem);
      window.location.href = "/login";

    } catch (err) {
      console.error(err);
      alert(
        err.response?.data?.mensagem ||
          "Ocorreu um erro ao verificar o código."
      );
    }
  }

  return (
    <div style={{ maxWidth: "400px", margin: "0 auto" }}>
      <h2>Verificar Código</h2>
      <form onSubmit={verificar}>
        <div>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Código:</label>
          <input
            type="text"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            required
          />
        </div>
        <button type="submit">Verificar</button>
      </form>
    </div>
  );
}