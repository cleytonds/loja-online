import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { CarrinhoContext } from "../context/CarrinhoContext";
import api from "../services/api";
import "./Carrinho.css";

export default function Carrinho() {

  // 🔥 pega dados do carrinho global
  const {
    carrinho,
    removerDoCarrinho,
    aumentarQuantidade,
    diminuirQuantidade
  } = useContext(CarrinhoContext);

  const navigate = useNavigate();

  // 💰 formata preço em real
  const formatarPreco = (valor) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);

  // 💰 calcula total do carrinho
  const total = carrinho.reduce(
    (acc, item) => acc + item.preco * item.quantidade,
    0
  );

  // =========================
  // 🧾 FINALIZAR COMPRA
  // =========================
  async function finalizarCompra() {

    // ❌ carrinho vazio
    if (carrinho.length === 0) {
      alert("Carrinho vazio");
      return;
    }

    const token = localStorage.getItem("token");

    // 🔐 usuário não logado
    if (!token) {
      navigate("/login");
      return;
    }

    try {

      // 📦 monta pedido com variações
      const itensPedido = carrinho.map(item => ({
        produto_id: item.produto_id,
        variacao_id: item.variacao_id,
        quantidade: item.quantidade
      }));

      // 📡 envia para backend
      await api.post(
        "/pedidos",
        { itens: itensPedido },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      alert("Pedido realizado com sucesso 🚀");

      navigate("/");

    } catch (err) {
      console.error(err);
      alert("Erro ao finalizar pedido");
    }
  }

  // =========================
  // 🛒 CARRINHO VAZIO
  // =========================
  if (carrinho.length === 0) {
    return (
      <div>
        <h2>Seu carrinho está vazio 🛒</h2>
      </div>
    );
  }

  return (
    <div className="carrinho-container">

      <h1>Carrinho de Compras</h1>

      {/* 🔁 lista itens do carrinho */}
      {carrinho.map(item => (
        <div key={item.variacao_id} className="carrinho-item">

          {/* 🖼 imagem do produto */}
          <img src={item.imagem} alt={item.nome} />

          <div>
            <h3>{item.nome}</h3>

            {/* 🎯 mostra variação */}
            <p>
              Tamanho: {item.tamanho} | Cor: {item.cor}
            </p>

            <p>{formatarPreco(item.preco)}</p>
          </div>

          {/* ➕➖ quantidade */}
          <div>
            <button onClick={() => diminuirQuantidade(item.variacao_id)}>
              -
            </button>

            <span>{item.quantidade}</span>

            <button onClick={() => aumentarQuantidade(item.variacao_id)}>
              +
            </button>
          </div>

          {/* 💰 total por item */}
          <div>
            {formatarPreco(item.preco * item.quantidade)}
          </div>

          {/* ❌ remover item */}
          <button onClick={() =>
            removerDoCarrinho(item.variacao_id)
          }>
            Remover
          </button>

        </div>
      ))}

      {/* 💰 total geral */}
      <h2>Total: {formatarPreco(total)}</h2>

      {/* 🧾 finalizar compra */}
      <button onClick={finalizarCompra}>
        Finalizar Compra
      </button>

    </div>
  );
}