import { createContext, useState, useEffect } from 'react';

export const CarrinhoContext = createContext();

export function CarrinhoProvider({ children }) {
  const [carrinho, setCarrinho] = useState(() => {
    const salvo = localStorage.getItem('carrinho');
    return salvo ? JSON.parse(salvo) : [];
  });

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
          imagem: produto.imagem_principal,
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
      }}
    >
      {children}
    </CarrinhoContext.Provider>
  );
}
