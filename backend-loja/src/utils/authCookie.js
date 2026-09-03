function refreshCookieName(env = process.env) {
  return String(env.AUTH_REFRESH_COOKIE_NAME || 'dl_refresh').trim() || 'dl_refresh';
}

function refreshTtlDays(env = process.env) {
  const days = Number.parseInt(env.REFRESH_TOKEN_TTL_DAYS || '30', 10);
  return Number.isInteger(days) && days > 0 ? days : 30;
}

function sameSite(env = process.env) {
  const value = String(env.AUTH_COOKIE_SAME_SITE || 'lax').trim().toLowerCase();
  return ['lax', 'strict', 'none'].includes(value) ? value : 'lax';
}

export function refreshCookieOptions(env = process.env) {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: sameSite(env),
    path: '/',
    maxAge: refreshTtlDays(env) * 24 * 60 * 60 * 1000,
  };
}

export function definirRefreshCookie(res, token, env = process.env) {
  res.cookie(refreshCookieName(env), token, refreshCookieOptions(env));
}

export function limparRefreshCookie(res, env = process.env) {
  const options = refreshCookieOptions(env);
  res.clearCookie(refreshCookieName(env), {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite,
    path: options.path,
  });
}

export function lerRefreshCookie(cookieHeader, env = process.env) {
  if (typeof cookieHeader !== 'string' || !cookieHeader) return null;

  const name = refreshCookieName(env);
  for (const item of cookieHeader.split(';')) {
    const separator = item.indexOf('=');
    if (separator < 1 || item.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(item.slice(separator + 1).trim()) || null;
    } catch {
      return null;
    }
  }
  return null;
}
