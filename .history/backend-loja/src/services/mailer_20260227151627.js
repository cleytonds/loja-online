import nodemailer from "nodemailer";

// Configuração do transporte (exemplo com Gmail)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "SEU_EMAIL@gmail.com",
    pass: "SUA_SENHA_DE_APLICATIVO", // Gmail precisa de App Password
  },
});

export async function enviarEmailConfirmacao(emailDestino, token) {
  const link = `http://localhost:5173/confirmar/${token}`;
  const mailOptions = {
    from: "SEU_EMAIL@gmail.com",
    to: emailDestino,
    subject: "Confirme seu email",
    html: `<p>Olá! Clique no link abaixo para confirmar seu email:</p>
           <a href="${link}">Confirmar Email</a>`,
  };

  await transporter.sendMail(mailOptions);
}