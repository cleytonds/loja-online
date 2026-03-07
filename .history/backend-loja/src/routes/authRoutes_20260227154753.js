import Usuario from "../models/Usuario.js"; // seu model
import bcrypt from "bcryptjs"; // ✅ CORRETO

// Função de cadastro
export async function cadastro(req, res) {
  const { nome, email, senha } = req.body;

  // 1️⃣ Validar email
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email)) {
    return res.status(400).json({ error: "Email inválido!" });
  }

  try {
    // 2️⃣ Verificar se o email já existe
    const existe = await Usuario.findOne({ where: { email } });
    if (existe) {
      return res.status(400).json({ error: "Email já cadastrado!" });
    }

    // 3️⃣ Criar hash da senha
    const hashSenha = await bcrypt.hash(senha, 10);

    // 4️⃣ Salvar no banco
    await Usuario.create({ nome, email, senha: hashSenha });

    res.status(201).json({ success: "Cadastro realizado com sucesso!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no servidor ❌" });
  }
}

// Função de login (continua igual)
export async function login(req, res) {
  // seu código atual de login
}