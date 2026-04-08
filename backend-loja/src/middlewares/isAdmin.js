export function isAdmin(req, res, next) {
  // 🔐 verifica se veio do middleware verificarToken
  if (!req.user) {
    return res.status(401).json({ error: "Não autenticado" });
  }

  // 🔐 verifica se é admin
  if (req.user.tipo !== "admin") {
    return res.status(403).json({ error: "Acesso negado" });
  }

  next();
}