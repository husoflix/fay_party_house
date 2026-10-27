const router = require('express').Router();
const { db } = require('../backend/db');
const { requireAdmin } = require('../backend/middleware/auth');
const { upload, removeUploadedImage } = require('./upload');

const BASE_SQL = `
  SELECT p.id, p.name, p.description, p.price, p.category_id, p.image,
         p.is_available, p.is_featured, p.created_at,
         c.name AS category_name, c.slug AS category_slug
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id`;

// Herkese açık: ürün listesi. Admin ?all=1 ile pasif ürünleri de görür.
router.get('/', (req, res) => {
  const where = [];
  const params = [];
  if (!(req.isAdmin && req.query.all === '1')) where.push('p.is_available = 1');
  if (req.query.category) {
    where.push('c.slug = ?');
    params.push(String(req.query.category));
  }
  if (req.query.featured === '1') where.push('p.is_featured = 1');
  const sql = `${BASE_SQL} ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
               ORDER BY c.sort_order, p.created_at DESC, p.id DESC`;
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const row = db.prepare(`${BASE_SQL} WHERE p.id = ?`).get(req.params.id);
  if (!row || (!row.is_available && !req.isAdmin)) return res.status(404).json({ error: 'Ürün bulunamadı.' });
  res.json(row);
});

function readBody(body) {
  const name = String(body.name || '').trim();
  const price = Number(String(body.price || '').replace(',', '.'));
  const categoryId = body.category_id ? Number(body.category_id) : null;
  const error =
    !name ? 'Ürün adı gerekli.' :
    name.length > 100 ? 'Ürün adı çok uzun.' :
    !Number.isFinite(price) || price < 0 ? 'Geçerli bir fiyat girin.' : null;
  return {
    error,
    data: {
      name,
      description: String(body.description || '').trim().slice(0, 500),
      price,
      category_id: Number.isInteger(categoryId) ? categoryId : null,
      is_available: body.is_available === '0' || body.is_available === 'false' ? 0 : 1,
      is_featured: body.is_featured === '1' || body.is_featured === 'true' ? 1 : 0,
    },
  };
}

router.post('/', requireAdmin, upload.single('image'), (req, res) => {
  const { error, data } = readBody(req.body || {});
  if (error) {
    if (req.file) removeUploadedImage(`/images/uploads/${req.file.filename}`);
    return res.status(400).json({ error });
  }
  const image = req.file ? `/images/uploads/${req.file.filename}` : '/images/placeholders/cake.svg';
  const r = db
    .prepare(
      `INSERT INTO products (name, description, price, category_id, image, is_available, is_featured)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(data.name, data.description, data.price, data.category_id, image, data.is_available, data.is_featured);
  res.status(201).json({ id: Number(r.lastInsertRowid) });
});

router.put('/:id', requireAdmin, upload.single('image'), (req, res) => {
  const existing = db.prepare('SELECT image FROM products WHERE id = ?').get(req.params.id);
  if (!existing) {
    if (req.file) removeUploadedImage(`/images/uploads/${req.file.filename}`);
    return res.status(404).json({ error: 'Ürün bulunamadı.' });
  }
  const { error, data } = readBody(req.body || {});
  if (error) {
    if (req.file) removeUploadedImage(`/images/uploads/${req.file.filename}`);
    return res.status(400).json({ error });
  }
  let image = existing.image;
  if (req.file) {
    image = `/images/uploads/${req.file.filename}`;
    removeUploadedImage(existing.image);
  }
  db.prepare(
    `UPDATE products SET name = ?, description = ?, price = ?, category_id = ?,
            image = ?, is_available = ?, is_featured = ? WHERE id = ?`
  ).run(data.name, data.description, data.price, data.category_id, image, data.is_available, data.is_featured, req.params.id);
  res.json({ ok: true });
});

// Hızlı durum değiştirme (stokta var/yok)
router.patch('/:id/availability', requireAdmin, (req, res) => {
  const val = req.body && req.body.is_available ? 1 : 0;
  const r = db.prepare('UPDATE products SET is_available = ? WHERE id = ?').run(val, req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'Ürün bulunamadı.' });
  res.json({ ok: true });
});

router.delete('/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT image FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Ürün bulunamadı.' });
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  removeUploadedImage(existing.image);
  res.json({ ok: true });
});

module.exports = router;
