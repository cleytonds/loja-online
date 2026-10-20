import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import express from 'express';

import { productImagesStaticOptions } from '../src/config/productImagesStatic.js';
import { getUploadProductsDir } from '../src/config/runtime.js';

const optimizedName = '8105c6f1-36b1-4a5d-bc69-32a171e74dcb.optimized.webp';
const fixtureBytes = Buffer.from('synthetic public image fixture');

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dlmodas-image-cache-'));
  const directory = path.join(root, 'produtos');
  await fs.mkdir(directory);
  await fs.writeFile(path.join(directory, optimizedName), fixtureBytes);

  const app = express();
  app.use('/uploads/produtos', express.static(directory, productImagesStaticOptions));
  app.get('/api/example', (req, res) => res.json({ ok: true }));
  app.use((req, res) => res.status(404).end());
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await fs.rm(root, { recursive: true, force: true });
  });

  function request(requestPath, options = {}) {
    return new Promise((resolve, reject) => {
      const req = http.request({
        host: '127.0.0.1', port: server.address().port, path: requestPath,
        ...options,
      }, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
        res.on('error', reject);
      });
      req.on('error', reject);
      req.end();
    });
  }
  return { root, directory, request };
}

test('production upload root /data resolves to /data/produtos', () => {
  assert.equal(getUploadProductsDir({ NODE_ENV: 'production', UPLOAD_DIR: '/data' }), path.resolve('/data', 'produtos'));
});

test('public optimized images receive immutable caching and retain cross-origin access', async (t) => {
  const { request } = await fixture(t);
  const response = await request(`/uploads/produtos/${optimizedName}`);
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, fixtureBytes);
  assert.equal(response.headers['content-type'], 'image/webp');
  assert.equal(response.headers['cache-control'], 'public, max-age=31536000, immutable');
  assert.equal(response.headers['cross-origin-resource-policy'], 'cross-origin');
  assert.ok(response.headers.etag);
  assert.ok(response.headers['last-modified']);
});

test('HEAD and conditional requests retain the image cache headers without a body', async (t) => {
  const { request } = await fixture(t);
  const url = `/uploads/produtos/${optimizedName}`;
  const get = await request(url);
  const head = await request(url, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(head.body.length, 0);
  assert.equal(head.headers['content-length'], String(fixtureBytes.length));
  assert.equal(head.headers.etag, get.headers.etag);
  assert.equal(head.headers['cache-control'], get.headers['cache-control']);

  for (const headers of [
    { 'If-None-Match': get.headers.etag },
    { 'If-Modified-Since': get.headers['last-modified'] },
  ]) {
    const response = await request(url, { headers });
    assert.equal(response.status, 304);
    assert.equal(response.body.length, 0);
    assert.equal(response.headers['cache-control'], get.headers['cache-control']);
    assert.equal(response.headers['cross-origin-resource-policy'], 'cross-origin');
  }
});

test('legacy names and formats use short caching with revalidation instead of immutable', async (t) => {
  const { directory, request } = await fixture(t);
  for (const name of [
    'roupa.jpg', 'roupa.jpeg', 'roupa.png', 'roupa.webp',
    '8105c6f1-36b1-4a5d-bc69-32a171e74dcb.webp',
    'roupa.optimized.webp',
  ]) {
    await fs.writeFile(path.join(directory, name), fixtureBytes);
    const response = await request(`/uploads/produtos/${name}`);
    assert.equal(response.status, 200, name);
    assert.equal(response.headers['cache-control'], 'public, max-age=3600, must-revalidate', name);
    assert.equal(response.headers['cross-origin-resource-policy'], 'cross-origin', name);
    assert.ok(response.headers.etag, name);
    assert.ok(response.headers['last-modified'], name);
    const revalidated = await request(`/uploads/produtos/${name}`, { headers: { 'If-None-Match': response.headers.etag } });
    assert.equal(revalidated.status, 304, name);
  }
});

test('missing images and unrelated API responses do not receive a public image cache policy', async (t) => {
  const { request } = await fixture(t);
  for (const url of ['/uploads/produtos/missing.jpg', '/uploads/produtos/00000000-0000-4000-8000-000000000000.optimized.webp']) {
    const response = await request(url);
    assert.equal(response.status, 404);
    assert.equal(response.headers['cache-control'], undefined);
  }
  const api = await request('/api/example');
  assert.equal(api.status, 200);
  assert.equal(api.headers['cache-control'], undefined);
});

test('dotfiles, traversal and directories are not served, cached, listed or redirected', async (t) => {
  const { root, directory, request } = await fixture(t);
  await fs.writeFile(path.join(directory, '.private.webp'), 'private');
  await fs.writeFile(path.join(root, 'secret.webp'), 'private');
  await fs.writeFile(path.join(directory, 'index.html'), 'private');
  await fs.mkdir(path.join(directory, 'folder'));
  await fs.writeFile(path.join(directory, 'folder', 'index.html'), 'private');
  for (const url of [
    '/uploads/produtos/.private.webp', '/uploads/produtos/%2eprivate.webp',
    '/uploads/produtos/../secret.webp', '/uploads/produtos/%2e%2e%2fsecret.webp',
    '/uploads/produtos', '/uploads/produtos/', '/uploads/produtos/folder', '/uploads/produtos/folder/',
  ]) {
    const response = await request(url);
    assert.equal(response.status, 404, url);
    assert.equal(response.headers['cache-control'], undefined, url);
    assert.equal(response.headers.location, undefined, url);
    assert.equal(response.body.length, 0, url);
  }
});
