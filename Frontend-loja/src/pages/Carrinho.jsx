import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { CarrinhoContext } from "../context/CarrinhoContext";
import api from "../services/api";
import "./Carrinho.css";

export default function Carrinho() {
  const { carrinho, removerDoCarrinho } = useContext(CarrinhoContext);
  const navigate = useNavigate();

  // formatar moeda
  const formatarPreco = (valor) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);
  };

  // total
  const total = carrinho.reduce((acc, item) => {
    return acc + Number(item.preco) * item.quantidade;
  }, 0);

  // FINALIZAR COMPRA
  async function finalizarCompra() {
    if (carrinho.length === 0) {
      alert("Seu carrinho está vazio");
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      alert("Faça login para finalizar a compra 🔐");
      navigate("/login");
      return;
    }

    try {
      const itensPedido = carrinho.map((item) => ({
        produto_id: item.id,
        quantidade: item.quantidade,
      }));

      await api.post(
        "/pedidos",
        { itens: itensPedido },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert("Pedido realizado com sucesso 🛍️");

      navigate("/");
    } catch (error) {
      console.error(error);
      alert("Erro ao finalizar pedido");
    }
  }

  // carrinho vazio
  if (carrinho.length === 0) {
    return (
      <div className="carrinho-vazio">
        <h2>Seu carrinho está vazio 🛒</h2>

        <button onClick={() => navigate("/produtos")}>
          Ver produtos
        </button>
      </div>
    );
  }

  return (
    <div className="carrinho-container">

      <h1 className="carrinho-titulo">
        Carrinho de Compras
      </h1>

      {carrinho.map((item) => (
        <div key={item.id} className="carrinho-item">

          {/* ESQUERDA */}
          <div className="item-info">
            <img src={item.imagem} alt={item.nome} />

            <div>
              <h2>{item.nome}</h2>
              <p>{formatarPreco(item.preco)}</p>
            </div>
          </div>

          {/* QUANTIDADE */}
          <div className="item-quantidade">
            <span>x{item.quantidade}</span>
          </div>

          {/* DIREITA */}
          <div className="item-acoes">
            <p>{formatarPreco(item.preco * item.quantidade)}</p>

            <button onClick={() => removerDoCarrinho(item.id)}>
              Remover
            </button>
          </div>

        </div>
      ))}

      {/* RESUMO */}
      <div className="carrinho-resumo">

        <div className="resumo-linha">
          <span>Total</span>
          <span>{formatarPreco(total)}</span>
        </div>

        <button
          onClick={finalizarCompra}
          className="btn-finalizar"
        >
          Finalizar Compra
        </button>

      </div>

    </div>
  );
}