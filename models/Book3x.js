const mongoose = require('mongoose');

const book3xSchema = new mongoose.Schema({
  asin: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  authors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Author3x' }],
  publisher: { type: String },
  releaseDate: { type: Date },
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category3x' }],
  series: { type: mongoose.Schema.Types.ObjectId, ref: 'Series3x' },
  seriesNumber: { type: Number },
  affiliateLink: { type: String },
  price: { type: String },
  bookImage: { type: String },
  description: { type: String }, // <-- Added description field
});

module.exports = mongoose.model('Book3x', book3xSchema);
