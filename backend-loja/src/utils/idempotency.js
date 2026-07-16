export function normalizeIdempotencyKey(value) {
  const key = String(value || '').trim();

  return /^[A-Za-z0-9][A-Za-z0-9._:-]{15,99}$/.test(key) ? key : null;
}

export function isDuplicateKeyError(error) {
  return error?.code === 'ER_DUP_ENTRY' && String(error?.message || '').includes('idempotency_key');
}
