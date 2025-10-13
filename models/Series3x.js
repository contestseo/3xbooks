const mongoose = require('mongoose');

const series3xSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  number: { type: Number },
});

module.exports = mongoose.model('Series3x', series3xSchema);
