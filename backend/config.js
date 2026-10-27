const path = require('path');

const ROOT = path.join(__dirname, '..');

module.exports = {
  ROOT,
  PORT: process.env.PORT || 3100,
  DB_PATH: path.join(ROOT, 'database', 'cafe.db'),
  IMAGES_DIR: path.join(ROOT, 'images'),
  UPLOAD_DIR: path.join(ROOT, 'images', 'uploads'),
  FRONTEND_DIR: path.join(ROOT, 'frontend'),
  // İlk çalıştırmada kullanılan varsayılan admin şifresi.
  // Panelden "Ayarlar" sekmesinden değiştirmeyi unutma!
  DEFAULT_ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'fay2026',
  SESSION_TTL_MS: 1000 * 60 * 60 * 8, // 8 saat
  COOKIE_NAME: 'fay_sid',
};
