import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import api from '../services/api';

export default function EsqueciSenha() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setMensagem('');
    try {
      const resposta = await api.post('/auth/solicitar-recuperacao', { email: email.trim() });
      setMensagem(resposta.data.mensagem);
    } catch (error) {
      setMensagem(
        error.response?.data?.erro || 'Não foi possível enviar as instruções. Tente novamente.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title=""
      subtitle="Informe seu e-mail para receber as instruções de redefinição de senha."
    >
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-field">
          <label htmlFor="recuperar-email">E-mail</label>
          <input
            id="recuperar-email"
            type="email"
            autoComplete="email"
            placeholder="seuemail@exemplo.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        {mensagem && (
          <p className="auth-message" role="status">
            {mensagem}
          </p>
        )}
        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? 'Enviando...' : 'Enviar instruções'}
        </button>
      </form>
      <p className="auth-link-row">
        <Link to="/login">Voltar para entrar</Link>
      </p>
    </AuthLayout>
  );
}
