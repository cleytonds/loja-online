// src/services/mailer.js
import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: "smtp.seuservidor.com",  // Ex: smtp.gmail.com
  port: 587,
  secure: false,
  auth: {
    user: "seu-email@dominio.com",
    pass: "sua-senha-de-app",   // Gmail precisa de senha de app
  },
  connectionTimeout: 5000, // timeout 5 segundos
  greetingTimeout: 5000,   // timeout 5 segundos
  socketTimeout: 5000      // timeout 5 segundos
});

// Função para enviar email
export async function enviarEmailConfirmacao(destinatario, token) {
  const link = `http://192.168.0.106:5173/confirmar/${token}`;

  await transporter.sendMail({
    from: '"DLmodas" <seu-email@dominio.com>',
    to: destinatario,
    subject: "Confirme seu email",
    html: `
      <p>Olá! Clique no link abaixo para confirmar seu email:</p>
      <a href="${link}">${link}</a>
    `,
  });
}