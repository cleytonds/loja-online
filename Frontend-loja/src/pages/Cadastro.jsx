// src/pages/Carrinho.jsx

// ===============================
// IMPORTAÇÕES
// ===============================
import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { CarrinhoContext } from '../context/CarrinhoContext';
import api from '../services/api';
import './Carrinho.css';

// ===============================
// COMPONENTE PRINCIPAL
// ===============================
export default function Carrinho() {
  // ===============================
  // CONTEXTO DO CARRINHO
  // ===============================

  const { carrinho, removerDoCarrinho, aumentarQuantidade, diminuirQuantidade } =
    useContext(CarrinhoContext);

  // ===============================
  // NAVEGAÇÃO
  // ===============================

  const navigate = useNavigate();

  // ===============================
  // FORMATAÇÃO DE MOEDA
  // ===============================

  const formatarPreco = (valor) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);

  // ===============================
  // CALCULA TOTAL DA COMPRA
  // ===============================

  const total = carrinho.reduce(
    (acc, item) => acc + item.preco * item.quantidade,

    0,
  );

  // ===============================
  // FINALIZAR PEDIDO
  // ===============================

  async function finalizarCompra() {
    // verifica carrinho vazio

    if (carrinho.length === 0) {
      alert('Carrinho vazio');

      return;
    }

    // verifica autenticação

    const token = localStorage.getItem('token');

    if (!token) {
      navigate('/login');

      return;
    }

    try {
      // monta itens enviados para API

      const itensPedido = carrinho.map((item) => ({
        produto_id: item.produto_id,

        variacao_id: item.variacao_id,

        quantidade: item.quantidade,
      }));

      // envia pedido para backend

      await api.post(
        '/pedidos',

        {
          itens: itensPedido,
        },

        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      alert('Pedido criado com sucesso 🚀');

      navigate('/');
    } catch (err) {
      // captura erro do servidor

      console.log(err);

      alert('Erro ao finalizar compra');
    }
  }

  // ===============================
  // CARRINHO VAZIO
  // ===============================

  if (carrinho.length === 0) {
    return (
      <div className="carrinho-vazio">
        <h2>Seu carrinho está vazio 🛒</h2>

        <button onClick={() => navigate('/')}>Continuar comprando</button>
      </div>
    );
  }

  // ===============================
  // TELA DO CARRINHO
  // ===============================

  return (
    <div className="carrinho-container">
      {/* Título */}

      <h1 className="carrinho-titulo">Carrinho de compras</h1>

      {/* Lista dos produtos */}

      {carrinho.map((item) => (
        <div key={item.variacao_id} className="carrinho-item">
          {/* Informações do produto */}

          <div className="item-info">
            <img src={item.imagem} alt={item.nome} />

            <div>
              <h2>{item.nome}</h2>

              <p>
                {item.tamanho} • {item.cor}
              </p>

              <strong>{formatarPreco(item.preco)}</strong>
            </div>
          </div>

          {/* Controle de quantidade */}

          <div className="item-quantidade">
            <button onClick={() => diminuirQuantidade(item.variacao_id)}>-</button>

            <span>{item.quantidade}</span>

            <button onClick={() => aumentarQuantidade(item.variacao_id)}>+</button>
          </div>

          {/* Valores e remoção */}

          <div className="item-acoes">
            <strong>{formatarPreco(item.preco * item.quantidade)}</strong>

            <button onClick={() => removerDoCarrinho(item.variacao_id)}>Remover</button>
          </div>
        </div>
      ))}

      {/* Resumo da compra */}

      <div className="carrinho-resumo">
        <div className="resumo-linha">
          <span>Total</span>

          <span>{formatarPreco(total)}</span>
        </div>

        {/* Botão pagamento */}

        <button className="btn-finalizar" onClick={finalizarCompra}>
          Finalizar compra
        </button>
      </div>
    </div>
  );
}
