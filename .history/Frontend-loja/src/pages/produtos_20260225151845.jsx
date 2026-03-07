import { useEffect, useState } from "react";
import api from "../services/api";

function Produtos() {
  const [produtos, setProdutos] = useState([]);

  useEffect(() => {
    api.get("/produtos")
      .then(response => setProdutos(response.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div>
      <h1>Produtos</h1>
      {produtos.map(produto => (
        <p key={produto.id}>
          {produto.nome} - R$ {produto.preco}
        </p>
      ))}
    </div>
  );
}

export default Produtos;