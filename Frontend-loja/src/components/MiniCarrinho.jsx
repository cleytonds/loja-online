import { useContext } from 'react';
import { CarrinhoContext } from '../context/CarrinhoContext';
import { useNavigate } from 'react-router-dom';
import './MiniCarrinho.css';
import ImagemProduto from './ImagemProduto.jsx';

export default function MiniCarrinho() {
  const {
    carrinho,
    aberto,
    fecharCarrinho,
    removerDoCarrinho,
    aumentarQuantidade,
    diminuirQuantidade,
  } = useContext(CarrinhoContext);

  const navigate = useNavigate();

  // 🔥 TOTAL SEGURO
  const total = carrinho.reduce((acc, item) => {
    const preco = Number(item.preco) || 0;
    const quantidade = Number(item.quantidade) || 0;
    return acc + preco * quantidade;
  }, 0);

  return (
    <>
      {/* OVERLAY */}
      <div className={`overlay ${aberto ? 'ativo' : ''}`} onClick={fecharCarrinho} />

      {/* DRAWER */}
      <div className={`drawer ${aberto ? 'ativo' : ''}`}>
        {/* HEADER */}
        <div className="drawer-header">
          <h3>Seu Carrinho</h3>
          <button className="close-btn" onClick={fecharCarrinho}>
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className="drawer-body">
          {carrinho.length === 0 && (
            <div className="carrinho-vazio">
              <p>Seu carrinho está vazio </p>
            </div>
          )}

          {carrinho.map((item) => {
            const id = item.variacao_id;
            const nome = item.nome;

            const preco = Number(item.preco) || 0;
            const quantidade = Number(item.quantidade) || 0;
            const estoque = Number(
              item.estoque ?? item.variacao?.estoque ?? item.produto?.estoque ?? 0,
            );

            return (
              <div key={id} className="item">
                {/* IMAGEM */}
                <ImagemProduto url={item.imagem} alt={nome} />

                {/* INFO */}
                <div className="info">
                  <p className="nome">{nome}</p>

                  <p className="variacao">
                    {item.cor || 'Sem cor'}
                    {' • '}
                    {item.tamanho || 'Sem tamanho'}
                  </p>

                  <p className="preco">R$ {preco.toFixed(2)}</p>

                  <small className="estoque">
                    {estoque <= 5
                      ? ` Últimas ${estoque} unidades`
                      : `${estoque} unidades disponíveis`}
                  </small>

                  {/* CONTROLE */}
                  <div className="qtd-controle">
                    <button onClick={() => diminuirQuantidade(id)}>−</button>

                    <span>{quantidade}</span>

                    <button onClick={() => aumentarQuantidade(id)} disabled={quantidade >= estoque}>
                      +
                    </button>
                  </div>
                </div>

                {/* REMOVER */}
                <button className="btn-remover" onClick={() => removerDoCarrinho(id)}>
                  ✕
                </button>
              </div>
            );
          })}
        </div>

        {/* FOOTER */}
        <div className="drawer-footer">
          <div className="total">
            <span>Total</span>
            <strong>
              R${' '}
              {total.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
              })}
            </strong>
          </div>

          <button
            className="btn-continuar"
            onClick={() => {
              fecharCarrinho();
              navigate('/produtos');
            }}
          >
            Continuar comprando
          </button>

          <button
            className="btn-ver-carrinho"
            onClick={() => {
              fecharCarrinho();
              navigate('/carrinho');
            }}
          >
            Ver carrinho
          </button>
        </div>
      </div>
    </>
  );
}
