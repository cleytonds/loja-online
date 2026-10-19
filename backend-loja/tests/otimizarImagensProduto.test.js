import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { otimizarImagensProduto } from '../src/middlewares/otimizarImagensProduto.js';

async function fixture(t, entries) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'dlmodas-optimize-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const files = [];
  for (const [filename, bytes] of entries) {
    const filePath = path.join(directory, filename);
    await fs.writeFile(filePath, bytes);
    files.push({ path: filePath, filename, originalname: filename, size: bytes.length });
  }
  return { directory, req: { files } };
}

async function run(req) {
  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  let advanced = false;
  let error;
  await otimizarImagensProduto(req, res, (err) => { advanced = true; error = err; });
  return { res, advanced, error };
}

function colorPattern(width, height) {
  const pixels = Buffer.alloc(width * height * 3);
  const colors = [[210, 25, 40], [30, 180, 65], [35, 65, 210], [210, 180, 30]];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const color = colors[(y >= height / 2 ? 2 : 0) + (x >= width / 2 ? 1 : 0)];
      for (let c = 0; c < 3; c++) pixels[(y * width + x) * 3 + c] = color[c];
    }
  }
  return sharp(pixels, { raw: { width, height, channels: 3 } });
}

async function assertColorsClose(actual, expected, tolerance = 8) {
  const a = await sharp(actual).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const e = await sharp(expected).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(a.info.width, e.info.width);
  assert.equal(a.info.height, e.info.height);
  for (const fy of [0.25, 0.75]) {
    for (const fx of [0.25, 0.75]) {
      const offset = (Math.floor(a.info.height * fy) * a.info.width + Math.floor(a.info.width * fx)) * 3;
      for (let c = 0; c < 3; c++) {
        assert.ok(Math.abs(a.data[offset + c] - e.data[offset + c]) <= tolerance,
          `color channel ${c}: ${a.data[offset + c]} vs ${e.data[offset + c]}`);
      }
    }
  }
}

test('large JPEG becomes smaller WebP inside 2400px, preserving aspect and other stored files', async (t) => {
  const input = await colorPattern(3000, 1500).jpeg({ quality: 100, chromaSubsampling: '4:4:4' }).toBuffer();
  const { req, directory } = await fixture(t, [['nova.jpeg', input]]);
  await fs.writeFile(path.join(directory, 'existente.jpg'), 'do not touch');
  const result = await run(req);
  assert.equal(result.advanced, true);
  assert.equal(result.error, undefined);
  const [file] = req.files;
  assert.match(file.filename, /^[\da-f-]{36}\.optimized\.webp$/);
  assert.equal(file.mimetype, 'image/webp');
  const output = await fs.readFile(file.path);
  assert.equal(file.size, output.length);
  assert.ok(output.length < input.length);
  const metadata = await sharp(output).metadata();
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, 2400);
  assert.equal(metadata.height, 1200);
  assert.equal(metadata.hasProfile, true);
  assert.equal(metadata.orientation, undefined);
  await assert.rejects(fs.stat(path.join(directory, 'nova.jpeg')), { code: 'ENOENT' });
  assert.equal(await fs.readFile(path.join(directory, 'existente.jpg'), 'utf8'), 'do not touch');
});

for (const orientation of [2, 6]) {
  test(`EXIF orientation ${orientation} is baked into pixels without crop or enlargement`, async (t) => {
    const input = await colorPattern(400, 200).withMetadata({ orientation })
      .jpeg({ quality: 100, chromaSubsampling: '4:4:4' }).toBuffer();
    const expected = await sharp(input).autoOrient().withIccProfile('srgb').png().toBuffer();
    const { req } = await fixture(t, [['orientada.jpg', input]]);
    const result = await run(req);
    assert.equal(result.advanced, true);
    assert.match(req.files[0].filename, /\.optimized\.webp$/);
    const output = await fs.readFile(req.files[0].path);
    await assertColorsClose(output, expected);
    const metadata = await sharp(output).metadata();
    assert.equal(metadata.orientation, undefined);
    assert.equal(metadata.exif, undefined);
  });
}

for (const profile of ['p3', 'cmyk']) {
  test(`${profile} profile is converted to sRGB with clothing colors preserved`, async (t) => {
    const input = await colorPattern(400, 200).withIccProfile(profile)
      .jpeg({ quality: 100, chromaSubsampling: '4:4:4' }).toBuffer();
    const expected = await sharp(input).withIccProfile('srgb').png().toBuffer();
    const { req } = await fixture(t, [['perfil.jpg', input]]);
    assert.equal((await run(req)).advanced, true);
    assert.match(req.files[0].filename, /\.optimized\.webp$/);
    const output = await fs.readFile(req.files[0].path);
    const metadata = await sharp(output).metadata();
    assert.equal(metadata.space, 'srgb');
    assert.equal(metadata.hasProfile, true);
    await assertColorsClose(output, expected);
  });
}

test('PNG stays lossless with alpha and is not enlarged', async (t) => {
  const pixels = Buffer.alloc(120 * 80 * 4);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 190; pixels[i + 1] = 40; pixels[i + 2] = 80;
    pixels[i + 3] = 50 + (i / 4) % 200;
  }
  const input = await sharp(pixels, { raw: { width: 120, height: 80, channels: 4 } })
    .png({ compressionLevel: 0 }).toBuffer();
  const { req } = await fixture(t, [['transparente.png', input]]);
  assert.equal((await run(req)).advanced, true);
  assert.match(req.files[0].filename, /\.optimized\.webp$/);
  const output = await fs.readFile(req.files[0].path);
  const metadata = await sharp(output).metadata();
  assert.equal(metadata.width, 120);
  assert.equal(metadata.height, 80);
  assert.equal(metadata.hasAlpha, true);
  const decoded = await sharp(output).raw().toBuffer();
  assert.deepEqual(decoded, pixels);
});

test('keeps original when WebP would increase file size', async (t) => {
  const input = await sharp({ create: { width: 1, height: 1, channels: 3, background: 'white' } }).png().toBuffer();
  const { req, directory } = await fixture(t, [['pequena.png', input]]);
  assert.equal((await run(req)).advanced, true);
  assert.equal(req.files[0].filename, 'pequena.png');
  assert.deepEqual(await fs.readFile(req.files[0].path), input);
  assert.deepEqual(await fs.readdir(directory), ['pequena.png']);
});

test('already-sized WebP is decoded but kept byte-for-byte to avoid generational loss', async (t) => {
  const input = await colorPattern(120, 80).webp({ quality: 90 }).toBuffer();
  const { req } = await fixture(t, [['pronta.webp', input]]);
  assert.equal((await run(req)).advanced, true);
  assert.equal(req.files[0].filename, 'pronta.webp');
  assert.deepEqual(await fs.readFile(req.files[0].path), input);
});

test('animated WebP retains every frame, timing and original bytes', async (t) => {
  const pixels = Buffer.alloc(24 * 48 * 3);
  pixels.fill(20, 0, 24 * 24 * 3);
  pixels.fill(220, 24 * 24 * 3);
  const input = await sharp(pixels, { raw: { width: 24, height: 48, channels: 3, pageHeight: 24 } })
    .webp({ loop: 0, delay: [50, 70] }).toBuffer();
  const { req } = await fixture(t, [['animada.webp', input]]);
  assert.equal((await run(req)).advanced, true);
  const output = await fs.readFile(req.files[0].path);
  assert.deepEqual(output, input);
  const metadata = await sharp(output, { animated: true }).metadata();
  assert.equal(metadata.pages, 2);
  assert.deepEqual(metadata.delay, [50, 70]);
  assert.equal(metadata.loop, 0);
});

test('rejects a tiny file declaring more than 40 million pixels before decoding', async (t) => {
  const input = await sharp({ create: { width: 1, height: 1, channels: 3, background: 'white' } }).png().toBuffer();
  input.writeUInt32BE(7000, 16);
  input.writeUInt32BE(6000, 20);
  // Recompute the PNG IHDR checksum after simulating an oversized image header.
  let checksum = 0xffffffff;
  for (const byte of input.subarray(12, 29)) {
    checksum ^= byte;
    for (let bit = 0; bit < 8; bit++) checksum = (checksum >>> 1) ^ (checksum & 1 ? 0xedb88320 : 0);
  }
  input.writeUInt32BE((checksum ^ 0xffffffff) >>> 0, 29);
  assert.equal((await sharp(input).metadata()).width, 7000);
  const { req, directory } = await fixture(t, [['gigante.png', input]]);
  const result = await run(req);
  assert.equal(result.res.statusCode, 400);
  assert.equal(result.advanced, false);
  assert.deepEqual(await fs.readdir(directory), []);
});

test('rejects a corrupt second upload and cleans the whole batch, leaving stored images untouched', async (t) => {
  const input = await colorPattern(400, 200).jpeg({ quality: 100 }).toBuffer();
  const { req, directory } = await fixture(t, [['valida.jpg', input], ['truncada.jpg', Buffer.from([0xff, 0xd8, 0xff, 0x00])]]);
  await fs.writeFile(path.join(directory, 'existente.webp'), 'existing image');
  const result = await run(req);
  assert.equal(result.advanced, false);
  assert.equal(result.res.statusCode, 400);
  assert.deepEqual(await fs.readdir(directory), ['existente.webp']);
  assert.equal(await fs.readFile(path.join(directory, 'existente.webp'), 'utf8'), 'existing image');
});

test('rejects mismatched extension without storing incorrect HTTP content types', async (t) => {
  const input = await colorPattern(100, 50).png().toBuffer();
  const { req, directory } = await fixture(t, [['png-disfarcado.jpg', input]]);
  assert.equal((await run(req)).res.statusCode, 400);
  assert.deepEqual(await fs.readdir(directory), []);
});

test('write failure cleans new uploads and propagates an infrastructure error', async (t) => {
  const input = await colorPattern(400, 200).jpeg({ quality: 100 }).toBuffer();
  const { req, directory } = await fixture(t, [['nova.jpg', input]]);
  t.mock.method(fs, 'open', async () => { throw Object.assign(new Error('no space'), { code: 'ENOSPC' }); });
  const result = await run(req);
  assert.equal(result.error?.code, 'ENOSPC');
  assert.equal(result.advanced, true);
  assert.deepEqual(await fs.readdir(directory), []);
});

test('partially written output is removed together with the original upload', async (t) => {
  const input = await colorPattern(400, 200).jpeg({ quality: 100 }).toBuffer();
  const { req, directory } = await fixture(t, [['nova.jpg', input]]);
  const realOpen = fs.open;
  t.mock.method(fs, 'open', async (...args) => {
    const handle = await realOpen(...args);
    const realWrite = handle.writeFile.bind(handle);
    handle.writeFile = async (output) => {
      await realWrite(output.subarray(0, 20));
      throw Object.assign(new Error('no space after partial write'), { code: 'ENOSPC' });
    };
    return handle;
  });
  const result = await run(req);
  assert.equal(result.error?.code, 'ENOSPC');
  assert.deepEqual(await fs.readdir(directory), []);
});

test('passes a request without new files through unchanged', async () => {
  const req = { body: { nome: 'only metadata' } };
  assert.equal((await run(req)).advanced, true);
  assert.equal(req.files, undefined);
});
