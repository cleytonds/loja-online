// atualizarSenhas.js
import bcrypt from "bcryptjs";
import db from "./src/config/database.js"; // caminho correto do database

async function atualizarSenhas() {
  try {
    // 1️⃣ Buscar apenas usuários ativos
    const [usuarios] = await db.promise().query(
      "SELECT id, senha FROM usuarios WHERE ativo = 1"
    );

    for (const usuario of usuarios) {
      const { id, senha } = usuario;

      // 2️⃣ Ignorar senhas já criptografadas
      if (senha.startsWith("$2a$") || senha.startsWith("$2b$")) {
        console.log(`Usuário ${id} já possui senha criptografada`);
        continue;
      }

      // 3️⃣ Criptografar senha
      const hash = await bcrypt.hash(senha, 10);

      // 4️⃣ Atualizar senha no banco
      await db.promise().query("UPDATE usuarios SET senha = ? WHERE id = ?", [hash, id]);
      console.log(`Senha do usuário ${id} atualizada com sucesso!`);
    }

    console.log("Processo finalizado ✅");
    process.exit(0);
  } catch (erro) {
    console.error("Erro no processo:", erro);
    process.exit(1);
  }
}

atualizarSenhas();