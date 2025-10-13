const mongoose = require('mongoose');

const AuthorSchema = new mongoose.Schema({
    name: { type: String, required: true },
    bio: { type: String },
    photo: { type: String },
    books: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Book' }],
    socialLinks: {
        facebook: String,
        twitter: String,
        instagram: String,
        website: String
    }
});

module.exports = mongoose.model('Author', AuthorSchema);
