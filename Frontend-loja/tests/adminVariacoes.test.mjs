import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  atualizarStatusVariacaoLocal,
  deveConfirmarInativacao,
  normalizarPrecoPromocional,
  normalizarVariacaoParaEdicao,
  obterMensagemErroStatusVariacao,
  podeAtualizarStatusVariacao,
  removerVariacaoNova,
  rotuloAcaoStatusVariacao,
  solicitarAtualizacaoStatusVariacao,
  validarPrecoPromocionalVariacao,
  variacaoEhPersistida,
} from '../src/utils/variacoesAdmin.js';

test('aceita promoção vazia e normaliza o campo para remoção da promoção', () => {
  assert.equal(normalizarPrecoPromocional(''), null);
  assert.equal(normalizarPrecoPromocional('   '), null);
  assert.equal(validarPrecoPromocionalVariacao('100', ''), null);
});

test('diferencia variações persistidas de novas e só permite remover a nova do formulário', () => {
  const persistida = { id: 7, tamanho: 'M', ativo: true };
  const nova = { tamanho: 'G', ativo: true };
  const lista = [persistida, nova];

  assert.equal(variacaoEhPersistida(persistida), true);
  assert.equal(variacaoEhPersistida(nova), false);
  assert.deepEqual(removerVariacaoNova(lista, 0), lista);
  assert.deepEqual(removerVariacaoNova(lista, 1), [persistida]);
});

test('inativação persistida exige confirmação e reativação não exige confirmação', () => {
  assert.equal(deveConfirmarInativacao({ id: 1, ativo: true }), true);
  assert.equal(deveConfirmarInativacao({ id: 1, ativo: false }), false);
  assert.equal(deveConfirmarInativacao({ ativo: true }), false);

  let confirmacoes = 0;
  assert.equal(podeAtualizarStatusVariacao({ id: 1, ativo: true }, () => {
    confirmacoes += 1;
    return false;
  }), false);
  assert.equal(confirmacoes, 1);
  assert.equal(podeAtualizarStatusVariacao({ id: 1, ativo: false }, () => {
    throw new Error('reativação não deve pedir confirmação');
  }), true);
  assert.equal(rotuloAcaoStatusVariacao({ id: 1, ativo: true }), 'Inativar');
  assert.equal(rotuloAcaoStatusVariacao({ id: 1, ativo: false }), 'Ativar');
});

test('atualiza somente o status da variação alvo preservando preço, promoção, estoque e SKU', () => {
  const lista = [
    { id: 1, tamanho: 'M', cor: 'Rosa', preco: 120, preco_promocional: 89.9, estoque: 10, sku: 'ROSA-M', ativo: true },
    { id: 2, tamanho: 'G', cor: 'Azul', preco: 100, preco_promocional: null, estoque: 4, sku: 'AZUL-G', ativo: true },
  ];

  const atualizada = atualizarStatusVariacaoLocal(lista, 1, { ativo: false, estoque: 10 });

  assert.deepEqual(atualizada[0], { ...lista[0], ativo: false });
  assert.deepEqual(atualizada[1], lista[1]);
});

test('aceita promoção válida e rejeita valores inválidos no formulário administrativo', () => {
  assert.equal(validarPrecoPromocionalVariacao('100', '80'), null);
  assert.match(validarPrecoPromocionalVariacao('100', '0'), /maior que zero/);
  assert.match(validarPrecoPromocionalVariacao('100', '100'), /menor que o preço normal/);
  assert.match(validarPrecoPromocionalVariacao('100', '120'), /menor que o preço normal/);
  assert.match(validarPrecoPromocionalVariacao('100', 'invalido'), /maior que zero/);
});

test('normaliza variação administrativa mantendo o status e campo promocional editável', () => {
  const ativa = normalizarVariacaoParaEdicao({ id: 1, ativo: 1, preco_promocional: null });
  const inativa = normalizarVariacaoParaEdicao({ id: 2, ativo: 0, preco_promocional: 79.9 });

  assert.deepEqual(ativa, { id: 1, ativo: true, preco_promocional: '' });
  assert.deepEqual(inativa, { id: 2, ativo: false, preco_promocional: 79.9 });
});

test('inativar chama PATCH com ativo=false e atualiza somente a variacao alvo', async () => {
  const chamadas = [];
  const apiClient = {
    patch: async (url, corpo) => {
      chamadas.push({ url, corpo });
      return { data: { id: 7, ativo: false, estoque: 10 } };
    },
  };
  const resultado = await solicitarAtualizacaoStatusVariacao({
    apiClient,
    produtoId: 12,
    variacao: { id: 7, ativo: true },
    confirmarInativacao: () => true,
  });
  const lista = atualizarStatusVariacaoLocal([
    { id: 7, ativo: true, preco: 120, preco_promocional: 89.9, estoque: 10, sku: 'A' },
    { id: 8, ativo: true, preco: 100, estoque: 5, sku: 'B' },
  ], 7, resultado.resposta.data);

  assert.deepEqual(chamadas, [{
    url: '/produtos/12/variacoes/7/status',
    corpo: { ativo: false },
  }]);
  assert.equal(resultado.ativo, false);
  assert.equal(lista[0].ativo, false);
  assert.deepEqual(lista[1], { id: 8, ativo: true, preco: 100, estoque: 5, sku: 'B' });
});

test('ativar chama PATCH com ativo=true e cancelamento nao chama a API', async () => {
  const chamadas = [];
  const apiClient = {
    patch: async (url, corpo) => {
      chamadas.push({ url, corpo });
      return { data: { id: 8, ativo: true, estoque: 5 } };
    },
  };

  const cancelada = await solicitarAtualizacaoStatusVariacao({
    apiClient,
    produtoId: 12,
    variacao: { id: 7, ativo: true },
    confirmarInativacao: () => false,
  });
  assert.deepEqual(cancelada, { cancelada: true });
  assert.equal(chamadas.length, 0);

  const ativada = await solicitarAtualizacaoStatusVariacao({
    apiClient,
    produtoId: 12,
    variacao: { id: 8, ativo: false },
  });
  assert.equal(ativada.ativo, true);
  assert.deepEqual(chamadas, [{
    url: '/produtos/12/variacoes/8/status',
    corpo: { ativo: true },
  }]);
});

test('falha do backend e propagada para a tela mostrar o erro retornado', async () => {
  const falha = Object.assign(new Error('Conflict'), {
    response: { status: 409, data: { erro: 'Uma variacao ativa e obrigatoria.' } },
  });
  await assert.rejects(
    solicitarAtualizacaoStatusVariacao({
      apiClient: { patch: async () => { throw falha; } },
      produtoId: 12,
      variacao: { id: 7, ativo: true },
      confirmarInativacao: () => true,
    }),
    (erro) => erro === falha,
  );
});

test('preserva status HTTP e mensagem do backend para exibir a causa real na tela', () => {
  assert.equal(
    obterMensagemErroStatusVariacao({
      response: { status: 409, data: { erro: 'Este produto precisa possuir pelo menos uma variação ativa.' } },
    }),
    'Este produto precisa possuir pelo menos uma variação ativa.',
  );
  assert.equal(
    obterMensagemErroStatusVariacao({
      response: { status: 403, data: { erro: 'Acesso negado' } },
    }),
    'Erro HTTP 403: Acesso negado',
  );
});

test('botoes de status sao explicitos e nao submetem o formulario', () => {
  const pagina = fs.readFileSync(new URL('../src/pages/EditarProduto.jsx', import.meta.url), 'utf8');
  assert.match(pagina, /type="button"\s+onClick=\{\(\) => alterarStatusVariacao\(v\)\}/);
});
