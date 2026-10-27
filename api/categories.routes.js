const router = require('express').Router();
const { db } = require('../backend/db');
const { requireAdmin } = require('../backend/middleware/auth');

function slugify(text) {
  return String(text)
    .toLocaleLowerCase('tr')
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i')
    .replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Herkese açık: kategori listesi
router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT c.id, c.name, c.slug, c.sort_order,
              (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
       FROM categories c ORDER BY c.sort_order, c.name`
    )
    .all();
  res.json(rows);
});

router.post('/', requireAdmin, (req, res) => {
  const name = String((req.body && req.body.name) || '').trim();
  if (!name) return res.status(400).json({ error: 'Kategori adı gerekli.' });
  try {
    const order = db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM categories').get().n;
    const r = db
      .prepare('INSERT INTO categories (name, slug, sort_order) VALUES (?, ?, ?)')
      .run(name, slugify(name) || `kategori-${Date.now()}`, order);
    res.status(201).json({ id: Number(r.lastInsertRowid), name });
  } catch (e) {
    res.status(400).json({ error: 'Bu isimde bir kategori zaten var.' });
  }
});

router.put('/:id', requireAdmin, (req, res) => {
  const name = String((req.body && req.body.name) || '').trim();
  if (!name) return res.status(400).json({ error: 'Kategori adı gerekli.' });
  try {
    const r = db
      .prepare('UPDATE categories SET name = ?, slug = ? WHERE id = ?')
      .run(name, slugify(name) || `kategori-${req.params.id}`, req.params.id);
    if (!r.changes) return res.status(404).json({ error: 'Kategori bulunamadı.' });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: 'Bu isimde bir kategori zaten var.' });
  }
});

router.delete('/:id', requireAdmin, (req, res) => {
  const r = db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'Kategori bulunamadı.' });
  res.json({ ok: true });
});

module.exports = router;
