import React from 'react';

export function getErrorMessage(error, fallback = 'Não foi possível concluir a operação.') {
  const message = error?.response?.data?.error || error?.response?.data?.erro || error?.message;
  return message || fallback;
}

export function renderState({ loading, error, empty, loadingLabel, emptyLabel, children }) {
  if (loading) {
    return React.createElement('p', { role: 'status' }, loadingLabel || 'Carregando...');
  }

  if (error) {
    return React.createElement('p', { role: 'alert' }, error);
  }

  if (empty) {
    return React.createElement('p', null, emptyLabel || 'Nenhum item encontrado.');
  }

  return children;
}
