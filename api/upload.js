const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const cfg = require('../backend/config');

const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, cfg.UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ALLOWED[file.mimetype]}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED[file.mimetype]) return cb(null, true);
    const err = new Error('Sadece JPG, PNG, WEBP veya GIF yüklenebilir.');
    err.status = 400;
    cb(err);
  },
});

/** Sadece /images/uploads altındaki (panelden yüklenmiş) dosyaları siler. */
function removeUploadedImage(imagePath) {
  if (!imagePath || !imagePath.startsWith('/images/uploads/')) return;
  const file = path.join(cfg.UPLOAD_DIR, path.basename(imagePath));
  fs.unlink(file, () => {});
}

module.exports = { upload, removeUploadedImage };
