const TOKEN_KEY = 'token';
const USER_KEY = 'usuario';
const SESSION_EVENT = 'dl-auth-session-change';

function notify(detail) {
  window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail }));
}

export function obterAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function obterUsuario() {
  const value = localStorage.getItem(USER_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function salvarSessao({ token, usuario }) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (usuario) localStorage.setItem(USER_KEY, JSON.stringify(usuario));
  notify({ type: 'session-updated', usuario: usuario || obterUsuario() });
}

export function salvarUsuario(usuario) {
  if (!usuario) return;
  localStorage.setItem(USER_KEY, JSON.stringify(usuario));
  notify({ type: 'session-updated', usuario });
}

export function limparSessao(reason = 'logout') {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  notify({ type: reason, usuario: null });
}

export function observarSessao(listener) {
  const handler = (event) => listener(event.detail);
  window.addEventListener(SESSION_EVENT, handler);
  return () => window.removeEventListener(SESSION_EVENT, handler);
}
