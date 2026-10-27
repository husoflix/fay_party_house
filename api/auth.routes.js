const router = require('express').Router();
const { getSetting, setSetting, hashPassword, verifyPassword } = require('../backend/db');
const { createSession, destroySession, requireAdmin } = require('../backend/middleware/auth');

// Basit brute-force koruması: 5 hatalı denemede 5 dakika bekletir
const attempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCK_MS = 5 * 60 * 1000;

router.post('/login', (req, res) => {
  const ip = req.ip;
  const rec = attempts.get(ip) || { count: 0, until: 0 };
  if (rec.until > Date.now()) {
    const min = Math.ceil((rec.until - Date.now()) / 60000);
    return res.status(429).json({ error: `Çok fazla hatalı deneme. ${min} dk sonra tekrar deneyin.` });
  }

  const password = String((req.body && req.body.password) || '');
  if (!verifyPassword(password, getSetting('admin_password'))) {
    rec.count += 1;
    if (rec.count >= MAX_ATTEMPTS) {
      rec.until = Date.now() + LOCK_MS;
      rec.count = 0;
    }
    attempts.set(ip, rec);
    return res.status(401).json({ error: 'Şifre hatalı.' });
  }

  attempts.delete(ip);
  createSession(res);
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  destroySession(req, res);
  res.json({ ok: true });
});

router.get('/me', (req, res) => res.json({ isAdmin: req.isAdmin }));

router.post('/password', requireAdmin, (req, res) => {
  const { current, next } = req.body || {};
  if (!verifyPassword(String(current || ''), getSetting('admin_password'))) {
    return res.status(400).json({ error: 'Mevcut şifre hatalı.' });
  }
  if (!next || String(next).length < 6) {
    return res.status(400).json({ error: 'Yeni şifre en az 6 karakter olmalı.' });
  }
  setSetting('admin_password', hashPassword(String(next)));
  res.json({ ok: true });
});

module.exports = router;
