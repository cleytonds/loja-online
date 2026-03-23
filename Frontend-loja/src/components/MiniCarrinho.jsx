import { useContext } from "react";
import { CarrinhoContext } from "../context/CarrinhoContext";
import { useNavigate } from "react-router-dom";
import "./MiniCarrinho.css";

export default function MiniCarrinho() {

  const {
    carrinho,
    aberto,
    fecharCarrinho,
    removerDoCarrinho,
    aumentarQuantidade,
    diminuirQuantidade
  } = useContext(CarrinhoContext);

  const navigate = useNavigate();

  // 🔥 TOTAL SEGURO (NUNCA QUEBRA)
  const total = carrinho.reduce((acc, item) => {
    const preco = Number(item.preco) || 0;
    const quantidade = Number(item.quantidade) || 0;
    return acc + preco * quantidade;
  }, 0);

  return (
    <>
      {/* 🔹 Overlay */}
      <div
        className={`overlay ${aberto ? "ativo" : ""}`}
        onClick={fecharCarrinho}
      ></div>

      {/* 🔹 Drawer */}
      <div className={`drawer ${aberto ? "ativo" : ""}`}>

        {/* 🔹 Header */}
        <div className="drawer-header">
          <p>Seu Carrinho</p>
          <span onClick={fecharCarrinho}>✕</span>
        </div>

        {/* 🔹 Body */}
        <div className="drawer-body">

          {carrinho.length === 0 && (
            <p>Seu carrinho está vazio</p>
          )}

          {carrinho.map((item) => {

            const id = Number(item.id);
            const nome = item.nome;
            const imagem = item.imagem || "https://via.placeholder.com/60";
            const preco = Number(item.preco) || 0;
            const quantidade = Number(item.quantidade) || 0;

            return (
              <div key={id} className="item">

                <img src={imagem} alt={nome} />

                <div className="info">
                  <p className="nome">{nome}</p>

                  <p className="preco">
                    R$ {preco.toFixed(2)}
                  </p>

                  <div className="qtd-controle">
                    <button onClick={() => diminuirQuantidade(id)}>-</button>
                    <span>{quantidade}</span>
                    <button onClick={() => aumentarQuantidade(id)}>+</button>
                  </div>
                </div>

                <button
                  className="btn-remover"
                  onClick={() => removerDoCarrinho(id)}
                >
                  ✕
                </button>
              </div>
            );
          })}

        </div>

        {/* 🔹 Footer */}
        <div className="drawer-footer">

          <div className="total">
            <span>Total</span>
            <span>
              {isNaN(total)
                ? "R$ 0,00"
                : `R$ ${total.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2
                  })}`}
            </span>
          </div>

          <button
            className="btn-continuar"
            onClick={() => {
              fecharCarrinho();
              navigate("/produtos");
            }}
          >
            Continuar comprando
          </button>

          <button
            onClick={() => {
              fecharCarrinho();
              navigate("/carrinho");
            }}
          >
            Ver carrinho
          </button>

        </div>

      </div>
    </>
  );
}