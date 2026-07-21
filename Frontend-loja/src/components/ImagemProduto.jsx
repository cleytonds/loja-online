import { useEffect, useState } from 'react';
import api from '../services/api.js';

const FALLBACK_SRC = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800"%3E%3Crect width="100%25" height="100%25" fill="%23f1f5f9"/%3E%3Cpath d="M180 550l90-120 70 80 55-70 125 110H180z" fill="%23cbd5e1"/%3E%3Ccircle cx="255" cy="285" r="42" fill="%23cbd5e1"/%3E%3Ctext x="300" y="650" text-anchor="middle" fill="%2364748b" font-family="Arial" font-size="28"%3EImagem indisponível%3C/text%3E%3C/svg%3E';

function montarUrlImagem(url) {
  if (!url) return '';
  return url.startsWith('http') ? url : `${api.defaults.baseURL}${url}`;
}

function usaNgrok(url) {
  try {
    return /(^|\.)ngrok(?:-[a-z0-9-]+)?\.(app|io|dev)$/i.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

export default function ImagemProduto({ url, alt, className, loading = 'lazy' }) {
  const urlImagem = montarUrlImagem(url);
  const [src, setSrc] = useState(urlImagem || FALLBACK_SRC);

  useEffect(() => {
    let ativa = true;
    let objectUrl = '';

    if (!urlImagem) {
      setSrc(FALLBACK_SRC);
      return undefined;
    }

    if (!usaNgrok(urlImagem)) {
      setSrc(urlImagem);
      return undefined;
    }

    setSrc(FALLBACK_SRC);
    api.get(urlImagem, { responseType: 'blob' })
      .then((resposta) => {
        if (!ativa || !resposta.data?.size) return;
        objectUrl = URL.createObjectURL(resposta.data);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (ativa) setSrc(FALLBACK_SRC);
      });

    return () => {
      ativa = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [urlImagem]);

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading={loading}
      onError={() => setSrc(FALLBACK_SRC)}
    />
  );
}
