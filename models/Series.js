const mongoose = require('mongoose');

const SeriesSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  coverImage: { type: String },
  books: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Book' }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Series', SeriesSchema);
