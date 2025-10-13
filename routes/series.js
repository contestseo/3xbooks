const express = require('express');
const router = express.Router();
const Series = require('../models/Series');
const Book = require('../models/Book');

// GET /series - list all series
router.get('/', async (req, res) => {
  try {
    const series = await Series.find().select('name description coverImage');
    res.json(series);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /series/:id - get series detail with books
router.get('/:id', async (req, res) => {
  try {
    const series = await Series.findById(req.params.id).populate({ path: 'books', select: 'title coverImage releaseDate authors', populate: { path: 'authors', select: 'name' } });
    if (!series) return res.status(404).json({ error: 'Series not found' });
    res.json(series);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
