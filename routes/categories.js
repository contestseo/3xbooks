const express = require('express');
const router = express.Router();
const Category = require('../models/Category3x');

// GET /categories - list categories
router.get('/', async (req, res) => {
    try {
        // console.log('📦 Fetching categories...');
        const categories = await Category.find();
        // console.log('✅ Categories found:', categories.length);
        res.json(categories);
    } catch (err) {
        console.error('❌ Error fetching categories:', err);
        res.status(500).json({ error: err.message });
    }
});


// GET /api/category/:name - search category by name
router.get('/:name', async (req, res) => {
  try {
    let { name } = req.params;

    // Convert hyphens to spaces for proper matching
    name = name.replace(/-/g, ' ');

    // Case-insensitive search for category name
    const categories = await Category.find({
      name: { $regex: `^${name}$`, $options: 'i' } // exact match ignoring case
    }).limit(20);

    if (!categories.length) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
