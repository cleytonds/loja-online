import { createContext, useState, useEffect } from "react";

// 🔹 Cria o contexto do carrinho
export const CarrinhoContext = createContext();

export function CarrinhoProvider({ children }) {

  // 🔥 Estado principal do carrinho (vem do localStorage)
  const [carrinho, setCarrinho] = useState(() => {
    const salvo = localStorage.getItem("carrinho");
    return salvo ? JSON.parse(salvo) : [];
  });

  // 🔹 controla abertura do carrinho lateral/modal
  const [aberto, setAberto] = useState(false);

  // 💾 sempre salva o carrinho no navegador
  useEffect(() => {
    localStorage.setItem("carrinho", JSON.stringify(carrinho));
  }, [carrinho]);

  // =========================
  // ➕ ADICIONAR PRODUTO COM VARIAÇÃO
  // =========================
  function adicionarAoCarrinho(produto, variacao) {

    setCarrinho(prev => {

      // 🔎 verifica se essa variação já existe no carrinho
      const existe = prev.find(
        item => item.variacao_id === variacao.id
      );

      // 🔁 se já existe, só aumenta quantidade
      if (existe) {
        return prev.map(item =>
          item.variacao_id === variacao.id
            ? { ...item, quantidade: item.quantidade + 1 }
            : item
        );
      }

      // 🆕 se não existe, adiciona novo item no carrinho
      return [
        ...prev,
        {
          // IDs importantes para backend
          produto_id: produto.id,
          variacao_id: variacao.id,

          // dados para exibir no front
          nome: produto.nome,
          imagem: produto.imagem,

          // variação selecionada
          tamanho: variacao.tamanho,
          cor: variacao.cor,

          // preço da variação (não do produto base)
          preco: Number(variacao.preco),

          // quantidade inicial
          quantidade: 1
        }
      ];
    });

    // 🔥 abre carrinho automaticamente
    setAberto(true);
  }

  // =========================
  // ❌ REMOVER ITEM
  // =========================
  function removerDoCarrinho(variacao_id) {
    setCarrinho(prev =>
      prev.filter(item => item.variacao_id !== variacao_id)
    );
  }

  // =========================
  // ➕ AUMENTAR QUANTIDADE
  // =========================
  function aumentarQuantidade(variacao_id) {
    setCarrinho(prev =>
      prev.map(item =>
        item.variacao_id === variacao_id
          ? { ...item, quantidade: item.quantidade + 1 }
          : item
      )
    );
  }

  // =========================
  // ➖ DIMINUIR QUANTIDADE
  // =========================
  function diminuirQuantidade(variacao_id) {
    setCarrinho(prev =>
      prev
        .map(item =>
          item.variacao_id === variacao_id
            ? { ...item, quantidade: item.quantidade - 1 }
            : item
        )
        // ❌ remove se quantidade chegar a 0
        .filter(item => item.quantidade > 0)
    );
  }

  // =========================
  // 🔓 ABRIR CARRINHO
  // =========================
  function abrirCarrinho() {
    setAberto(true);
  }

  // =========================
  // 🔒 FECHAR CARRINHO
  // =========================
  function fecharCarrinho() {
    setAberto(false);
  }

  // =========================
  // 🔁 TOGGLE (abre/fecha)
  // =========================
  function toggleCarrinho() {
    setAberto(prev => !prev);
  }

  return (
    <CarrinhoContext.Provider value={{

      carrinho,
      adicionarAoCarrinho,
      removerDoCarrinho,
      aumentarQuantidade,
      diminuirQuantidade,

      abrirCarrinho,
      fecharCarrinho,
      toggleCarrinho,

      aberto

    }}>
      {children}
    </CarrinhoContext.Provider>
  );
}