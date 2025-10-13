require('dotenv').config();
const mongoose = require('mongoose');

const Author = require('../models/Author');
const Category = require('../models/Category');
const Book = require('../models/Book');
const Series = require('../models/Series');
const mongoUri = process.env.MONGO_URI;

// 10 categories
const categoriesData = [
  { name: 'Fantasy', description: 'Fantasy books and novels.' },
  { name: 'Science Fiction', description: 'Sci-fi books and novels.' },
  { name: 'Mystery', description: 'Mystery and detective stories.' },
  { name: 'Romance', description: 'Romantic novels.' },
  { name: 'Thriller', description: 'Thriller and suspense books.' },
  { name: 'Non-Fiction', description: 'Non-fictional works.' },
  { name: 'Biography', description: 'Biographies and memoirs.' },
  { name: 'Children', description: 'Children books.' },
  { name: 'Young Adult', description: 'Young adult fiction.' },
  { name: 'Historical', description: 'Historical novels.' }
];

// 12 authors
const authorsData = [
  { name: 'J.K. Rowling', bio: 'British author, best known for Harry Potter.', photo: 'https://randomuser.me/api/portraits/women/1.jpg' },
  { name: 'George R.R. Martin', bio: 'Author of A Song of Ice and Fire.', photo: 'https://randomuser.me/api/portraits/men/2.jpg' },
  { name: 'Agatha Christie', bio: 'Queen of Mystery.', photo: 'https://randomuser.me/api/portraits/women/3.jpg' },
  { name: 'Stephen King', bio: 'Master of horror and suspense.', photo: 'https://randomuser.me/api/portraits/men/4.jpg' },
  { name: 'Jane Austen', bio: 'English novelist known for her romantic fiction.', photo: 'https://randomuser.me/api/portraits/women/5.jpg' },
  { name: 'J.R.R. Tolkien', bio: 'Author of The Lord of the Rings.', photo: 'https://randomuser.me/api/portraits/men/6.jpg' },
  { name: 'Suzanne Collins', bio: 'Author of The Hunger Games.', photo: 'https://randomuser.me/api/portraits/women/7.jpg' },
  { name: 'Dan Brown', bio: 'Author of The Da Vinci Code.', photo: 'https://randomuser.me/api/portraits/men/8.jpg' },
  { name: 'Rick Riordan', bio: 'Author of Percy Jackson series.', photo: 'https://randomuser.me/api/portraits/men/9.jpg' },
  { name: 'Veronica Roth', bio: 'Author of Divergent series.', photo: 'https://randomuser.me/api/portraits/women/10.jpg' },
  { name: 'C.S. Lewis', bio: 'Author of The Chronicles of Narnia.', photo: 'https://randomuser.me/api/portraits/men/11.jpg' },
  { name: 'Margaret Atwood', bio: 'Author of The Handmaid’s Tale.', photo: 'https://randomuser.me/api/portraits/women/12.jpg' }
];

// 7 series
const seriesData = [
  { name: 'Harry Potter', description: 'A series about a young wizard.', coverImage: 'https://covers.openlibrary.org/b/id/7984916-L.jpg' },
  { name: 'A Song of Ice and Fire', description: 'Epic fantasy series.', coverImage: 'https://covers.openlibrary.org/b/id/8231856-L.jpg' },
  { name: 'Hercule Poirot', description: 'Detective series by Agatha Christie.', coverImage: 'https://covers.openlibrary.org/b/id/8228691-L.jpg' },
  { name: 'The Lord of the Rings', description: 'Epic high-fantasy series.', coverImage: 'https://covers.openlibrary.org/b/id/8231996-L.jpg' },
  { name: 'Percy Jackson', description: 'Modern adventure with Greek gods.', coverImage: 'https://covers.openlibrary.org/b/id/8232000-L.jpg' },
  { name: 'Divergent', description: 'Dystopian trilogy.', coverImage: 'https://covers.openlibrary.org/b/id/8232001-L.jpg' },
  { name: 'The Hunger Games', description: 'Dystopian adventure series.', coverImage: 'https://covers.openlibrary.org/b/id/8232002-L.jpg' }
];

// 15 books (some assigned to series, authors, and categories)
const booksData = [
  { title: 'Harry Potter and the Sorcerer\'s Stone', releaseDate: new Date('1997-06-26'), coverImage: 'https://covers.openlibrary.org/b/id/7984916-L.jpg', description: 'The first Harry Potter book.', publisher: 'Bloomsbury', isbn: '9780747532699', amazonUrl: 'https://www.amazon.com/dp/059035342X' },
  { title: 'Harry Potter and the Chamber of Secrets', releaseDate: new Date('1998-07-02'), coverImage: 'https://covers.openlibrary.org/b/id/7984917-L.jpg', description: 'Second Harry Potter book.', publisher: 'Bloomsbury', isbn: '9780747538493', amazonUrl: 'https://www.amazon.com/dp/0439064872' },
  { title: 'A Game of Thrones', releaseDate: new Date('1996-08-06'), coverImage: 'https://covers.openlibrary.org/b/id/8231856-L.jpg', description: 'First in A Song of Ice and Fire.', publisher: 'Bantam Spectra', isbn: '9780553103540', amazonUrl: 'https://www.amazon.com/dp/0553103547' },
  { title: 'A Clash of Kings', releaseDate: new Date('1998-11-16'), coverImage: 'https://covers.openlibrary.org/b/id/8231857-L.jpg', description: 'Second in A Song of Ice and Fire.', publisher: 'Bantam Spectra', isbn: '9780553108033', amazonUrl: 'https://www.amazon.com/dp/0553108034' },
  { title: 'Murder on the Orient Express', releaseDate: new Date('1934-01-01'), coverImage: 'https://covers.openlibrary.org/b/id/8228691-L.jpg', description: 'Poirot investigates a murder.', publisher: 'Collins Crime Club', isbn: '9780007119318', amazonUrl: 'https://www.amazon.com/dp/0062693662' },
  { title: 'The Lord of the Rings: The Fellowship of the Ring', releaseDate: new Date('1954-07-29'), coverImage: 'https://covers.openlibrary.org/b/id/8231996-L.jpg', description: 'First in The Lord of the Rings.', publisher: 'Allen & Unwin', isbn: '9780261103573', amazonUrl: 'https://www.amazon.com/dp/0261103571' },
  { title: 'Percy Jackson & the Olympians: The Lightning Thief', releaseDate: new Date('2005-06-28'), coverImage: 'https://covers.openlibrary.org/b/id/8232000-L.jpg', description: 'First Percy Jackson book.', publisher: 'Disney Hyperion', isbn: '9780786838653', amazonUrl: 'https://www.amazon.com/dp/0786838655' },
  { title: 'Divergent', releaseDate: new Date('2011-04-25'), coverImage: 'https://covers.openlibrary.org/b/id/8232001-L.jpg', description: 'First Divergent book.', publisher: 'Katherine Tegen Books', isbn: '9780062024022', amazonUrl: 'https://www.amazon.com/dp/0062024027' },
  { title: 'The Hunger Games', releaseDate: new Date('2008-09-14'), coverImage: 'https://covers.openlibrary.org/b/id/8232002-L.jpg', description: 'First Hunger Games book.', publisher: 'Scholastic Press', isbn: '9780439023481', amazonUrl: 'https://www.amazon.com/dp/0439023483' },
  { title: 'Pride and Prejudice', releaseDate: new Date('1813-01-28'), coverImage: 'https://covers.openlibrary.org/b/id/8232003-L.jpg', description: 'Classic romance novel.', publisher: 'T. Egerton', isbn: '9780141439518', amazonUrl: 'https://www.amazon.com/dp/0141439513' },
  { title: 'The Handmaid’s Tale', releaseDate: new Date('1985-08-17'), coverImage: 'https://covers.openlibrary.org/b/id/8232004-L.jpg', description: 'Dystopian novel.', publisher: 'McClelland and Stewart', isbn: '9780385490818', amazonUrl: 'https://www.amazon.com/dp/038549081X' },
  { title: 'The Hobbit', releaseDate: new Date('1937-09-21'), coverImage: 'https://covers.openlibrary.org/b/id/8232005-L.jpg', description: 'Prequel to The Lord of the Rings.', publisher: 'Allen & Unwin', isbn: '9780261102217', amazonUrl: 'https://www.amazon.com/dp/0261102214' },
  { title: 'And Then There Were None', releaseDate: new Date('1939-11-06'), coverImage: 'https://covers.openlibrary.org/b/id/8232006-L.jpg', description: 'Mystery novel by Agatha Christie.', publisher: 'Collins Crime Club', isbn: '9780062073488', amazonUrl: 'https://www.amazon.com/dp/0062073486' },
  { title: 'Catching Fire', releaseDate: new Date('2009-09-01'), coverImage: 'https://covers.openlibrary.org/b/id/8232007-L.jpg', description: 'Second Hunger Games book.', publisher: 'Scholastic Press', isbn: '9780439023498', amazonUrl: 'https://www.amazon.com/dp/0439023491' },
  { title: 'Mockingjay', releaseDate: new Date('2010-08-24'), coverImage: 'https://covers.openlibrary.org/b/id/8232008-L.jpg', description: 'Final Hunger Games book.', publisher: 'Scholastic Press', isbn: '9780439023511', amazonUrl: 'https://www.amazon.com/dp/0439023513' }
];


async function seedDummyData() {
  try {
    await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');
    await Author.deleteMany({});
    await Category.deleteMany({});
    await Book.deleteMany({});
    await Series.deleteMany({});

    const categories = await Category.insertMany(categoriesData);
    const authors = await Author.insertMany(authorsData);
    const series = await Series.insertMany(seriesData);

    // Assign books to authors, categories, and series
    const booksToInsert = booksData.map((book, idx) => {
      // Assign authors, categories, and series in a round-robin fashion
      const authorIdx = idx % authors.length;
      const catIdx = idx % categories.length;
      const seriesIdx = idx % series.length;
      return {
        ...book,
        authors: [authors[authorIdx]._id],
        categories: [categories[catIdx]._id],
        series: series[seriesIdx]._id
      };
    });
    const books = await Book.insertMany(booksToInsert);

    // Link books to authors and series
    for (let i = 0; i < books.length; i++) {
      await Author.findByIdAndUpdate(books[i].authors[0], { $addToSet: { books: books[i]._id } });
      await Series.findByIdAndUpdate(books[i].series, { $addToSet: { books: books[i]._id } });
    }

    console.log('Dummy series, categories, authors, and books seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seedDummyData();
