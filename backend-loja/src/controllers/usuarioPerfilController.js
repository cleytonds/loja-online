import bcrypt from 'bcryptjs';
import db from '../config/database.js';

const padronizarErro = (mensagem, detalhe = null) => {
  if (detalhe) return { error: mensagem, detalhe };
  return { error: mensagem };
};

const getUsuarioIdLogado = (req) => req?.user?.id;

export async function getPerfil(req, res) {
  try {
    const userId = getUsuarioIdLogado(req);
    if (!userId) return res.status(401).json(padronizarErro('Não autorizado'));

    const [rows] = await db.query(
      `
      SELECT 
        id,
        nome,
        email,
        foto,

        celular,
        rua,
        numero,
        bairro,
        cidade,
        estado,
        cep,

        tipo,
        ativo

      FROM usuarios
      WHERE id = ?
      `,
      [userId],
    );

    if (!rows?.length) return res.status(404).json(padronizarErro('Usuário não encontrado'));

    const usuario = rows[0];
    return res.json(usuario);
  } catch (err) {
    console.error('ERRO GET /usuarios/perfil:', err);
    return res.status(500).json(padronizarErro('Erro ao buscar perfil'));
  }
}

export async function putPerfil(req, res) {
  try {
    const userId = getUsuarioIdLogado(req);

    if (!userId) {
      return res.status(401).json(padronizarErro('Não autorizado'));
    }

    const {
      nome,
      email,
      foto,

      celular,
      rua,
      numero,
      bairro,
      cidade,
      estado,
      cep,
    } = req.body ?? {};

    if (
      nome == null &&
      email == null &&
      foto == null &&
      celular == null &&
      rua == null &&
      numero == null &&
      bairro == null &&
      cidade == null &&
      estado == null &&
      cep == null
    ) {
      return res.status(400).json(padronizarErro('Informe algum dado para atualizar'));
    }

    const emailNormalizado = typeof email === 'string' ? email.trim().toLowerCase() : null;

    const nomeNormalizado = typeof nome === 'string' ? nome.trim() : null;

    if (nomeNormalizado !== null && nomeNormalizado.length === 0) {
      return res.status(400).json(padronizarErro('Nome inválido'));
    }

    if (emailNormalizado !== null) {
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!regex.test(emailNormalizado)) {
        return res.status(400).json(padronizarErro('Email inválido'));
      }

      const [existsRows] = await db.query(
        `
        SELECT id 
        FROM usuarios
        WHERE email = ?
        AND id <> ?
        LIMIT 1
        `,
        [emailNormalizado, userId],
      );

      if (existsRows.length) {
        return res.status(400).json(padronizarErro('Email já cadastrado'));
      }
    }

    const updates = [];
    const params = [];

    const campos = {
      nome: nomeNormalizado,

      email: emailNormalizado,

      foto,

      celular,

      rua,

      numero,

      bairro,

      cidade,

      estado,

      cep,
    };

    Object.entries(campos).forEach(([campo, valor]) => {
      if (valor !== null && valor !== undefined) {
        updates.push(`${campo} = ?`);

        params.push(valor);
      }
    });

    const sql = `
      UPDATE usuarios
      SET ${updates.join(', ')}
      WHERE id = ?
    `;

    params.push(userId);

    await db.query(sql, params);

    const [rows] = await db.query(
      `
      SELECT

      id,
      nome,
      email,
      foto,

      celular,
      rua,
      numero,
      bairro,
      cidade,
      estado,
      cep,

      tipo,
      ativo

      FROM usuarios
      WHERE id = ?

      `,
      [userId],
    );

    return res.json(rows[0]);
  } catch (err) {
    console.error('ERRO PUT /usuarios/perfil:', err);

    return res.status(500).json(padronizarErro('Erro ao atualizar perfil'));
  }
}
export async function putSenha(req, res) {
  try {
    const userId = getUsuarioIdLogado(req);
    if (!userId) return res.status(401).json(padronizarErro('Não autorizado'));

    const { senhaAtual, novaSenha } = req.body ?? {};

    if (!senhaAtual || !novaSenha) {
      return res.status(400).json(padronizarErro('Informe senhaAtual e novaSenha'));
    }

    const [rows] = await db.query('SELECT senha FROM usuarios WHERE id = ? LIMIT 1', [userId]);
    if (!rows?.length) return res.status(404).json(padronizarErro('Usuário não encontrado'));

    const senhaHashAtual = rows[0].senha;
    const senhaValida = await bcrypt.compare(String(senhaAtual), senhaHashAtual);
    if (!senhaValida) return res.status(401).json(padronizarErro('Senha atual incorreta'));

    // Opcional simples: mínimo de tamanho para produção (não destrutivo)
    if (String(novaSenha).length < 6) {
      return res.status(400).json(padronizarErro('A nova senha deve ter pelo menos 6 caracteres'));
    }

    const novaHash = await bcrypt.hash(String(novaSenha), 10);

    await db.query('UPDATE usuarios SET senha = ? WHERE id = ?', [novaHash, userId]);

    return res.json({ mensagem: 'Senha alterada com sucesso' });
  } catch (err) {
    console.error('ERRO PUT /usuarios/senha:', err);
    return res.status(500).json(padronizarErro('Erro ao alterar senha'));
  }
}

export async function getFavoritos(req, res) {
  try {
    const userId = getUsuarioIdLogado(req);
    if (!userId) return res.status(401).json(padronizarErro('Não autorizado'));

    // Sem quebrar: tentamos uma estrutura comum. Se não existir, falha controlada.
    // Sugestão de compatibilidade: tabela pode ser `favoritos` com usuario_id e produto_id.
    const [rows] = await db.query('SELECT * FROM favoritos WHERE usuario_id = ? ORDER BY id DESC', [
      userId,
    ]);

    return res.json(rows);
  } catch (err) {
    console.error('ERRO GET /usuarios/favoritos:', err);
    // Se a tabela não existir, devolve erro objetivo sem quebrar outros endpoints.
    return res.status(500).json(padronizarErro('Erro ao listar favoritos'));
  }
}
