import nodemailer from "nodemailer";

// Configure com seu email do Gmail
const EMAIL_USER = "seu-email@gmail.com"; // substitua pelo seu email real
const EMAIL_PASS = "sua-senha-de-app";     // senha de app do Gmail

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

// Função para enviar email de confirmação
export async function enviarEmailConfirmacao(destinatario, token) {
  const link = `http://localhost:5173/confirmar/${token}`; // seu frontend rota de confirmação

  await transporter.sendMail({
    from: `"DLmodas" <${EMAIL_USER}>`,
    to: destinatario,
    subject: "Confirme seu email",
    html: `
      <p>Olá!</p>
      <p>Clique no link abaixo para confirmar seu email e ativar sua conta:</p>
      <a href="${link}">Confirmar Email</a>
      <p>Se você não se cadastrou, ignore este email.</p>
    `,
  });
}