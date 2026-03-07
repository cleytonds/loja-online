const db = require("../database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const SECRET = "segredo123"; // você pode colocar uma variável de ambiente

// Cadastro
exports.cadastro = (req, res) => {
  const { nome, email, senha } = req.body;

  const hash = bcrypt.hashSync(senha, 8);

  const sql = "INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)";
  db.query(sql, [nome, email, hash], (err, result) => {
    if (err) return res.status(500).json({ error: "Erro ao cadastrar" });

    res.json({ message: "Cadastro realizado com sucesso!" });
  });
};

// Login
exports.login = (req, res) => {
  const { email, senha } = req.body;

  const sql = "SELECT * FROM usuarios WHERE email = ?";
  db.query(sql, [email], (err, results) => {
    if (err) return res.status(500).json({ error: "Erro no login" });
    if (results.length === 0) return res.status(400).json({ error: "Email não encontrado" });

    const user = results[0];
    const senhaValida = bcrypt.compareSync(senha, user.senha);

    if (!senhaValida) return res.status(400).json({ error: "Senha incorreta" });

    const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: "1h" });
    res.json({ token });
  });
};