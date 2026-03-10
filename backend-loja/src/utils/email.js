// src/utils/email.js
import nodemailer from "nodemailer";

export async function enviarEmail(destinatario, assunto, mensagem) {
  // Configura o transporte SMTP usando Gmail
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
    secure: process.env.SMTP_SECURE === "true", // true para 465, false para outras portas
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: `"DLmodas" <${process.env.SMTP_USER}>`,
    to: destinatario,
    subject: assunto,
    html: mensagem, // já vem formatado do authRoutes.js
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email enviado para ${destinatario}`);
  } catch (err) {
    console.error(`Erro ao enviar email para ${destinatario}:`, err);
    throw new Error("Erro ao enviar email");
  }
}