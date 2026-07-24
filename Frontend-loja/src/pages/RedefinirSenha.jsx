import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import api from '../services/api';

export default function RedefinirSenha() {
  const { token } = useParams();
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setErro('');
    setMensagem('');
    if (senha !== confirmarSenha) {
      setErro('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    try {
      const resposta = await api.post(`/auth/redefinir-senha/${token}`, { novaSenha: senha });
      setMensagem(resposta.data.mensagem || 'Senha redefinida com sucesso!');
    } catch (error) {
      setErro(error.response?.data?.erro || 'Token inválido ou expirado.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Crie uma nova senha"
      subtitle="Escolha uma senha segura para acessar novamente sua conta."
    >
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-field">
          <label htmlFor="nova-senha">Nova senha</label>
          <input
            id="nova-senha"
            type="password"
            autoComplete="new-password"
            minLength="8"
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
            required
          />
        </div>
        <div className="auth-field">
          <label htmlFor="confirmar-nova-senha">Confirmar nova senha</label>
          <input
            id="confirmar-nova-senha"
            type="password"
            autoComplete="new-password"
            minLength="8"
            value={confirmarSenha}
            onChange={(event) => setConfirmarSenha(event.target.value)}
            required
          />
        </div>
        {erro && (
          <p className="auth-error" role="alert">
            {erro}
          </p>
        )}
        {mensagem && (
          <p className="auth-message" role="status">
            {mensagem}
          </p>
        )}
        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? 'Atualizando...' : 'Atualizar senha'}
        </button>
      </form>
      <p className="auth-link-row">
        <Link to="/login">Voltar para entrar</Link>
      </p>
    </AuthLayout>
  );
}
