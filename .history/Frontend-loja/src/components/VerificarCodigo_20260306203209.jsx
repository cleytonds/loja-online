import { useState } from "react";
import api from "../services/api";

export default function VerificarCodigo() {

  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");

  async function verificar(e) {

    e.preventDefault();

    try {

      const res = await api.post("/auth/verificarCodigo", {
      email,
      codigo
      });

      alert(res.data.mensagem);

    } catch (err) {

      alert(err.response.data.error);

    }

  }

  return (

    <div>

      <h2>Confirmar Cadastro</h2>

      <form onSubmit={verificar}>

        <input
          type="email"
          placeholder="Seu email"
          onChange={e => setEmail(e.target.value)}
        />

        <input
          type="text"
          placeholder="Código de 6 dígitos"
          onChange={e => setCodigo(e.target.value)}
        />

        <button>Confirmar</button>

      </form>

    </div>

  );

}