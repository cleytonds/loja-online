// src/services/mailer.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,          // Ex: smtp.gmail.com
  port: Number(process.env.SMTP_PORT),  // 587 ou 465
  secure: process.env.SMTP_SECURE === "true", // true só para 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 60 * 1000, // 60s (evita ETIMEDOUT)
  greetingTimeout: 60 * 1000,
  socketTimeout: 60 * 1000,
});
console.log("SMTP_HOST:", process.env.SMTP_HOST);

// Função para enviar email de confirmação
export async function enviarEmailConfirmacao(destinatario, token) {
  const link = `${process.env.FRONT_URL}/confirmar/${token}`;

  await transporter.sendMail({
    from: `"DLmodas" <${process.env.SMTP_USER}>`,
    to: destinatario,
    subject: "Confirme seu email",
    html: `
      <p>Olá!</p>
      <p>Clique no link abaixo para confirmar seu email:</p>
      <a href="${link}">${link}</a>
    `,
  });
}