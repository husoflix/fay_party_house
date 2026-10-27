const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');
const cfg = require('./config');

fs.mkdirSync(path.dirname(cfg.DB_PATH), { recursive: true });
fs.mkdirSync(cfg.UPLOAD_DIR, { recursive: true });

const db = new DatabaseSync(cfg.DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS categories (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL UNIQUE,
    slug       TEXT NOT NULL UNIQUE,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS products (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT NOT NULL,
    description  TEXT NOT NULL DEFAULT '',
    price        REAL NOT NULL DEFAULT 0,
    category_id  INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    image        TEXT NOT NULL DEFAULT '',
    is_available INTEGER NOT NULL DEFAULT 1,
    is_featured  INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

/* ---------- Şifre yardımcıları ---------- */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(password, salt, 64);
  const real = Buffer.from(hash, 'hex');
  return real.length === test.length && crypto.timingSafeEqual(real, test);
}

/* ---------- İlk kurulum ---------- */
function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}
function setSetting(key, value) {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, value);
}

if (!getSetting('admin_password')) {
  setSetting('admin_password', hashPassword(cfg.DEFAULT_ADMIN_PASSWORD));
  console.log(`[db] Varsayılan admin şifresi oluşturuldu: "${cfg.DEFAULT_ADMIN_PASSWORD}"`);
}

if (!getSetting('seeded')) {
  const cats = [
    ['Pastalar', 'pastalar'],
    ['Cheesecake & Tart', 'cheesecake-tart'],
    ['Cupcake & Kurabiye', 'cupcake-kurabiye'],
    ['Sıcak İçecekler', 'sicak-icecekler'],
    ['Soğuk İçecekler', 'soguk-icecekler'],
  ];
  const insCat = db.prepare('INSERT INTO categories (name, slug, sort_order) VALUES (?, ?, ?)');
  cats.forEach(([n, s], i) => insCat.run(n, s, i));

  const catId = (slug) => db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug).id;
  const P = '/images/placeholders/';
  const items = [
    ['Ahududulu Rüya Pasta', 'Vanilyalı kat kek, taze ahududu ve hafif krema.', 185, 'pastalar', 'cake.svg', 1],
    ['Belçika Çikolatalı Pasta', 'Yoğun Belçika çikolatası ve ganaj kaplama.', 175, 'pastalar', 'cake-choco.svg', 1],
    ['Frambuazlı Cheesecake', 'Kremsi New York cheesecake, frambuaz sosuyla.', 160, 'cheesecake-tart', 'cheesecake.svg', 1],
    ['San Sebastian', 'Yanık tepeli, akışkan kıvamlı klasik.', 155, 'cheesecake-tart', 'cheesecake-choco.svg', 0],
    ['Pembe Cupcake', 'Çilekli krema ve şeker yıldızlarla.', 85, 'cupcake-kurabiye', 'cupcake.svg', 1],
    ['Çikolata Parçalı Cookie', 'Dışı çıtır, içi yumuşak, bol çikolatalı.', 70, 'cupcake-kurabiye', 'cookie.svg', 0],
    ['Türk Kahvesi', 'Közde, lokum eşliğinde.', 65, 'sicak-icecekler', 'coffee.svg', 0],
    ['Latte', 'Çift shot espresso ve ipeksi süt köpüğü.', 90, 'sicak-icecekler', 'coffee.svg', 0],
    ['Çilekli Milkshake', 'Taze çilek, dondurma ve krema.', 110, 'soguk-icecekler', 'iced.svg', 1],
    ['Buzlu Karamel Latte', 'Karamel şurup, süt ve buz.', 105, 'soguk-icecekler', 'iced.svg', 0],
  ];
  const insP = db.prepare(
    'INSERT INTO products (name, description, price, category_id, image, is_featured) VALUES (?, ?, ?, ?, ?, ?)'
  );
  items.forEach(([n, d, p, c, img, f]) => insP.run(n, d, p, catId(c), P + img, f));
  setSetting('seeded', '1');
  console.log('[db] Örnek kategori ve ürünler eklendi.');
}

module.exports = { db, hashPassword, verifyPassword, getSetting, setSetting };
