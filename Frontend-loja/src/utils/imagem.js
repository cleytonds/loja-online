export function normalizarCaminhoImagem(valor) {
  if (typeof valor !== 'string') return '';

  const imagem = valor.trim();
  if (!imagem || imagem.startsWith('data:') || imagem.startsWith('blob:')) return imagem;

  try {
    const url = new URL(imagem);
    const indiceUploads = url.pathname.indexOf('/uploads/');

    if (indiceUploads >= 0) return `${url.pathname.slice(indiceUploads)}${url.search}`;

    return imagem;
  } catch {
    const indiceUploads = imagem.indexOf('/uploads/');
    if (indiceUploads >= 0) return imagem.slice(indiceUploads);

    return `/${imagem.replace(/^\/+/, '')}`;
  }
}

export function montarUrlImagem(valor, baseURL = import.meta.env.VITE_API_URL) {
  const imagem = normalizarCaminhoImagem(valor);
  if (!imagem || imagem.startsWith('data:') || imagem.startsWith('blob:') || /^https?:\/\//i.test(imagem)) {
    return imagem;
  }

  return `${String(baseURL || '').replace(/\/+$/, '')}/${imagem.replace(/^\/+/, '')}`;
}

export function usaUrlNgrok(url) {
  try {
    return /(^|\.)ngrok(?:-[a-z0-9-]+)?\.(app|io|dev)$/i.test(new URL(url).hostname);
  } catch {
    return false;
  }
}
