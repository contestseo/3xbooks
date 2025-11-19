const express = require('express');
const router = express.Router();
const Book = require('../models/Book3x');

router.get('/', async (req, res) => {
  try {
    const { search, category, author, upcoming, limit = 20, skip = 0 } = req.query;
    
    const query = {};

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    // ✅ handle multiple category IDs
    if (category) {
      const categoryArray = category.split(',');
      query.categories = { $in: categoryArray };
    }

    // ✅ handle multiple author IDs
    if (author) {
      const authorArray = author.split(',');
      query.authors = { $in: authorArray };
    }

    if (upcoming === 'true') {
      query.releaseDate = { $gte: new Date() };
    }

    const books = await Book.find(query)
      .populate('authors', 'name photo')
      .populate('categories', 'name')
      .sort({ releaseDate: 1 })
      .skip(Number(skip))
      .limit(Number(limit));

    res.json(books);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});




/**
 * GET /books/:slug
 * Fetch single book by slug
 */
router.get('/:slug', async (req, res) => {
  try {
    const book = await Book.findOne({ slug: req.params.slug })
      .populate('authors', 'name photo bio socialLinks')
      .populate('categories', 'name description');

    if (!book) return res.status(404).json({ error: 'Book not found' });

    res.json(book);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
