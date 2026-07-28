import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import api from '../services/api';
import { montarUrlImagem } from '../utils/imagem.js';
import {
  normalizarVariacaoParaEdicao,
  validarPrecoPromocionalVariacao,
} from '../utils/variacoesAdmin.js';
import './EditarProduto.css';

export default function EditarProduto() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Estados do produto
  const [produto, setProduto] = useState(null);

  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('');

  const [categorias, setCategorias] = useState([]);
  const [variacoes, setVariacoes] = useState([]);

  const [imagens, setImagens] = useState([]);
  const [atualizandoVariacaoId, setAtualizandoVariacaoId] = useState(null);

  // Carregamento inicial

  useEffect(() => {
    carregarProduto();
    carregarCategorias();
  }, []);

  // Busca produto

  async function carregarProduto() {
    try {
      const res = await api.get(`/produtos/admin/${id}`);

      const p = res.data;

      setProduto(p);

      setNome(p.nome);
      setPreco(p.preco_base);
      setDescricao(p.descricao);
      setCategoria(p.categoria_id);

      setVariacoes((p.variacoes || []).map(normalizarVariacaoParaEdicao));
    } catch (err) {
      console.log(err);
    }
  }

  // Busca categorias

  async function carregarCategorias() {
    try {
      const res = await api.get('/produtos/categorias');

      setCategorias(res.data);
    } catch (err) {
      console.log(err);
    }
  }

  // Alterar dados da variação

  function alterarVariacao(index, campo, valor) {
    const novaLista = [...variacoes];

    novaLista[index][campo] = valor;

    setVariacoes(novaLista);
  }

  // Adicionar nova variação

  function adicionarVariacao() {
    setVariacoes([
      ...variacoes,
      {
        tamanho: '',
        cor: '',
        preco: '',
        preco_promocional: '',
        estoque: '',
        ativo: true,
      },
    ]);
  }

  // Selecionar imagens

  function selecionarImagem(e) {
    setImagens([...e.target.files]);
  }

  // Salvar produto

  async function salvar(e) {
    e.preventDefault();

    const erroPromocao = variacoes
      .map((variacao) => validarPrecoPromocionalVariacao(variacao.preco, variacao.preco_promocional))
      .find(Boolean);
    if (erroPromocao) {
      alert(erroPromocao);
      return;
    }

    const formData = new FormData();

    formData.append('nome', nome);
    formData.append('preco', preco);
    formData.append('descricao', descricao);
    formData.append('categoria', categoria);

    formData.append('variacoes', JSON.stringify(variacoes));

    imagens.forEach((img) => {
      formData.append('imagens', img);
    });

    try {
      await api.put(`/produtos/${id}`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,

          'Content-Type': 'multipart/form-data',
        },
      });

      alert('Produto atualizado');

      navigate('/admin');
    } catch (err) {
      console.log('ERRO COMPLETO:', err.response?.data || err);

      alert(err.response?.data?.error || 'Erro ao atualizar produto');
    }
  }

  async function alterarStatusVariacao(variacao) {
    if (!variacao?.id || atualizandoVariacaoId === variacao.id) return;

    try {
      setAtualizandoVariacaoId(variacao.id);
      const proximoAtivo = !variacao.ativo;
      const res = await api.patch(`/produtos/${id}/variacoes/${variacao.id}/status`, { ativo: proximoAtivo });

      setVariacoes((atuais) => atuais.map((item) => (
        Number(item.id) === Number(variacao.id)
          ? { ...item, ativo: Boolean(res.data?.ativo), estoque: res.data?.estoque ?? item.estoque }
          : item
      )));
    } catch (err) {
      alert(err.response?.data?.erro || 'Não foi possível atualizar o status da variação.');
    } finally {
      setAtualizandoVariacaoId(null);
    }
  }

  if (!produto) {
    return <h2>Carregando...</h2>;
  }

  return (
    <div className="editar-container">
      <h1>Editar Produto</h1>

      <form onSubmit={salvar}>
        <label>Nome</label>

        <input value={nome} onChange={(e) => setNome(e.target.value)} />

        <label>Preço</label>

        <input type="number" value={preco} onChange={(e) => setPreco(e.target.value)} />

        <label>Descrição</label>

        <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} />

        <label>Categoria</label>

        <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          <option value="">Selecione</option>

          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>

        <h2>Imagens</h2>

        <div className="imagens">
          {produto.imagens?.map((img) => (
            <img key={img.id} src={montarUrlImagem(img.url)} />
          ))}
        </div>

        <input type="file" multiple onChange={selecionarImagem} />

        <h2>Variações</h2>

        {variacoes.map((v, index) => (
          <div className="variacao-box" key={index}>
            <input
              placeholder="Tamanho"
              value={v.tamanho}
              onChange={(e) => alterarVariacao(index, 'tamanho', e.target.value)}
            />

            <input
              placeholder="Cor"
              value={v.cor}
              onChange={(e) => alterarVariacao(index, 'cor', e.target.value)}
            />

            <input
              type="number"
              placeholder="Preço"
              value={v.preco}
              onChange={(e) => alterarVariacao(index, 'preco', e.target.value)}
            />

            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Preço promocional (opcional)"
              value={v.preco_promocional ?? ''}
              onChange={(e) => alterarVariacao(index, 'preco_promocional', e.target.value)}
            />

            <input
              type="number"
              placeholder="Estoque"
              value={v.estoque}
              onChange={(e) => alterarVariacao(index, 'estoque', e.target.value)}
            />

            <div className={`variacao-status ${v.ativo ? 'ativa' : 'inativa'}`}>
              <span>{v.ativo ? '🟢 Ativa' : '🔴 Inativa'}</span>
              {v.id ? (
                <button
                  type="button"
                  onClick={() => alterarStatusVariacao(v)}
                  disabled={atualizandoVariacaoId === v.id}
                >
                  {atualizandoVariacaoId === v.id
                    ? 'Atualizando...'
                    : v.ativo ? 'Inativar' : 'Reativar'}
                </button>
              ) : null}
            </div>
          </div>
        ))}

        <button type="button" onClick={adicionarVariacao}>
          + Nova variação
        </button>

        <button className="salvar">Salvar alterações</button>
      </form>
    </div>
  );
}
