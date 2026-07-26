const SECRET_KEY = /(authorization|password|senha|token|secret|access[_-]?token|webhook)/i;

function sanitize(value) {
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, SECRET_KEY.test(key) ? '[REDACTED]' : item]));
}

export const logger = {
  info(message, context) { console.info(message, context ? sanitize(context) : ''); },
  warn(message, context) { console.warn(message, context ? sanitize(context) : ''); },
  error(message, context) { console.error(message, context ? sanitize(context) : ''); },
};
