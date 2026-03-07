import db from "../config/database.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SECRET = "segredo123"; // depois você pode usar variável de ambiente

// Cadastro
// Cadastro
export const cadastro = (req, res) => {
  const { nome, email, senha } = req.body;

  // 1️⃣ Verifica se email já existe
  const sqlCheck = "SELECT id FROM usuarios WHERE email = ?";
  db.query(sqlCheck, [email], (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Erro no servidor" });
    }

    if (results.length > 0) {
      return res.status(400).json({
        error: "Este email já está cadastrado"
      });
    }

    // 2️⃣ Criptografa a senha
    const hash = bcrypt.hashSync(senha, 8);

    // 3️⃣ Insere usuário
    const sqlInsert =
      "INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)";

    db.query(sqlInsert, [nome, email, hash], (err2) => {
      if (err2) {
        return res.status(500).json({ error: "Erro ao cadastrar" });
      }

      res.json({ message: "Cadastro realizado com sucesso!" });
    });
  });
};

// Login
export const login = (req, res) => {
  const { email, senha } = req.body;

  const sql = "SELECT * FROM usuarios WHERE email = ?";
  db.query(sql, [email], (err, results) => {
    if (err) return res.status(500).json({ error: "Erro no login" });
    if (results.length === 0)
      return res.status(400).json({ error: "Email não encontrado" });

    const user = results[0];
    const senhaValida = bcrypt.compareSync(senha, user.senha);

    if (!senhaValida)
      return res.status(400).json({ error: "Senha incorreta" });

    const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: "1h" });
    res.json({ token });
  });
};