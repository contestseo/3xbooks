const express = require('express');
const router = express.Router();
const Author = require('../models/Author3x');

// GET /authors - list authors with optional search
router.get('/', async (req, res) => {
    try {
        const { search, limit = 20, skip = 0 } = req.query;
        const query = {};
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        const authors = await Author.find(query)
            .skip(Number(skip))
            .limit(Number(limit));
        res.json(authors);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /authors/:id - author detail with books
router.get('/:id', async (req, res) => {
    try {
        const author = await Author.findById(req.params.id)
            .populate('books'); // Populate all book fields
        if (!author) return res.status(404).json({ error: 'Author not found' });
        res.json(author);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
