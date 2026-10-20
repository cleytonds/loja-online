import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { removerImagensProduto } from './uploadProduto.js';

const MAX_DIMENSION = 2400;
const INPUT_OPTIONS = { limitInputPixels: 40_000_000, animated: true, failOn: 'warning' };
const FORMATS = { '.jpg': 'jpeg', '.jpeg': 'jpeg', '.png': 'png', '.webp': 'webp' };
let optimizationQueue = Promise.resolve();

async function prepararWebp(input, originalname) {
  try {
    const image = sharp(input, INPUT_OPTIONS).timeout({ seconds: 10 });
    const metadata = await image.metadata();
    if (metadata.format !== FORMATS[path.extname(originalname || '').toLowerCase()]) {
      throw new Error('Formato de imagem incompatível');
    }

    // Keep animation and already-sized WebP intact, but decode to reject corrupt pixels.
    if (metadata.pages > 1 || (metadata.format === 'webp'
      && metadata.width <= MAX_DIMENSION && metadata.height <= MAX_DIMENSION)) {
      await image.raw().toBuffer();
      return null;
    }

    const output = await image
      .autoOrient()
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
      .withIccProfile('srgb')
      // PNG artwork/transparency stays lossless; photographs use high-quality WebP.
      .webp({ quality: 90, alphaQuality: 100, smartSubsample: true, lossless: metadata.format === 'png', effort: 4 })
      .toBuffer();

    return output.length < input.length ? output : null;
  } catch (cause) {
    throw Object.assign(new Error('Arquivo inválido. Utilize JPG, PNG ou WEBP.', { cause }), { statusCode: 400 });
  }
}

export async function otimizarImagensProduto(req, res, next) {
  const files = Array.isArray(req.files) ? req.files : [];
  if (!files.length) return next();
  const generated = [];
  const previous = optimizationQueue;
  let release;
  optimizationQueue = new Promise((resolve) => { release = resolve; });
  await previous;

  try {
    // One batch at a time bounds native memory across requests in this process.
    for (const file of files) {
      const input = await fs.readFile(file.path);
      const output = await prepararWebp(input, file.originalname);
      file.size = input.length;
      if (!output) continue;

      const filename = `${randomUUID()}.optimized.webp`;
      const destination = path.dirname(file.path);
      const outputPath = path.join(destination, filename);
      const handle = await fs.open(outputPath, 'wx');
      generated.push({ path: outputPath });
      try {
        await handle.writeFile(output);
      } finally {
        await handle.close();
      }
      await fs.unlink(file.path);
      Object.assign(file, { filename, path: outputPath, destination, mimetype: 'image/webp', size: output.length });
    }
  } catch (error) {
    removerImagensProduto(generated);
    removerImagensProduto(files);
    if (error.statusCode === 400) return res.status(400).json({ erro: error.message });
    return next(error);
  } finally {
    release();
  }

  return next();
}
