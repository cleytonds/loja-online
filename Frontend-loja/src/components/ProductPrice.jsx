import { obterClassesPreco, obterPrecoParaExibicao } from '../utils/precoPromocional.js';
import './ProductPrice.css';

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

export default function ProductPrice({ variacao, preco, className = '' }) {
  const exibicao = obterPrecoParaExibicao({ variacao, preco });
  const classes = obterClassesPreco(exibicao, className);

  if (!exibicao.temPromocao) {
    return <span className={classes}>{formatarMoeda(exibicao.precoEfetivo)}</span>;
  }

  return (
    <span className={classes}>
      <span className="product-price__normal">{formatarMoeda(exibicao.precoNormal)}</span>
      <strong className="product-price__promotional">{formatarMoeda(exibicao.precoEfetivo)}</strong>
    </span>
  );
}
