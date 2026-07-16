import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

const uploadDir = path.resolve('uploads', 'comprovantes');

fs.mkdirSync(uploadDir, { recursive: true });

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const allowedExt = new Set(['.jpg', '.jpeg', '.png', '.webp']);

export function isImagemValida(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    return false;
  }

  const isJpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng =
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp =
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP';

  return isJpeg || isPng || isWebp;
}

export function removerComprovante(file) {
  if (file?.path && fs.existsSync(file.path)) {
    try {
      fs.unlinkSync(file.path);
    } catch {
      // noop para não quebrar o fluxo mesmo em erro de exclusão
    }
  }
}

export function validarImagemComprovante(req, res, next) {
  if (!req.file) return next();

  try {
    const buffer = fs.readFileSync(req.file.path);
    const ext = path.extname(req.file.originalname || '').toLowerCase();

    if (!isImagemValida(buffer) || !allowedExt.has(ext)) {
      removerComprovante(req.file);
      return res.status(400).json({ erro: 'Arquivo inválido. Utilize JPG, PNG ou WEBP.' });
    }

    return next();
  } catch (err) {
    removerComprovante(req.file);
    return res.status(400).json({ erro: 'Arquivo inválido. Utilize JPG, PNG ou WEBP.' });
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const isMimeAllowed = allowedMimeTypes.has(file.mimetype);
  const ext = path.extname(file.originalname || '').toLowerCase();
  const isExtAllowed = allowedExt.has(ext);

  if (isMimeAllowed && isExtAllowed) {
    cb(null, true);
  } else {
    cb(new Error('Arquivo inválido. Utilize JPG, PNG ou WEBP.'), false);
  }
};

const uploadComprovante = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

export default uploadComprovante;
