import { useContext, useState } from "react";
import { CarrinhoContext } from "../context/CarrinhoContext";
import { AuthContext } from "../context/AuthContext"; // 👈 IMPORTANTE
import { useNavigate, Link, useLocation } from "react-router-dom";
import "./Header.css";
import { FiShoppingCart, FiSearch, FiUser, FiHeart } from "react-icons/fi";

export default function Header() {
  const { carrinho, toggleCarrinho } = useContext(CarrinhoContext);
  const { user } = useContext(AuthContext); // 👈 pega usuário
  const navigate = useNavigate();
  const location = useLocation();

  const [mostrarBusca, setMostrarBusca] = useState(false);
  const [bloqueado, setBloqueado] = useState(false);

  const token = localStorage.getItem("token");

  function sair() {
    localStorage.removeItem("token");
    navigate("/login");
  }

  const quantidadeTotal = carrinho.reduce((acc, item) => acc + item.quantidade, 0);

  // 🔥 FUNÇÃO CORRIGIDA
  const handlePerfilClick = () => {
    if (bloqueado) return;

    const destino = user?.tipo === "admin" ? "/admin" : "/perfil";

    // evita navegar pra mesma rota
    if (location.pathname === destino) return;

    setBloqueado(true);
    navigate(destino);

    setTimeout(() => setBloqueado(false), 400);
  };

  return (
    <header>

      <div className="header-container">

        <h1 className="logo" onClick={() => navigate("/")}>
          DLmodas
        </h1>

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

        <div className="header-icons">

          <FiSearch
            className="icon"
            onClick={() => setMostrarBusca(!mostrarBusca)}
          />

          {/* 👤 PERFIL CORRIGIDO */}
          <FiUser
            className="icon"
            onClick={handlePerfilClick}
          />

          <FiHeart
            className="icon"
            onClick={() => navigate("/favoritos")}
          />

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