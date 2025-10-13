const mongoose = require('mongoose');

const BookSchema = new mongoose.Schema({
    title: { type: String, required: true },
    authors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Author', required: true }],
    releaseDate: { type: Date, required: true },
    coverImage: { type: String },
    description: { type: String },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    publisher: { type: String },
    isbn: { type: String, unique: true },
    amazonUrl: { type: String },
    series: { type: mongoose.Schema.Types.ObjectId, ref: 'Series' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Book', BookSchema);
