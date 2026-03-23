import { createContext, useState, useEffect } from "react";

// 🔹 Cria o contexto
export const CarrinhoContext = createContext();

export function CarrinhoProvider({ children }) {

  // 🔥 CARREGAR DO LOCALSTORAGE
  const [carrinho, setCarrinho] = useState(() => {
    const carrinhoSalvo = localStorage.getItem("carrinho");
    return carrinhoSalvo ? JSON.parse(carrinhoSalvo) : [];
  });

  // 🔹 Controle abrir/fechar
  const [aberto, setAberto] = useState(false);

  // 🔥 SALVAR SEMPRE QUE MUDAR
  useEffect(() => {
    localStorage.setItem("carrinho", JSON.stringify(carrinho));
  }, [carrinho]);

  // 🔥 ADICIONAR PRODUTO
  function adicionarAoCarrinho(produto) {
    setCarrinho(prev => {

      const id = Number(produto.id);
      const existe = prev.find(p => p.id === id);

      if (existe) {
        return prev.map(p =>
          p.id === id
            ? { ...p, quantidade: p.quantidade + 1 }
            : p
        );
      }

      return [
        ...prev,
        {
          ...produto,
          id: id,
          preco: Number(produto.preco),
          quantidade: 1
        }
      ];
    });

    // 🔥 abre automaticamente (opcional, top demais)
    setAberto(true);
  }

  // ❌ Remover item
  function removerDoCarrinho(id) {
    setCarrinho(prev =>
      prev.filter(p => p.id !== Number(id))
    );
  }

  // ➕ Aumentar quantidade
  function aumentarQuantidade(id) {
    setCarrinho(prev =>
      prev.map(p =>
        p.id === Number(id)
          ? { ...p, quantidade: p.quantidade + 1 }
          : p
      )
    );
  }

  // ➖ Diminuir quantidade
  function diminuirQuantidade(id) {
    setCarrinho(prev =>
      prev
        .map(p =>
          p.id === Number(id)
            ? { ...p, quantidade: p.quantidade - 1 }
            : p
        )
        .filter(p => p.quantidade > 0)
    );
  }

  // 🔓 Abrir carrinho
  function abrirCarrinho() {
    setAberto(true);
  }

  // 🔒 Fechar carrinho
  function fecharCarrinho() {
    setAberto(false);
  }

  // 🔁 Toggle
  function toggleCarrinho() {
    setAberto(prev => !prev);
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