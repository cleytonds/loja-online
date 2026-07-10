import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

const uploadDir = path.resolve('uploads', 'comprovantes');

fs.mkdirSync(uploadDir, { recursive: true });

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

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
  // Mantém allowlist de MIME type (multer)
  const isMimeAllowed = allowedMimeTypes.has(file.mimetype);

  // Reforço: valida também a extensão baseada no nome original
  const ext = path.extname(file.originalname || '').toLowerCase();
  const allowedExt = new Set(['.jpg', '.jpeg', '.png', '.webp']);
  const isExtAllowed = allowedExt.has(ext);

  if (isMimeAllowed && isExtAllowed) {
    cb(null, true);
  } else {
    // Mensagem segura (sem detalhes internos)
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
