import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { removerImagensProduto } from './uploadProduto.js';
import { getUploadProductsDir } from '../config/runtime.js';

const MAX_DIMENSION = 1920;
const WEBP_QUALITY = 84;
const MIN_FREE_SPACE_AFTER_WRITE = 512 * 1024;
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

    const imageHeight = metadata.pageHeight || metadata.height;
    const exceedsMaxDimension = metadata.width > MAX_DIMENSION || imageHeight > MAX_DIMENSION;

    // Avoid generational loss for animations that already fit the public size limit.
    if (metadata.pages > 1 && !exceedsMaxDimension) {
      await image.raw().toBuffer();
      return { bytes: input, extension: '.webp', mimetype: 'image/webp', optimized: false };
    }

    const stats = metadata.format === 'png' ? await image.stats() : null;
    const preserveArtwork = metadata.format === 'png' && stats.entropy < 5;

    const output = await image
      .autoOrient()
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
      .withIccProfile('srgb')
      // Preserve crisp edges/alpha for artwork; opaque photographic PNG uses lossy WebP.
      .webp({
        quality: WEBP_QUALITY,
        alphaQuality: 100,
        smartSubsample: true,
        lossless: preserveArtwork,
        effort: 4,
      })
      .toBuffer();

    if (output.length < input.length || metadata.format !== 'webp' || exceedsMaxDimension) {
      return { bytes: output, extension: '.webp', mimetype: 'image/webp', optimized: true };
    }
    return { bytes: input, extension: '.webp', mimetype: 'image/webp', optimized: false };
  } catch (cause) {
    throw Object.assign(new Error('Arquivo inválido. Utilize JPG, PNG ou WEBP.', { cause }), { statusCode: 400 });
  }
}

async function garantirEspaco(destination, bytes) {
  if (typeof fs.statfs !== 'function') return;
  const stats = await fs.statfs(destination);
  const available = Number(stats.bavail) * Number(stats.bsize);
  if (available < bytes + MIN_FREE_SPACE_AFTER_WRITE) {
    throw Object.assign(new Error('Espaço insuficiente para armazenar a imagem.'), { code: 'ENOSPC' });
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
      const finalImage = await prepararWebp(input, file.originalname);
      const filename = `${randomUUID()}${finalImage.optimized ? '.optimized' : ''}${finalImage.extension}`;
      const destination = getUploadProductsDir(process.env);
      const outputPath = path.join(destination, filename);
      await garantirEspaco(destination, finalImage.bytes.length);
      const handle = await fs.open(outputPath, 'wx');
      generated.push({ path: outputPath });
      try {
        await handle.writeFile(finalImage.bytes);
      } finally {
        await handle.close();
      }
      await fs.unlink(file.path);
      Object.assign(file, {
        filename,
        path: outputPath,
        destination,
        mimetype: finalImage.mimetype,
        size: finalImage.bytes.length,
      });
    }
  } catch (error) {
    removerImagensProduto(generated);
    removerImagensProduto(files);
    if (error.statusCode === 400) return res.status(400).json({ erro: error.message });
    if (error.code === 'ENOSPC') {
      return res.status(507).json({ erro: 'Espaço insuficiente para armazenar a imagem.' });
    }
    return next(error);
  } finally {
    release();
  }

  return next();
}
