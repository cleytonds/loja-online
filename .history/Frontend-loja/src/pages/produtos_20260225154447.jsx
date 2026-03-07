import { useEffect, useState } from "react";
import api from "../services/api";
import "./produtos.css";

function Produtos() {
  const [produtos, setProdutos] = useState([]);

  useEffect(() => {
    api.get("/produtos").then(res => setProdutos(res.data));
  }, []);

  return (
    <div className="container">
      <h1>🛍️ Nossos Produtos</h1>

      <div className="grid">
        {produtos.map(produto => (
          <div className="card" key={produto.id}>
            <h2>{produto.nome}</h2>
            <p className="preco">R$ {produto.preco}</p>
            <p>Estoque: {produto.quantidade}</p>

            <button>Comprar</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Produtos;