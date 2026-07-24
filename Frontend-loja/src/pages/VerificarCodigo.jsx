import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import api from '../services/api';

export default function VerificarCodigo() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;
  const [codigo, setCodigo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  async function reenviarCodigo() {
    if (!email) return setErro('E-mail não disponível para reenviar o código.');
    setLoading(true);
    setErro('');
    try {
      const resposta = await api.post('/auth/reenviar-codigo', { email });
      setMensagem(resposta.data.mensagem || 'Código reenviado com sucesso!');
    } catch (error) {
      setErro(error.response?.data?.error || 'Não foi possível reenviar o código.');
    } finally {
      setLoading(false);
    }
  }

  async function confirmar(event) {
    event.preventDefault();
    setLoading(true);
    setErro('');
    try {
      const resposta = await api.post('/auth/verificar-codigo', { email, codigo });
      setMensagem(resposta.data.mensagem || 'Conta confirmada com sucesso!');
      window.setTimeout(() => navigate('/login'), 1500);
    } catch (error) {
      setErro(error.response?.data?.error || 'Código inválido.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Confirme seu cadastro" subtitle="Digite o código enviado ao seu e-mail para ativar sua conta.">
      <p className="auth-message">Enviamos um código para {email || 'seu e-mail'}.</p>
      <form className="auth-form" onSubmit={confirmar}>
        <div className="auth-field"><label htmlFor="codigo-verificacao">Código de confirmação</label><input id="codigo-verificacao" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength="6" value={codigo} onChange={(event) => setCodigo(event.target.value.replace(/\D/g, ''))} required /></div>
        <button type="submit" className="auth-submit" disabled={loading}>{loading ? 'Confirmando...' : 'Confirmar cadastro'}</button>
      </form>
      <button type="button" className="auth-secondary-button" onClick={reenviarCodigo} disabled={loading}>Reenviar código</button>
      {mensagem && <p className="auth-message" role="status">{mensagem}</p>}
      {erro && <p className="auth-error" role="alert">{erro}</p>}
      <p className="auth-link-row"><Link to="/login">Voltar para entrar</Link></p>
    </AuthLayout>
  );
}
