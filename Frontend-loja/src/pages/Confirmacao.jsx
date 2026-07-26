import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import api from '../services/api';

export default function Confirmacao() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  async function confirmar(event) {
    event.preventDefault();
    setErro('');
    setMensagem('');
    setLoading(true);
    try {
      const resposta = await api.post('/auth/verificar-codigo', { token, codigo });
      setMensagem(resposta.data.mensagem || 'Conta confirmada com sucesso!');
      window.setTimeout(() => navigate('/login'), 1500);
    } catch (error) {
      setErro(error.response?.data?.error || 'Código ou token inválido.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Confirme seu cadastro" subtitle="Digite o código enviado ao seu e-mail para ativar sua conta.">
      <form onSubmit={confirmar} className="auth-form">
        <div className="auth-field"><label htmlFor="codigo-confirmacao">Código de confirmação</label><input id="codigo-confirmacao" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength="6" value={codigo} onChange={(event) => setCodigo(event.target.value.replace(/\D/g, ''))} required /></div>
        {erro && <p className="auth-error" role="alert">{erro}</p>}
        {mensagem && <p className="auth-message" role="status">{mensagem}</p>}
        <button type="submit" className="auth-submit" disabled={loading}>{loading ? 'Confirmando...' : 'Confirmar conta'}</button>
      </form>
      <p className="auth-link-row"><Link to="/login">Voltar para entrar</Link></p>
    </AuthLayout>
  );
}
