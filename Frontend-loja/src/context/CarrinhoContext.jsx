import { createContext, useState, useEffect } from 'react';

export const CarrinhoContext = createContext();

export function CarrinhoProvider({ children }) {
  const [carrinho, setCarrinho] = useState(() => {
    const salvo = localStorage.getItem('carrinho');
    return salvo ? JSON.parse(salvo) : [];
  });

  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    localStorage.setItem('carrinho', JSON.stringify(carrinho));
  }, [carrinho]);

  // =========================
  // ADICIONAR PRODUTO
  // =========================
  function adicionarAoCarrinho(produto, variacao) {
    setCarrinho((prev) => {
      const variacaoId = String(variacao.id);

      const existe = prev.find((item) => String(item.variacao_id) === variacaoId);

      if (existe) {
        return prev.map((item) =>
          String(item.variacao_id) === variacaoId
            ? {
                ...item,
                quantidade: item.quantidade + 1,
              }
            : item,
        );
      }

      return [
        ...prev,
        {
          produto_id: produto.id,
          variacao_id: variacao.id,

          nome: produto.nome,

          imagem: produto.imagem_principal,

          preco: Number(variacao.preco),

          quantidade: 1,

          // 🔥 AQUI É O LUGAR CERTO
          estoque: Number(variacao.estoque || produto.estoque || 0),
        },
      ];
    });

    setAberto(true);
  }

  // =========================
  // REMOVER ITEM
  // =========================
  function removerDoCarrinho(variacao_id) {
    const id = String(variacao_id);

    setCarrinho((prev) => prev.filter((item) => String(item.variacao_id) !== id));
  }

  // =========================
  // AUMENTAR
  // =========================
  function aumentarQuantidade(variacao_id) {
    const id = String(variacao_id);

    setCarrinho((prev) =>
      prev.map((item) =>
        String(item.variacao_id) === id
          ? {
              ...item,
              quantidade: (item.quantidade || 1) + 1,
            }
          : item,
      ),
    );
  }

  // =========================
  // DIMINUIR
  // =========================
  function diminuirQuantidade(variacao_id) {
    const id = String(variacao_id);

    setCarrinho((prev) =>
      prev
        .map((item) =>
          String(item.variacao_id) === id
            ? {
                ...item,
                quantidade: (item.quantidade || 1) - 1,
              }
            : item,
        )
        .filter((item) => item.quantidade > 0),
    );
  }

  function abrirCarrinho() {
    setAberto(true);
  }

  function fecharCarrinho() {
    setAberto(false);
  }

  function toggleCarrinho() {
    setAberto((prev) => !prev);
  }

  return (
    <CarrinhoContext.Provider
      value={{
        carrinho,
        adicionarAoCarrinho,
        removerDoCarrinho,
        aumentarQuantidade,
        diminuirQuantidade,

        abrirCarrinho,
        fecharCarrinho,
        toggleCarrinho,

        aberto,
      }}
    >
      {children}
    </CarrinhoContext.Provider>
  );
}
