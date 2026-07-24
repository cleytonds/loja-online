import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import api from '../services/api';
import {
  celularBrasileiroValido,
  formatarCelularBrasileiro,
  somenteDigitosCelular,
} from '../utils/celular.js';

export default function Cadastro() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [celular, setCelular] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [erroCelular, setErroCelular] = useState('');
  const navigate = useNavigate();

  async function handleCadastro(event) {
    event.preventDefault();
    const celularNormalizado = somenteDigitosCelular(celular);
    setErro('');
    setErroCelular('');

    if (!celularBrasileiroValido(celularNormalizado)) {
      setErroCelular('Informe um celular válido com DDD.');
      return;
    }
    if (senha !== confirmarSenha) {
      setErro('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/cadastro', {
        nome: nome.trim(),
        email: email.trim(),
        celular: celularNormalizado,
        senha,
      });
      navigate('/verificar', { state: { email: email.trim() } });
    } catch (error) {
      const mensagem =
        error.response?.data?.erro ||
        error.response?.data?.error ||
        'Não foi possível realizar o cadastro.';
      if (mensagem === 'Informe um celular válido com DDD.') setErroCelular(mensagem);
      else setErro(mensagem);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title=""
      subtitle="Cadastre-se para comprar, acompanhar seus pedidos e receber atualizações da loja."
    >
      <form onSubmit={handleCadastro} className="auth-form">
        <div className="auth-field">
          <label htmlFor="cadastro-nome">Nome</label>
          <input
            id="cadastro-nome"
            type="text"
            autoComplete="name"
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            required
          />
        </div>
        <div className="auth-field">
          <label htmlFor="cadastro-email">E-mail</label>
          <input
            id="cadastro-email"
            type="email"
            autoComplete="email"
            placeholder="seuemail@exemplo.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div className="auth-field">
          <label htmlFor="cadastro-celular">Celular</label>
          <input
            id="cadastro-celular"
            type="tel"
            autoComplete="tel"
            inputMode="numeric"
            placeholder="(81) 99999-9999"
            value={celular}
            onChange={(event) => setCelular(formatarCelularBrasileiro(event.target.value))}
            aria-invalid={Boolean(erroCelular)}
            aria-describedby={erroCelular ? 'erro-celular' : undefined}
            required
          />
          {erroCelular && (
            <p id="erro-celular" className="auth-error" role="alert">
              {erroCelular}
            </p>
          )}
        </div>
        <div className="auth-field">
          <label htmlFor="cadastro-senha">Senha</label>
          <input
            id="cadastro-senha"
            type="password"
            autoComplete="new-password"
            minLength="8"
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
            required
          />
        </div>
        <div className="auth-field">
          <label htmlFor="cadastro-confirmar-senha">Confirmar senha</label>
          <input
            id="cadastro-confirmar-senha"
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
        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? 'Criando conta...' : 'Criar conta'}
        </button>
      </form>
      <p className="auth-link-row">
        Já tem uma conta? <Link to="/login">Entrar</Link>
      </p>
    </AuthLayout>
  );
}
