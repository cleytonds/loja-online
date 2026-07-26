import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import api from '../services/api';

function mensagemDeErro(error, fallback) {
  const resposta = error?.response?.data;

  if (typeof resposta?.erro === 'string') return resposta.erro;
  if (typeof resposta?.error === 'string') return resposta.error;
  if (typeof resposta?.message === 'string') return resposta.message;
  if (typeof resposta?.error?.message === 'string') return resposta.error.message;

  return fallback;
}

export default function VerificarCodigo() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;
  const [codigo, setCodigo] = useState('');
  const [mensagem, setMensagem] = useState(() => location.state?.aviso || '');
  const [erro, setErro] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [reenviando, setReenviando] = useState(false);

  async function reenviarCodigo(event) {
    event?.preventDefault();
    event?.stopPropagation();

    if (!email) {
      setErro('E-mail não disponível para reenviar o código.');
      return;
    }

    setReenviando(true);
    setErro('');

    try {
      const resposta = await api.post('/auth/reenviar-codigo', { email });
      setMensagem(resposta.data.mensagem || 'Código reenviado com sucesso!');
    } catch (error) {
      setErro(mensagemDeErro(error, 'Não foi possível reenviar o código.'));
    } finally {
      setReenviando(false);
    }
  }

  async function confirmar(event) {
    event.preventDefault();
    const codigoNormalizado = codigo.trim();

    if (!codigoNormalizado) {
      setErro('Informe o código de confirmação para continuar.');
      return;
    }

    setConfirmando(true);
    setErro('');

    try {
      const resposta = await api.post('/auth/verificar-codigo', { email, codigo: codigoNormalizado });
      setMensagem(resposta.data.mensagem || 'Conta confirmada com sucesso!');
      window.setTimeout(() => navigate('/login'), 1500);
    } catch (error) {
      setErro(mensagemDeErro(error, 'Código inválido.'));
    } finally {
      setConfirmando(false);
    }
  }

  return (
    <AuthLayout title="Confirme seu cadastro" subtitle="Digite o código enviado ao seu e-mail para ativar sua conta.">
      <p className="auth-message">Enviamos um código para {email || 'seu e-mail'}.</p>
      <form className="auth-form" onSubmit={confirmar}>
        <div className="auth-field">
          <label htmlFor="codigo-verificacao">Código de confirmação</label>
          <input
            id="codigo-verificacao"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength="6"
            value={codigo}
            onChange={(event) => setCodigo(event.target.value.replace(/\D/g, ''))}
            required
          />
        </div>
        <button type="submit" className="auth-submit" disabled={confirmando || reenviando}>
          {confirmando ? 'Confirmando...' : 'Confirmar cadastro'}
        </button>
      </form>
      <button
        type="button"
        className="auth-secondary-button"
        onClick={reenviarCodigo}
        disabled={confirmando || reenviando}
      >
        {reenviando ? 'Reenviando...' : 'Reenviar código'}
      </button>
      {mensagem && (
        <p className="auth-message" role="status">
          {mensagem}
        </p>
      )}
      {erro && (
        <p className="auth-error" role="alert">
          {erro}
        </p>
      )}
      <p className="auth-link-row">
        <Link to="/login">Voltar para entrar</Link>
      </p>
    </AuthLayout>
  );
}
