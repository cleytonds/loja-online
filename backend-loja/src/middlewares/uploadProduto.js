import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { isImagemValida } from './uploadComprovante.js';

const uploadDir = path.resolve('uploads', 'produtos');

fs.mkdirSync(uploadDir, { recursive: true });

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const allowedExt = new Set(['.jpg', '.jpeg', '.png', '.webp']);

export function removerImagensProduto(files = []) {
  for (const file of files) {
    if (file?.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch {
        // A limpeza não deve ocultar o erro principal.
      }
    }
  }
}

export function validarImagensProduto(req, res, next) {
  const files = Array.isArray(req.files) ? req.files : [];

  try {
    const invalido = files.some((file) => {
      const ext = path.extname(file.originalname || '').toLowerCase();
      return !allowedExt.has(ext) || !isImagemValida(fs.readFileSync(file.path));
    });

    if (invalido) {
      removerImagensProduto(files);
      return res.status(400).json({ erro: 'Arquivo inválido. Utilize JPG, PNG ou WEBP.' });
    }

    return next();
  } catch {
    removerImagensProduto(files);
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

const uploadProduto = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

export default uploadProduto;
