const mongoose = require('mongoose');

const category3xSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true, // prevents duplicates
      trim: true,
    },
    totalBooks: {
      type: Number,
      default: 0, // initial count is 0
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category3x', category3xSchema);
