// src/services/mailer.js

import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 60000,
  greetingTimeout: 60000,
  socketTimeout: 60000,
});


// FUNÇÃO PARA ENVIAR EMAIL DE CONFIRMAÇÃO
export async function enviarEmailConfirmacao(destinatario, token, codigo) {

  const FRONT_URL = process.env.FRONT_URL || "http://localhost:5173";

  // IMPORTANTE: # para HashRouter
  const link = `${process.env.FRONT_URL}/#/confirmar/${token}`;

  await transporter.sendMail({

    from: `"DLmodas" <${process.env.SMTP_USER}>`,

    to: destinatario,

    subject: "Confirmação de cadastro - DLmodas",

    html: `
      <div style="font-family: Arial; padding:20px">

        <h2>Confirme seu cadastro</h2>

        <p>Olá!</p>

        <p>
        Para ativar sua conta na <strong>DLmodas</strong>,
        clique no botão abaixo:
        </p>

        <p>
        <a href="${link}"
        style="
        background:#facc15;
        padding:10px 20px;
        text-decoration:none;
        color:black;
        border-radius:5px;
        font-weight:bold;
        ">
        Confirmar cadastro
        </a>
        </p>

        <p>Ou utilize este código na tela de confirmação:</p>

        <h2>${codigo}</h2>

        <p>Se você não criou esta conta, ignore este email.</p>

      </div>
    `,
  });

}