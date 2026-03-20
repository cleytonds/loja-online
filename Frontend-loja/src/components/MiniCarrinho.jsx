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

  // total do carrinho seguro
  const total = carrinho.reduce((acc, item) => {
    const preco = Number(item?.preco) || 0;
    const quantidade = Number(item?.quantidade) || 1;
    return acc + preco * quantidade;
  }, 0);

  // não renderiza se estiver fechado
  if (!aberto) return null;

  return (
    <>
      {/* OVERLAY */}
      <div className="overlay" onClick={fecharCarrinho}></div>

      {/* DRAWER LATERAL */}
      <div className="drawer">

        {/* HEADER */}
        <div className="drawer-header">
          <p>Seu Carrinho</p>
          <span onClick={fecharCarrinho}>✕</span>
        </div>

        {/* BODY */}
        <div className="drawer-body">
          {carrinho.length === 0 && <p>Seu carrinho está vazio</p>}

          {carrinho.map((item, index) => {
            const id = item?.id ?? index;
            const nome = item?.nome ?? "Produto";
            const imagem = item?.imagem ?? "https://via.placeholder.com/60";
            const preco = Number(item?.preco) || 0;
            const cor = item?.cor || "Padrão";
            const tamanho = item?.tamanho || "Único";
            const quantidade = Number(item?.quantidade) || 1;

            return (
              <div key={id} className="item">

                {/* IMAGEM */}
                <img src={imagem} alt={nome} />

                {/* INFORMAÇÕES */}
                <div className="info">
                  <p className="nome">{nome}</p>
                  <p className="detalhes">Cor: {cor} | Tam: {tamanho}</p>
                  <p className="preco">R$ {(preco * quantidade).toFixed(2)}</p>

                  {/* CONTROLE DE QUANTIDADE */}
                  <div className="qtd-controle">
                    <button onClick={() => diminuirQuantidade(id)}>-</button>
                    <span>{quantidade}</span>
                    <button onClick={() => aumentarQuantidade(id)}>+</button>
                  </div>
                </div>

                {/* REMOVER ITEM */}
                <button className="btn-remover" onClick={() => removerDoCarrinho(id)}>✕</button>
              </div>
            );
          })}
        </div>

        {/* FOOTER */}
        <div className="drawer-footer">
          <div className="total">
            <span>Total</span>
            <span>R$ {total.toFixed(2)}</span>
          </div>

          {/* BOTÃO CONTINUAR COMPRANDO */}
          <button
            type="button"
            className="btn-continuar"
            onClick={() => {
              fecharCarrinho();       // fecha o drawer
              navigate("/produtos");  // navega para produtos
            }}
          >
            Continuar comprando
          </button>

          {/* BOTÃO VER CARRINHO */}
          <button
            type="button"
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