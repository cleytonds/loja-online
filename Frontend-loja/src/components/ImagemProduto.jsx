import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import api from '../services/api.js';
import { montarUrlImagem, usaUrlNgrok } from '../utils/imagem.js';

const FALLBACK_SRC =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg"
         width="600"
         height="800"
         viewBox="0 0 600 800">
      <rect width="100%" height="100%" fill="#f1f5f9"/>
      <path
        d="M180 550l90-120 70 80 55-70 125 110H180z"
        fill="#cbd5e1"
      />
      <circle cx="255" cy="285" r="42" fill="#cbd5e1"/>
      <text
        x="300"
        y="650"
        text-anchor="middle"
        fill="#64748b"
        font-family="Arial"
        font-size="28">
        Imagem indisponível
      </text>
    </svg>
  `);

const apiImagem = axios.create();

export default function ImagemProduto({
  url,
  alt = '',
  className,
  loading = 'lazy',
  onError,
  ...imgProps
}) {
  const urlImagem = useMemo(() => montarUrlImagem(url, api.defaults.baseURL), [url]);
  const [src, setSrc] = useState(FALLBACK_SRC);

  useEffect(() => {
    let componenteAtivo = true;
    let objectUrl = '';

    async function carregarImagem() {
      if (!urlImagem) {
        setSrc(FALLBACK_SRC);
        return;
      }

      if (!usaUrlNgrok(urlImagem)) {
        setSrc(urlImagem);
        return;
      }

      setSrc(FALLBACK_SRC);

      try {
        const resposta = await apiImagem.get(urlImagem, {
          responseType: 'blob',

          headers: {
            'ngrok-skip-browser-warning': 'true',
          },

          timeout: 15000,
        });

        if (!componenteAtivo) return;

        const blob = resposta.data;
        const contentType = blob?.type || resposta.headers?.['content-type'] || '';

        if (
          !(blob instanceof Blob) ||
          blob.size === 0 ||
          !contentType.toLowerCase().startsWith('image/')
        ) {
          setSrc(FALLBACK_SRC);
          return;
        }

        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch {
        if (!componenteAtivo) return;
        setSrc(FALLBACK_SRC);
      }
    }

    carregarImagem();

    return () => {
      componenteAtivo = false;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [urlImagem]);

  return (
    <img
      {...imgProps}
      className={className}
      src={src}
      alt={alt}
      loading={loading}
      onError={(event) => {
        if (event.currentTarget.src !== FALLBACK_SRC) {
          setSrc(FALLBACK_SRC);
        }

        onError?.(event);
      }}
    />
  );
}
