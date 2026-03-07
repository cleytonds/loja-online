import { useEffect, useState } from "react";
import api from "../services/api.js";

export default function Carrinho() {
  const [itens, setItens] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    api.get("/carrinho", { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setItens(res.data))
      .catch(err => console.log(err));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">🛒 Meu Carrinho</h1>
      {itens.length === 0 && <p>Carrinho vazio</p>}
      <ul>
        {itens.map(item => (
          <li key={item.id}>
            {item.nome} - R$ {item.preco} x {item.quantidade}
          </li>
        ))}
      </ul>
    </div>
  );
}