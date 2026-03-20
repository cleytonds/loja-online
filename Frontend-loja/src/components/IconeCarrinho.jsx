import { useContext } from "react";
import { CarrinhoContext } from "../context/CarrinhoContext";
import "./IconeCarrinho.css";

export default function IconeCarrinho() {
  const { carrinho, abrirCarrinho } = useContext(CarrinhoContext);

  const totalItens = carrinho.reduce(
    (acc, item) => acc + item.quantidade,
    0
  );

  return (
    <div className="icone-carrinho" onClick={abrirCarrinho}>
      🛒

      {totalItens > 0 && (
        <span className="badge">{totalItens}</span>
      )}
    </div>
  );
}