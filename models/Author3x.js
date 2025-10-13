const mongoose = require('mongoose');


const author3xSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  bio: { type: String },
  image: { type: String },
  books: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Book3x' }],
});

module.exports = mongoose.model('Author3x', author3xSchema);
