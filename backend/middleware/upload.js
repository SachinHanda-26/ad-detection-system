'use strict';

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ── Storage configuration ─────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename(_req, file, cb) {
    // Sanitise original filename to avoid path traversal / special chars
    const sanitised = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename  = `${Date.now()}-${sanitised}`;
    cb(null, filename);
  },
});

// ── MIME type + extension whitelist ──────────────────────────────────────────
const ALLOWED_MIMETYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function fileFilter(_req, file, cb) {
  const ext     = path.extname(file.originalname).toLowerCase();
  const mime    = file.mimetype.toLowerCase();
  const allowed = ALLOWED_MIMETYPES.has(mime) && ALLOWED_EXTENSIONS.has(ext);

  if (allowed) {
    cb(null, true);
  } else {
    cb(
      Object.assign(new Error('Only JPEG, PNG, and WebP images are allowed.'), {
        status: 400,
      }),
      false
    );
  }
}

// ── Multer instance ───────────────────────────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
    files:    1,
  },
});

module.exports = upload;
