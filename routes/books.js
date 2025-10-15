const express = require('express');
const router = express.Router();
const Book = require('../models/Book3x');
const Author = require('../models/Author3x');
const Category = require('../models/Category3x');
const slugify = require('slugify');


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



// GET /books/:id - book detail
// router.get('/:id', async (req, res) => {
//     try {
//         const book = await Book.findById(req.params.id)
//             .populate('authors', 'name photo bio socialLinks')
//             .populate('categories', 'name description');
//         if (!book) return res.status(404).json({ error: 'Book not found' });
//         res.json(book);
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// });


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


// Filtered books endpoint for frontend filters
// const Book3x = require('../models/Book');
// router.get('/filter', async (req, res) => {
//     try {
//         const { categories, authors, series } = req.query;
//         const filter = {};
//         if (categories) filter.categories = { $in: categories.split(',') };
//         if (authors) filter.authors = { $in: authors.split(',') };
//         if (series) filter.series = { $in: series.split(',') };
//         const books = await Book3x.find(filter)
//             .populate('authors')
//             .populate('categories')
//             .populate('series');
//         res.json(books);
//     } catch (err) {
//         res.status(500).json({ error: 'Failed to fetch books' });
//     }
// });
module.exports = router;
