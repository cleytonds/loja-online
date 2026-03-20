import { createContext, useState } from "react";


export const CarrinhoContext = createContext();

export function CarrinhoProvider({ children }) {
  const [carrinho, setCarrinho] = useState([]);
  const [aberto, setAberto] = useState(false);

  // Adicionar produto
  function adicionarAoCarrinho(produto) {
  setCarrinho(prev => {
    const existe = prev.find(p => p.id === produto.id);
    if (existe) {
      return prev.map(p => p.id === produto.id ? { ...p, quantidade: p.quantidade + 1 } : p);
    }
    return [...prev, { ...produto, quantidade: 1 }];
  });
  }

  // Remover produto
  function removerDoCarrinho(id) {
    setCarrinho((prev) => prev.filter((p) => p.id !== id));
  }

  // Aumentar quantidade
  function aumentarQuantidade(id) {
    setCarrinho((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, quantidade: p.quantidade + 1 } : p
      )
    );
  }

  // Diminuir quantidade
  function diminuirQuantidade(id) {
    setCarrinho((prev) =>
      prev
        .map((p) =>
          p.id === id
            ? { ...p, quantidade: p.quantidade - 1 }
            : p
        )
        .filter((p) => p.quantidade > 0) // remove se chegar a 0
    );
  }

  // Abrir carrinho
  function abrirCarrinho() {
    setAberto(true);
  }

  // Fechar carrinho
  function fecharCarrinho() {
    setAberto(false);
  }

  // Alterna entre abrir/fechar
  function toggleCarrinho() {
    setAberto((prev) => !prev);
  }

  return (
    <CarrinhoContext.Provider
      value={{
        carrinho,
        setCarrinho,
        adicionarAoCarrinho,
        removerDoCarrinho,
        aumentarQuantidade,
        diminuirQuantidade,
        abrirCarrinho,
        fecharCarrinho,
        toggleCarrinho, // ✅ aqui
        aberto,
      }}
    >
      {children}
    </CarrinhoContext.Provider>
  );
}