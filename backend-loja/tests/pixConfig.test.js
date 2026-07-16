import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPixConfig } from '../src/utils/pixConfig.js';

test('monta configuração PIX com chave e WhatsApp centralizados', () => {
  const config = buildPixConfig({ PIX_KEY: 'chave-teste', WHATSAPP_NUMERO: '+55 (81) 99356-1234' });

  assert.equal(config.pix_key, 'chave-teste');
  assert.equal(config.whatsapp_number, '5581993561234');
});

test('usa fallback para WhatsApp quando a variável não existe', () => {
  const config = buildPixConfig({ PIX_KEY: 'chave-fallback' });

  assert.equal(config.pix_key, 'chave-fallback');
  assert.equal(config.whatsapp_number, '');
});

test('rejeita número de WhatsApp sem código do país ou incompleto', () => {
  assert.equal(buildPixConfig({ WHATSAPP_NUMERO: '(81) 99356-1234' }).whatsapp_number, '');
  assert.equal(buildPixConfig({ WHATSAPP_NUMERO: '55119999999' }).whatsapp_number, '');
});
