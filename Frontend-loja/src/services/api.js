import axios from 'axios';
import { obterAccessToken, obterUsuario, limparSessao, salvarSessao } from '../utils/authSession';

const baseURL = import.meta.env.VITE_API_URL;
export const AUTH_NETWORK_TIMEOUT_MS = 10000;

const usaNgrok = (() => {
  try {
    return /(^|\.)ngrok(?:-[a-z0-9-]+)?\.(app|io|dev)$/i.test(
      new URL(baseURL).hostname,
    );
  } catch {
    return false;
  }
})();

const api = axios.create({
  baseURL,
  withCredentials: true,
});

const refreshApi = axios.create({
  baseURL,
  withCredentials: true,
  timeout: AUTH_NETWORK_TIMEOUT_MS,
});
let refreshPromise = null;

refreshApi.interceptors.request.use((config) => {
  if (usaNgrok) config.headers['ngrok-skip-browser-warning'] = 'true';
  return config;
});

function aguardar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function rotaSemRefresh(url = '') {
  return ['/auth/login', '/auth/logout', '/auth/refresh', '/auth/session/upgrade'].some((path) => String(url).includes(path));
}

function erroRefreshStale() {
  const error = new Error('AUTH_REFRESH_STALE');
  error.code = 'AUTH_REFRESH_STALE';
  return error;
}

function erroRefreshIdentidade(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function sessaoAtualCorrespondeAoEsperado(tokenInicial, expectedUserId) {
  return obterAccessToken() === tokenInicial && Number(obterUsuario()?.id) === expectedUserId;
}

async function limparCookieRefreshBestEffort() {
  try {
    await refreshApi.post('/auth/logout');
  } catch {
    // O logout remoto e apenas uma limpeza complementar do cookie HttpOnly.
  }
}

async function atualizarSessao() {
  const tokenInicial = obterAccessToken();
  const expectedUserId = Number(obterUsuario()?.id);
  if (!tokenInicial || !Number.isSafeInteger(expectedUserId) || expectedUserId <= 0) {
    limparSessao('session-expired');
    throw erroRefreshIdentidade('AUTH_REFRESH_IDENTITY_REQUIRED');
  }

  let conflicts = 0;
  while (true) {
    if (!sessaoAtualCorrespondeAoEsperado(tokenInicial, expectedUserId)) throw erroRefreshStale();

    try {
      const { data } = await refreshApi.post('/auth/refresh', undefined, {
        headers: { 'X-Auth-Expected-User-Id': String(expectedUserId) },
      });
      if (!data?.token || !data?.usuario) throw new Error('Resposta de refresh invalida');

      if (!sessaoAtualCorrespondeAoEsperado(tokenInicial, expectedUserId)) {
        if (!obterAccessToken()) {
          await limparCookieRefreshBestEffort();
        }
        throw erroRefreshStale();
      }

      if (Number(data.usuario.id) !== expectedUserId) {
        limparSessao('session-expired');
        await limparCookieRefreshBestEffort();
        throw erroRefreshIdentidade('AUTH_REFRESH_IDENTITY_MISMATCH');
      }

      salvarSessao({ token: data.token, usuario: data.usuario });
      return data;
    } catch (error) {
      if (error.response?.status === 409 && error.response?.data?.code === 'AUTH_REFRESH_CONFLICT' && conflicts < 2) {
        conflicts += 1;
        await aguardar(250);
        if (!sessaoAtualCorrespondeAoEsperado(tokenInicial, expectedUserId)) throw erroRefreshStale();
        continue;
      }
      if (error.response?.status === 401) limparSessao('session-expired');
      throw error;
    }
  }
}

api.interceptors.request.use((config) => {
  config.headers ||= {};
  if (usaNgrok) {
    config.headers['ngrok-skip-browser-warning'] = 'true';
  }

  const token = obterAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    config._hadAuthToken = true;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (
      error.response?.status !== 401
      || !config
      || config._authRetry
      || !config._hadAuthToken
      || rotaSemRefresh(config.url)
    ) {
      return Promise.reject(error);
    }

    try {
      if (!refreshPromise) refreshPromise = atualizarSessao().finally(() => { refreshPromise = null; });
      const { token } = await refreshPromise;
      config._authRetry = true;
      config.headers.Authorization = `Bearer ${token}`;
      return api(config);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  },
);

export default api;
