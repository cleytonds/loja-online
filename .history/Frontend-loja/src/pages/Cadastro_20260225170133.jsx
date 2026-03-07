import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api.js";

export default function Cadastro() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const navigate = useNavigate();

  async function handleCadastro(e) {
    e.preventDefault();
    try {
      await api.post("/cadastro", { nome, email, senha });
      alert("Cadastro realizado com sucesso!");
      navigate("/login");
    } catch (err) {
      alert("Erro ao cadastrar");
    }
  }

  return (
    <div>
      <h1>Cadastro</h1>
      <form onSubmit={handleCadastro}>
        <input placeholder="Nome" onChange={(e) => setNome(e.target.value)} />
        <input
          type="email"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Senha"
          onChange={(e) => setSenha(e.target.value)}
        />
        <button type="submit">Cadastrar</button>
      </form>
    </div>
  );
}