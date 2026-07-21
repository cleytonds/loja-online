import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
});

api.interceptors.request.use((config) => {
  if (usaNgrok) {
    config.headers['ngrok-skip-browser-warning'] = 'true';
  }

  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
