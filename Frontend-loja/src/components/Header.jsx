import { useContext, useState } from "react";
import { CarrinhoContext } from "../context/CarrinhoContext";
import { useNavigate, Link } from "react-router-dom";
import "./Header.css";
import { FiShoppingCart, FiSearch, FiUser, FiHeart } from "react-icons/fi";

export default function Header() {
  const { carrinho, toggleCarrinho } = useContext(CarrinhoContext);
  const navigate = useNavigate();

  const [mostrarBusca, setMostrarBusca] = useState(false);

  const token = localStorage.getItem("token");

  function sair() {
    localStorage.removeItem("token");
    navigate("/login");
  }

  // ✅ Quantidade total de itens no carrinho
  const quantidadeTotal = carrinho.reduce((acc, item) => acc + item.quantidade, 0);

  return (
    <header>

      {/* TOPO */}
      <div className="header-container">

        {/* LOGO */}
        <h1 className="logo" onClick={() => navigate("/")}>
          DLmodas
        </h1>

        {/* BUSCA */}
        {mostrarBusca && (
          <input
            className="input-busca"
            placeholder="Buscar produtos..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                navigate(`/busca?nome=${e.target.value}`);
                setMostrarBusca(false);
              }
            }}
          />
        )}

        {/* ÍCONES */}
        <div className="header-icons">

          {/* 🔍 Busca */}
          <FiSearch
            className="icon"
            onClick={() => setMostrarBusca(!mostrarBusca)}
          />

          {/* 👤 Perfil */}
          <FiUser
            className="icon"
            onClick={() => navigate("/perfil")}
          />

          {/* ❤️ Favoritos */}
          <FiHeart
            className="icon"
            onClick={() => navigate("/favoritos")}
          />

          {/* 🛒 Carrinho */}
          <div className="carrinho-icon" onClick={toggleCarrinho}>
            <FiShoppingCart className="icon" />
            {quantidadeTotal > 0 && (
              <span className="badge">
                {quantidadeTotal > 99 ? "99+" : quantidadeTotal}
              </span>
            )}
          </div>

        </div>

      </div>

      {/* MENU */}
      <div className="menu-preto">
        <nav className="menu-container">
          <Link to="/">Home</Link>
          <Link to="/produtos">Produtos</Link>

          {!token && <Link to="/login">Conecte-se</Link>}

          {token && (
            <button onClick={sair} className="btn-sair">
              Sair
            </button>
          )}

          <Link to="/carrinho">Carrinho</Link>
        </nav>
      </div>

    </header>
  );
}