import path from 'node:path';

// Only the optimization pipeline writes this versioned, non-reused filename.
const OPTIMIZED_IMAGE_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.optimized\.webp$/;

export const productImagesStaticOptions = {
  dotfiles: 'deny',
  index: false,
  redirect: false,
  etag: true,
  lastModified: true,
  setHeaders(res, filePath) {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', OPTIMIZED_IMAGE_NAME.test(path.basename(filePath))
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=3600, must-revalidate');
  },
};
