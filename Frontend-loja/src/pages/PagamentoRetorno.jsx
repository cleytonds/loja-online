import { Link, useLocation } from 'react-router-dom';
import './PagamentoRetorno.css';

const mensagens = {
  sucesso: {
    titulo: 'Pagamento recebido',
    texto: 'Recebemos o retorno do Mercado Pago. A confirmação do pedido ocorrerá após a validação segura do pagamento.',
  },
  pendente: {
    titulo: 'Pagamento pendente',
    texto: 'O Mercado Pago ainda está processando este pagamento. Acompanhe o pedido em Minha Conta.',
  },
  falhou: {
    titulo: 'Pagamento não concluído',
    texto: 'O pagamento não foi concluído. Nenhuma confirmação é feita por esta tela.',
  },
};

export default function PagamentoRetorno() {
  const etapa = useLocation().pathname.split('/').pop();
  const mensagem = mensagens[etapa] || mensagens.pendente;

  return (
    <section className="pagamento-retorno" aria-live="polite">
      <h1>{mensagem.titulo}</h1>
      <p>{mensagem.texto}</p>
      <Link className="btn-primary" to="/perfil">Ver meus pedidos</Link>
    </section>
  );
}
