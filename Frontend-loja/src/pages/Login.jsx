import { useContext, useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  async function handleLogin(event) {
    event.preventDefault();
    if (loading) return;
    setErro('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { email: email.trim(), senha });
      const { token, usuario } = response.data;
      if (!token || !usuario) throw new Error('Resposta inválida do backend');
      login(usuario, token);
      navigate(usuario.tipo === 'admin' ? '/admin' : '/');
    } catch (error) {
      setErro(
        error.response?.data?.error ||
          'Não foi possível entrar. Verifique seus dados e tente novamente.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout subtitle="Acesse sua conta para acompanhar seus pedidos e continuar suas compras.">
      <form onSubmit={handleLogin} className="auth-form">
        <div className="auth-field">
          <label htmlFor="login-email">E-mail</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="seuemail@exemplo.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div className="auth-field">
          <label htmlFor="login-senha">Senha</label>
          <div className="auth-password-field">
            <input
              id="login-senha"
              type={mostrarSenha ? 'text' : 'password'}
              autoComplete="current-password"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              required
            />
            <button
              type="button"
              className="auth-password-toggle"
              onClick={() => setMostrarSenha((valor) => !valor)}
              aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {mostrarSenha ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
            </button>
          </div>
        </div>

        {erro && (
          <p className="auth-error" role="alert">
            {erro}
          </p>
        )}
        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <p className="auth-link-row">
        Esqueceu a senha? <Link to="/esqueci-senha">Redefinir senha</Link>
      </p>
      <p className="auth-link-row">
        Ainda não tem uma conta? <Link to="/cadastro">Cadastre-se</Link>
      </p>
    </AuthLayout>
  );
}
