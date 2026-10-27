const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/categories', require('./categories.routes'));
router.use('/products', require('./products.routes'));

router.use((req, res) => res.status(404).json({ error: 'Bulunamadı.' }));

module.exports = router;
