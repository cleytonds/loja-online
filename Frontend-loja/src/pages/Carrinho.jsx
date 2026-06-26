import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { CarrinhoContext } from '../context/CarrinhoContext';
import api from '../services/api';
import './Carrinho.css';

export default function Carrinho() {
  const { carrinho, removerDoCarrinho, aumentarQuantidade, diminuirQuantidade } =
    useContext(CarrinhoContext);

  const navigate = useNavigate();

  const formatarPreco = (valor) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);

  const total = carrinho.reduce((acc, item) => acc + item.preco * item.quantidade, 0);

  async function finalizarCompra() {
    if (carrinho.length === 0) {
      alert('Carrinho vazio');
      return;
    }

    const token = localStorage.getItem('token');

    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const itensPedido = carrinho.map((item) => ({
        produto_id: item.produto_id,
        variacao_id: item.variacao_id,
        quantidade: item.quantidade,
      }));

      await api.post(
        '/pedidos',
        { itens: itensPedido },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      alert('Pedido realizado ');

      navigate('/');
    } catch (err) {
      console.log(err);

      alert('Erro ao finalizar');
    }
  }

  if (carrinho.length === 0) {
    return (
      <div className="carrinho-vazio">
        <h2>Seu carrinho está vazio </h2>

        <button onClick={() => navigate('/')}>Continuar comprando</button>
      </div>
    );
  }

  return (
    <div className="carrinho-container">
      <h1 className="carrinho-titulo">Carrinho de compras</h1>

      <div className="lista-carrinho">
        {carrinho.map((item) => (
          <div className="carrinho-item" key={item.variacao_id}>
            <div className="item-info">
              <img src={`${api.defaults.baseURL}${item.imagem}`} alt={item.nome} />

              <div>
                <h2>{item.nome}</h2>

                <p>
                  {item.tamanho} • {item.cor}
                </p>

                <strong>{formatarPreco(item.preco)}</strong>
              </div>
            </div>

            <div className="item-quantidade">
              <button onClick={() => diminuirQuantidade(item.variacao_id)}>-</button>

              <span>{item.quantidade}</span>

              <button onClick={() => aumentarQuantidade(item.variacao_id)}>+</button>
            </div>

            <div className="item-acoes">
              <strong>{formatarPreco(item.preco * item.quantidade)}</strong>

              <button onClick={() => removerDoCarrinho(item.variacao_id)}>Remover</button>
            </div>
          </div>
        ))}
      </div>

      <div className="carrinho-resumo">
        <div className="resumo-linha">
          <span>Total</span>

          <span>{formatarPreco(total)}</span>
        </div>

        <button className="btn-finalizar" onClick={finalizarCompra}>
          Finalizar compra
        </button>
      </div>
    </div>
  );
}
