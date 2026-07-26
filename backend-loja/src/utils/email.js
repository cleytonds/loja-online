// src/utils/email.js
import nodemailer from "nodemailer";

// O cadastro depende deste serviço, portanto o tempo de espera precisa ser
// curto o suficiente para não manter a interface bloqueada quando o SMTP cair.
const SMTP_TIMEOUT_MS = 12000;

function registrarErroSmtp(err) {
  const tipo =
    err?.code === 'EAUTH'
      ? 'autenticacao'
      : err?.code === 'EENVELOPE'
        ? 'destinatario_invalido'
      : err?.code === 'ETIMEDOUT' || err?.code === 'ESOCKET'
        ? 'timeout_conexao'
        : Number(err?.responseCode) >= 500
          ? 'destinatario_ou_servidor'
          : 'smtp';

  console.error('Falha no envio de e-mail', {
    tipo,
    code: err?.code,
    responseCode: err?.responseCode,
    command: err?.command,
  });
}

export async function enviarEmail(destinatario, assunto, mensagem) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || user;

  if (!host || !Number.isInteger(port) || !user || !pass || !from) {
    const error = new Error('Configuração SMTP incompleta');
    error.code = 'ESMTP_CONFIG';
    registrarErroSmtp(error);
    throw error;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user,
      pass,
    },
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: SMTP_TIMEOUT_MS,
  });

  const mailOptions = {
    from: `"DLmodas" <${from}>`,
    to: destinatario,
    subject: assunto,
    html: mensagem, // já vem formatado do authRoutes.js
  };

  try {
    await transporter.sendMail(mailOptions);
    console.info('Email enviado');
  } catch (err) {
    registrarErroSmtp(err);
    throw new Error("Não foi possível enviar o e-mail de recuperação.");
  }
}
