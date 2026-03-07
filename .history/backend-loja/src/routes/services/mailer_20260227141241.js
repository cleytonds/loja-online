import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: "smtp.seuservidor.com", // Ex: smtp.gmail.com
  port: 587,
  secure: false,
  auth: {
    user: "seu-email@dominio.com",
    pass: "sua-senha-de-app", // Gmail precisa de senha de app
  },
});

// Função para enviar email
export async function enviarEmailConfirmacao(destinatario, token) {
  const link = `http://localhost:5173/confirmar/${token}`; // link que o usuário vai clicar
  await transporter.sendMail({
    from: '"DLmodas" <seu-email@dominio.com>',
    to: destinatario,
    subject: "Confirme seu email",
    html: `<p>Olá! Clique no link para confirmar seu email:</p><a href="${link}">Confirmar Email</a>`,
  });
}