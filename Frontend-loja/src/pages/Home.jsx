import './home.css';

import { Link } from 'react-router-dom';

import { useEffect, useState } from 'react';

import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

import api from '../services/api';

export default function Home() {
  const [produtos, setProdutos] = useState([]);

  const [slide, setSlide] = useState(0);

  const banners = [
    {
      imagem: '/banner1.jpg',
      titulo: 'Coleção Verão 2026',
      texto: 'Estilo e elegância em cada peça',
      link: '/produtos',
    },
    {
      imagem: '/banner2.jpg',
      titulo: 'Promoções exclusivas',
      texto: 'Até 50% OFF por tempo limitado',
      link: '/produtos',
    },
    {
      imagem: '/banner3.jpg',
      titulo: 'Novidades da semana',
      texto: 'Lançamentos incríveis para você',
      link: '/produtos',
    },
  ];

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregar() {
      try {
        const res = await api.get('/produtos');

        setProdutos(res.data);

        setLoading(false);
      } catch (err) {
        console.log(err);

        setLoading(false);
      }
    }

    carregar();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlide((old) => (old + 1) % banners.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [banners.length]);

  const maisVendidos = produtos.slice(0, 4);

  const novidades = produtos.slice(-4);

  function ProdutoCard({ produto }) {
    return (
      <Link className="card-produto" to={`/produto/${produto.id}`}>
        <img src={`${api.defaults.baseURL}${produto.imagem_principal}`} alt={produto.nome} />

        <h3>{produto.nome}</h3>

        <span>Ver produto</span>
      </Link>
    );
  }

  return (
    <div>
      {/* =====================
      BANNER
      ===================== */}
      <section
        className="banner-premium"
        style={{
          backgroundImage: `linear-gradient(
      rgba(0, 0, 0, 0.45),
      rgba(0, 0, 0, 0.45)
    ), url('/banner-fashion.jpg')`,
        }}
      >
        <div className="banner-premium-content">
          <h1>Seu novo look está a um clique</h1>
          <p>Moda premium, estilo único e entrega rápida para você</p>
        </div>
      </section>

      <Link
        to={banners[slide].link}
        className="hero"
        style={{
          backgroundImage: `
      url(${banners[slide].imagem})
    `,
        }}
      >
        <button
          className="arrow left"
          onClick={(e) => {
            e.preventDefault();
            setSlide((slide - 1 + banners.length) % banners.length);
          }}
        >
          ◀
        </button>

        <button
          className="arrow right"
          onClick={(e) => {
            e.preventDefault();
            setSlide((slide + 1) % banners.length);
          }}
        >
          ▶
        </button>
      </Link>

      {/* =====================
      MAIS VENDIDOS
      ===================== */}

      {loading ? (
        <p>Carregando produtos...</p>
      ) : (
        <div className="grid-produtos">
          {maisVendidos.map((produto) => (
            <ProdutoCard key={produto.id} produto={produto} />
          ))}
        </div>
      )}

      {/* =====================
      NOVIDADES
      ===================== */}

      <section className="secao">
        <h2></h2>

        <div className="grid-produtos">
          {novidades.map((produto) => (
            <ProdutoCard key={produto.id} produto={produto} />
          ))}
        </div>
      </section>

      <section className="cta">
        <h2>Novas coleções toda semana</h2>

        <p>Descubra peças incríveis</p>

        <Link to="/produtos">
          <button>Explorar loja</button>
        </Link>
      </section>
    </div>
  );
}
