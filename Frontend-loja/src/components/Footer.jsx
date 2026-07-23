import { Link } from 'react-router-dom';
import {
  FaCheckCircle,
  FaInstagram,
  FaMapMarkerAlt,
  FaWhatsapp,
} from 'react-icons/fa';
import { SiAmericanexpress, SiMastercard, SiPix, SiVisa } from 'react-icons/si';
import logoDayaneLima from '../assets/logo-dayane-lima-header.png';
import './Footer.css';

const itensSeguranca = [
  'Compra segura',
  'Pagamento seguro',
  'Dados protegidos',
  'Atendimento via WhatsApp',
  'Produtos de qualidade',
];

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-conteudo">
        <section className="site-footer-marca" aria-label="DL Modas">
          <img src={logoDayaneLima} alt="Dayane Lima Moda Feminina" />
          <p>Moda feminina com estilo, elegância e qualidade para todos os momentos.</p>
          <span><FaMapMarkerAlt aria-hidden="true" /> Rua 50, nº 383 — Zumbi do Pacheco</span>
          <span>Loja física e virtual</span>
        </section>

        <nav className="site-footer-coluna" aria-label="Navegação do rodapé">
          <h2>Navegação</h2>
          <Link to="/">Home</Link>
          <Link to="/produtos">Produtos</Link>
          <Link to="/favoritos">Favoritos</Link>
          <Link to="/carrinho">Carrinho</Link>
          <Link to="/meus-pedidos">Meus pedidos</Link>
        </nav>

        <section className="site-footer-coluna site-footer-atendimento">
          <h2>Atendimento</h2>
          <a href="https://wa.me/5581993563122" target="_blank" rel="noreferrer">
            <FaWhatsapp aria-hidden="true" /> (81) 99356-3122
          </a>
          <a href="https://instagram.com/dlmodasofc" target="_blank" rel="noreferrer">
            <FaInstagram aria-hidden="true" /> @dlmodasofc
          </a>
          <p><strong>Segunda à Sexta</strong><br />08:00 às 18:00</p>
          <p><strong>Sábado</strong><br />08:00 às 13:00</p>
          <div className="site-footer-sociais" aria-label="Redes sociais">
            <a href="https://instagram.com/dlmodasofc" target="_blank" rel="noreferrer" aria-label="Instagram da DL Modas"><FaInstagram /></a>
            <a href="https://wa.me/5581993563122" target="_blank" rel="noreferrer" aria-label="WhatsApp da DL Modas"><FaWhatsapp /></a>
          </div>
        </section>

        <section className="site-footer-coluna site-footer-seguranca">
          <h2>Compra segura</h2>
          <ul>
            {itensSeguranca.map((item) => (
              <li key={item}><FaCheckCircle aria-hidden="true" /> {item}</li>
            ))}
          </ul>
          <div className="site-footer-pagamentos" aria-label="Formas de pagamento aceitas">
            <span title="PIX"><SiPix aria-hidden="true" /> PIX</span>
            <span title="Visa"><SiVisa aria-hidden="true" /></span>
            <span title="Mastercard"><SiMastercard aria-hidden="true" /></span>
            <span title="Elo">Elo</span>
            <span title="Hipercard">Hiper</span>
            <span title="American Express"><SiAmericanexpress aria-hidden="true" /></span>
          </div>
        </section>
      </div>

      <div className="site-footer-inferior">
        <span>© 2026 DL Modas — Todos os direitos reservados.</span>
        <span>Desenvolvido por Cleyton Pereira da Silva</span>
      </div>
    </footer>
  );
}
