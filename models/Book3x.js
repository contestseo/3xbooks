const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  asin: { type: String, unique: true },
  title: String,
  slug: { type: String, unique: true, index: true }, // ✅ new slug field
  authors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Author3x' }],
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category3x' }],
  affiliateLink: String,
  price: String,
  bookImage: String,
  description: String,
  publisher: String,
  releaseDate: Date,
  feedbackCount: Number,
  feedbackRating: Number,
}, { timestamps: true });

module.exports = mongoose.model('Book3x', bookSchema);
