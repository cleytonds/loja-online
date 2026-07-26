import './home.css';

import { Link } from 'react-router-dom';

import { useEffect, useState } from 'react';

import api from '../services/api';
import ImagemProduto from '../components/ImagemProduto.jsx';

const BANNERS = [
  {
    desktop: '/banner1.png',
    mobile: '/banner1-mobile.png',
    alt: 'Dayane Lima Moda Feminina - Banner 1',
  },
  {
    desktop: '/banner2.png',
    mobile: '/banner2-mobile.png',
    alt: 'Dayane Lima Moda Feminina - Banner 2',
  },
  {
    desktop: '/banner3.png',
    mobile: '/banner3-mobile.png',
    alt: 'Dayane Lima Moda Feminina - Banner 3',
  },
];

function ProdutoCard({ produto }) {
  return (
    <Link className="card-produto" to={`/produto/${produto.id}`}>
      <ImagemProduto url={produto.imagem_principal} alt={produto.nome} />

      <h3>{produto.nome}</h3>

      <span>Ver produto</span>
    </Link>
  );
}

export default function Home() {
  const [produtos, setProdutos] = useState([]);

  const [slide, setSlide] = useState(0);
  const [carrosselPausado, setCarrosselPausado] = useState(false);

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
    if (carrosselPausado) return undefined;

    const timer = setInterval(() => {
      setSlide((old) => (old + 1) % BANNERS.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [carrosselPausado]);

  const maisVendidos = produtos.slice(0, 4);

  const novidades = produtos.slice(-4);

  return (
    <div>
      {/* =====================
      BANNER
      ===================== */}
      <section
        className="hero"
        aria-roledescription="carrossel"
        aria-label="Banners em destaque"
        onMouseEnter={() => setCarrosselPausado(true)}
        onMouseLeave={() => setCarrosselPausado(false)}
      >
        <div className="banner-slide">
          {BANNERS.map((banner, indice) => (
            <picture
              key={banner.desktop}
              className={`carousel-banner${indice === slide ? ' ativo' : ''}`}
              aria-hidden={indice !== slide}
            >
              <source media="(max-width: 767px)" srcSet={banner.mobile} />
              <img
                src={banner.desktop}
                alt={banner.alt}
                className="banner-imagem"
                loading="eager"
              />
            </picture>
          ))}
        </div>

        <div className="hero-indicadores" aria-label="Selecionar banner">
          {BANNERS.map((banner, indice) => (
            <button
              key={banner.desktop}
              type="button"
              className={indice === slide ? 'ativo' : ''}
              aria-label={`Exibir banner ${indice + 1}`}
              aria-current={indice === slide ? 'true' : undefined}
              onClick={() => setSlide(indice)}
            />
          ))}
        </div>
      </section>

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
