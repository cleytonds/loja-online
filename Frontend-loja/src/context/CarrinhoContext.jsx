import { createContext, useState, useEffect } from 'react';
import { normalizarCaminhoImagem } from '../utils/imagem.js';

export const CarrinhoContext = createContext();

function normalizarImagemDoItem(item) {
  if (!item || typeof item !== 'object') return item;

  const proximo = { ...item };
  for (const campo of ['imagem', 'imagem_url', 'url_imagem', 'imagem_principal']) {
    if (!(campo in proximo)) continue;

    const normalizada = normalizarCaminhoImagem(proximo[campo]);
    if (normalizada.startsWith('blob:')) delete proximo[campo];
    else proximo[campo] = normalizada;
  }

  return proximo;
}

function carregarCarrinho() {
  try {
    const salvo = JSON.parse(localStorage.getItem('carrinho') || '[]');
    return Array.isArray(salvo) ? salvo.map(normalizarImagemDoItem) : [];
  } catch {
    return [];
  }
}

export function CarrinhoProvider({ children }) {
  const [carrinho, setCarrinho] = useState(carregarCarrinho);

  const [aberto, setAberto] = useState(false);

  // =========================
  // PERSISTÊNCIA
  // =========================
  useEffect(() => {
    localStorage.setItem('carrinho', JSON.stringify(carrinho));
  }, [carrinho]);

  // =========================
  // ABRIR / FECHAR GARANTIDO
  // =========================
  function abrirCarrinho() {
    setAberto(true);
  }

  function fecharCarrinho() {
    setAberto(false);
  }

  function toggleCarrinho() {
    setAberto((prev) => !prev);
  }

  // =========================
  // ADICIONAR
  // =========================
  function adicionarAoCarrinho(produto, variacao) {
    if (!produto || !variacao) return;

    const estoque = Number(variacao.estoque ?? 0);
    const preco = Number(variacao.preco ?? 0);

    if (estoque <= 0) return alert('Sem estoque');

    setCarrinho((prev) => {
      const id = String(variacao.id);

      const existe = prev.find((i) => String(i.variacao_id) === id);

      if (existe) {
        return prev.map((item) => {
          if (String(item.variacao_id) === id) {
            const novaQtd = item.quantidade + 1;

            if (novaQtd > item.estoque) {
              alert(`Estoque máximo: ${item.estoque}`);
              return item;
            }

            return { ...item, quantidade: novaQtd };
          }
          return item;
        });
      }

      return [
        ...prev,
        {
          produto_id: produto.id,
          variacao_id: variacao.id,
          nome: produto.nome,
          imagem: normalizarCaminhoImagem(produto.imagem_principal),
          preco,
          quantidade: Number(variacao.quantidade ?? 1),
          estoque,
          tamanho: variacao.tamanho,
          cor: variacao.cor,
        },
      ];
    });

    // 🔥 SEMPRE abre quando adiciona
    setAberto(true);
  }

  // =========================
  // REMOVER
  // =========================
  function removerDoCarrinho(id) {
    setCarrinho((prev) => prev.filter((item) => String(item.variacao_id) !== String(id)));
  }

  // =========================
  // QUANTIDADE
  // =========================
  function aumentarQuantidade(id) {
    setCarrinho((prev) =>
      prev.map((item) => {
        if (String(item.variacao_id) === String(id)) {
          if (item.quantidade >= item.estoque) return item;
          return { ...item, quantidade: item.quantidade + 1 };
        }
        return item;
      }),
    );
  }

  function diminuirQuantidade(id) {
    setCarrinho((prev) =>
      prev
        .map((item) =>
          String(item.variacao_id) === String(id)
            ? { ...item, quantidade: item.quantidade - 1 }
            : item,
        )
        .filter((i) => i.quantidade > 0),
    );
  }

  function limparCarrinho() {
    setCarrinho([]);
    localStorage.removeItem('carrinho');
    setAberto(false);
  }

  function restaurarPedidoExpirado(pedidoId, itensPedido) {
    const storageKey = 'pedidos_expirados_restaurados';
    const restaurados = new Set(JSON.parse(localStorage.getItem(storageKey) || '[]').map(String));
    const idNormalizado = String(pedidoId);

    if (restaurados.has(idNormalizado)) {
      return { restaurado: false, jaRestaurado: true, indisponiveis: 0 };
    }

    const itensValidos = Array.isArray(itensPedido)
      ? itensPedido.filter((item) =>
        Number.isInteger(Number(item?.produto_id))
        && Number.isInteger(Number(item?.variacao_id))
        && Number(item?.quantidade) > 0,
      )
      : [];

    let indisponiveis = 0;
    setCarrinho((anterior) => {
      const proximo = [...anterior];

      for (const item of itensValidos) {
        const variacaoId = Number(item.variacao_id);
        const estoque = Math.max(0, Number(item.estoque ?? 0));
        const quantidadeSolicitada = Number(item.quantidade);
        const indice = proximo.findIndex((existente) => Number(existente.variacao_id) === variacaoId);
        const quantidadeAtual = indice >= 0 ? Number(proximo[indice].quantidade || 0) : 0;
        const quantidadeDisponivel = Math.max(0, estoque - quantidadeAtual);
        const quantidadeParaRestaurar = Math.min(quantidadeSolicitada, quantidadeDisponivel);

        if (quantidadeParaRestaurar < quantidadeSolicitada) indisponiveis += quantidadeSolicitada - quantidadeParaRestaurar;
        if (quantidadeParaRestaurar <= 0) continue;

        if (indice >= 0) {
          proximo[indice] = {
            ...proximo[indice],
            quantidade: quantidadeAtual + quantidadeParaRestaurar,
            estoque,
          };
          continue;
        }

        proximo.push({
          produto_id: Number(item.produto_id),
          variacao_id: variacaoId,
          nome: item.nome,
          imagem: normalizarCaminhoImagem(item.imagem_principal),
          preco: Number(item.preco_atual ?? item.preco ?? 0),
          quantidade: quantidadeParaRestaurar,
          estoque,
          tamanho: item.tamanho,
          cor: item.cor,
        });
      }

      return proximo;
    });

    restaurados.add(idNormalizado);
    localStorage.setItem(storageKey, JSON.stringify([...restaurados]));
    setAberto(true);
    return { restaurado: true, jaRestaurado: false, indisponiveis };
  }

  return (
    <CarrinhoContext.Provider
      value={{
        carrinho,
        aberto,

        adicionarAoCarrinho,
        removerDoCarrinho,
        aumentarQuantidade,
        diminuirQuantidade,

        abrirCarrinho,
        fecharCarrinho,
        toggleCarrinho,
        limparCarrinho,
        restaurarPedidoExpirado,
      }}
    >
      {children}
    </CarrinhoContext.Provider>
  );
}
