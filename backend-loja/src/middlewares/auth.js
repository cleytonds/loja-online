import jwt from "jsonwebtoken";

// 🔐 Middleware para verificar se o usuário está autenticado
export function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;

  // ❌ Se não tiver token
  if (!authHeader) {
    return res.status(401).json({ error: "Token não fornecido" });
  }

  // 👉 Formato esperado: "Bearer TOKEN"
  const partes = authHeader.split(" ");

  if (partes.length !== 2) {
    return res.status(401).json({ error: "Token mal formatado" });
  }

  const [bearer, token] = partes;

  // ❌ Se não começar com Bearer
  if (bearer !== "Bearer") {
    return res.status(401).json({ error: "Token inválido" });
  }

  try {
    // 🔍 Verifica token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "SUA_CHAVE"
    );

    // 💾 Salva dados do usuário na requisição
    req.user = decoded;

    next();

  } catch (err) {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
}