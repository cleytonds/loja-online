export function normalizarPrecoPromocional(valor) {
  if (valor === undefined || valor === null || String(valor).trim() === '') {
    return null;
  }

  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : Number.NaN;
}

export function validarPrecoPromocionalVariacao(preco, precoPromocional) {
  const promocional = normalizarPrecoPromocional(precoPromocional);
  if (promocional === null) return null;

  const precoNormal = Number(preco);
  if (!Number.isFinite(precoNormal) || precoNormal <= 0) {
    return 'Informe um preço normal válido antes de definir a promoção.';
  }

  if (!Number.isFinite(promocional) || promocional <= 0 || promocional >= precoNormal) {
    return 'O preço promocional deve ser maior que zero e menor que o preço normal.';
  }

  return null;
}

export function normalizarVariacaoParaEdicao(variacao) {
  return {
    ...variacao,
    preco_promocional: variacao?.preco_promocional ?? '',
    ativo: Number(variacao?.ativo) === 1 || variacao?.ativo === true,
  };
}

export function variacaoEhPersistida(variacao) {
  const id = Number(variacao?.id);
  return Number.isInteger(id) && id > 0;
}

export function deveConfirmarInativacao(variacao) {
  return variacaoEhPersistida(variacao) && Boolean(variacao?.ativo);
}

export function podeAtualizarStatusVariacao(variacao, confirmarInativacao) {
  if (!variacaoEhPersistida(variacao)) return false;
  if (!deveConfirmarInativacao(variacao)) return true;
  return Boolean(confirmarInativacao?.());
}

export function rotuloAcaoStatusVariacao(variacao) {
  if (!variacaoEhPersistida(variacao)) return null;
  return variacao.ativo ? 'Inativar' : 'Ativar';
}

export async function solicitarAtualizacaoStatusVariacao({
  apiClient,
  produtoId,
  variacao,
  confirmarInativacao,
}) {
  if (!podeAtualizarStatusVariacao(variacao, confirmarInativacao)) {
    return { cancelada: true };
  }

  const ativo = !variacao.ativo;
  const url = `/produtos/${produtoId}/variacoes/${variacao.id}/status`;
  const resposta = await apiClient.patch(
    url,
    { ativo },
  );

  return { cancelada: false, ativo, resposta, url };
}

export function obterMensagemErroStatusVariacao(erro) {
  const status = erro?.response?.status;
  const corpo = erro?.response?.data;
  const mensagemBackend = corpo?.erro || corpo?.error;

  if (mensagemBackend) {
    return status === 409 ? mensagemBackend : `Erro HTTP ${status}: ${mensagemBackend}`;
  }

  return erro?.message
    ? `Não foi possível atualizar o status da variação: ${erro.message}`
    : 'Não foi possível atualizar o status da variação. Verifique a conexão e tente novamente.';
}

export function removerVariacaoNova(variacoes, index) {
  if (!Array.isArray(variacoes) || index < 0 || index >= variacoes.length) {
    return variacoes;
  }

  if (variacaoEhPersistida(variacoes[index])) {
    return variacoes;
  }

  return variacoes.filter((_, currentIndex) => currentIndex !== index);
}

export function atualizarStatusVariacaoLocal(variacoes, variacaoId, resposta) {
  return variacoes.map((variacao) => (
    Number(variacao.id) === Number(variacaoId)
      ? {
        ...variacao,
        ativo: Boolean(resposta?.ativo),
        estoque: resposta?.estoque ?? variacao.estoque,
      }
      : variacao
  ));
}
