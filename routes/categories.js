const express = require('express');
const router = express.Router();
const Category = require('../models/Category3x');

// GET /categories - list categories
router.get('/', async (req, res) => {
    try {
        console.log('📦 Fetching categories...');
        const categories = await Category.find();
        console.log('✅ Categories found:', categories.length);
        res.json(categories);
    } catch (err) {
        console.error('❌ Error fetching categories:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /categories/:id - category detail
router.get('/:id', async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) return res.status(404).json({ error: 'Category not found' });
        res.json(category);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
