const express = require('express');
const path = require('path');
const cfg = require('./config');
require('./db'); // veritabanı bağlantısı + ilk kurulum
const { attachAuth } = require('./middleware/auth');
const api = require('../api');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(attachAuth);

// Yüklenen ve temsili görseller
app.use('/images', express.static(cfg.IMAGES_DIR, { maxAge: '7d' }));

// API
app.use('/api', api);

// Admin paneli (şifre korumalı)
const adminDir = path.join(cfg.FRONTEND_DIR, 'admin');
app.use('/admin/assets', express.static(path.join(adminDir, 'assets')));
app.get('/admin/login', (req, res) => {
  if (req.isAdmin) return res.redirect('/admin');
  res.sendFile(path.join(adminDir, 'login.html'));
});
app.get('/admin', (req, res) => {
  if (!req.isAdmin) return res.redirect('/admin/login');
  res.sendFile(path.join(adminDir, 'panel.html'));
});
// /admin altındaki başka hiçbir dosya doğrudan servis edilmez
app.use('/admin', (req, res) => res.redirect('/admin'));

// Genel site
app.use(express.static(cfg.FRONTEND_DIR, { index: 'index.html' }));

// Hata yakalayıcı
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
  const message = err.code === 'LIMIT_FILE_SIZE' ? 'Görsel en fazla 5 MB olabilir.' : err.message || 'Sunucu hatası';
  res.status(status).json({ error: message });
});

app.listen(cfg.PORT, () => {
  console.log(`\n  🍰 Fay Party House çalışıyor`);
  console.log(`  Site : http://localhost:${cfg.PORT}`);
  console.log(`  Panel: http://localhost:${cfg.PORT}/admin\n`);
});
