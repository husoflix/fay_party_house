const crypto = require('crypto');
const cfg = require('../config');

// token -> bitiş zamanı
const sessions = new Map();

function parseCookies(header = '') {
  return header.split(';').reduce((acc, part) => {
    const i = part.indexOf('=');
    if (i > -1) acc[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
    return acc;
  }, {});
}

function createSession(res) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, Date.now() + cfg.SESSION_TTL_MS);
  res.setHeader(
    'Set-Cookie',
    `${cfg.COOKIE_NAME}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${cfg.SESSION_TTL_MS / 1000}`
  );
}

function destroySession(req, res) {
  const token = parseCookies(req.headers.cookie)[cfg.COOKIE_NAME];
  if (token) sessions.delete(token);
  res.setHeader('Set-Cookie', `${cfg.COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
}

/** Her istekte çalışır, req.isAdmin değerini belirler. */
function attachAuth(req, res, next) {
  const token = parseCookies(req.headers.cookie)[cfg.COOKIE_NAME];
  const exp = token && sessions.get(token);
  req.isAdmin = Boolean(exp && exp > Date.now());
  if (token && !req.isAdmin) sessions.delete(token);
  next();
}

/** Sadece giriş yapmış admin'e izin verir. */
function requireAdmin(req, res, next) {
  if (!req.isAdmin) return res.status(401).json({ error: 'Giriş yapmanız gerekiyor.' });
  next();
}

module.exports = { attachAuth, requireAdmin, createSession, destroySession };
