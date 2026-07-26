import nodemailer from 'nodemailer';

const SMTP_TIMEOUT_MS = 12000;
const EMAIL_API_TIMEOUT_MS = 12000;

function criarErro(message, code, status) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function registrarErroEmail(error, provider) {
  const tipo =
    error?.code === 'EAUTH'
      ? 'autenticacao'
      : error?.code === 'EEMAIL_CONFIG'
        ? 'configuracao'
        : error?.code === 'ETIMEDOUT' || error?.code === 'ESOCKET' || error?.code === 'EEMAIL_TIMEOUT'
          ? 'timeout_conexao'
          : Number(error?.status || error?.responseCode) >= 500
            ? 'provedor'
            : 'email';

  console.error('Falha no envio de e-mail', {
    provider,
    tipo,
    code: error?.code,
    status: error?.status || error?.responseCode,
    command: error?.command,
  });
}

function normalizarProvider(env) {
  return String(env.EMAIL_PROVIDER || 'smtp').trim().toLowerCase();
}

function criarRemetente(env, { permitirFallbackSmtp = false } = {}) {
  const email = env.EMAIL_FROM || (permitirFallbackSmtp ? env.SMTP_USER : '');
  if (!email) throw criarErro('Remetente de e-mail não configurado', 'EEMAIL_CONFIG');

  return { email, name: env.EMAIL_FROM_NAME || 'DLmodas' };
}

async function enviarPorSmtp({ destinatario, assunto, mensagem, env, createTransport }) {
  const host = env.SMTP_HOST;
  const port = Number(env.SMTP_PORT);
  const user = env.SMTP_USER;
  const pass = env.SMTP_PASS;
  const from = criarRemetente(env, { permitirFallbackSmtp: true });

  if (!host || !Number.isInteger(port) || !user || !pass) {
    throw criarErro('Configuração SMTP incompleta', 'EEMAIL_CONFIG');
  }

  const transporter = createTransport({
    host,
    port,
    secure: env.SMTP_SECURE === 'true',
    auth: { user, pass },
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: SMTP_TIMEOUT_MS,
  });

  const resultado = await transporter.sendMail({
    from: `"${from.name}" <${from.email}>`,
    to: destinatario,
    subject: assunto,
    html: mensagem,
  });

  return { provider: 'smtp', messageId: resultado?.messageId };
}

async function enviarPorBrevo({ destinatario, assunto, mensagem, env, fetchImpl }) {
  const apiKey = env.BREVO_API_KEY;
  const from = criarRemetente(env);

  if (!apiKey) throw criarErro('Configuração Brevo incompleta', 'EEMAIL_CONFIG');
  if (typeof fetchImpl !== 'function') throw criarErro('Cliente HTTPS indisponível', 'EEMAIL_CONFIG');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EMAIL_API_TIMEOUT_MS);

  try {
    const response = await fetchImpl('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: from,
        to: [{ email: destinatario }],
        subject: assunto,
        htmlContent: mensagem,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw criarErro('Provedor de e-mail recusou o envio', 'EEMAIL_PROVIDER', response.status);
    }

    let body;
    try {
      body = await response.json();
    } catch {
      throw criarErro('Resposta invalida do provedor de e-mail', 'EEMAIL_PROVIDER', response.status);
    }

    if (typeof body?.messageId !== 'string' || !body.messageId.trim()) {
      throw criarErro('Resposta incompleta do provedor de e-mail', 'EEMAIL_PROVIDER', response.status);
    }

    return { provider: 'brevo', messageId: body.messageId.trim() };
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw criarErro('Tempo de conexão do provedor excedido', 'EEMAIL_TIMEOUT');
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export function criarServicoEmail(env = process.env, dependencies = {}) {
  const provider = normalizarProvider(env);
  const createTransport = dependencies.createTransport || nodemailer.createTransport;
  const fetchImpl = dependencies.fetchImpl || globalThis.fetch;

  return {
    provider,
    async enviar(destinatario, assunto, mensagem) {
      if (provider === 'smtp') {
        return enviarPorSmtp({ destinatario, assunto, mensagem, env, createTransport });
      }

      if (provider === 'brevo') {
        return enviarPorBrevo({ destinatario, assunto, mensagem, env, fetchImpl });
      }

      throw criarErro('Provedor de e-mail não suportado', 'EEMAIL_CONFIG');
    },
  };
}

export async function enviarEmail(destinatario, assunto, mensagem) {
  const service = criarServicoEmail();

  try {
    const resultado = await service.enviar(destinatario, assunto, mensagem);
    console.info('E-mail aceito pelo provedor', { provider: resultado.provider });
    return resultado;
  } catch (error) {
    registrarErroEmail(error, service.provider);
    throw criarErro('Não foi possível enviar o e-mail.', error?.code, error?.status);
  }
}
