        
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), debug: true });

const axios = require('axios');
const aws4 = require('aws4');
require('dotenv').config();

// Amazon PAAPI credentials
const ACCESS_KEY = process.env.PAAPI_ACCESS_KEY;
const SECRET_KEY = process.env.PAAPI_SECRET_KEY;
const PARTNER_TAG = process.env.PAAPI_PARTNER_TAG;

const ENDPOINT = 'webservices.amazon.com';
const REGION = 'us-east-1';
const SERVICE = 'ProductAdvertisingAPI';
const PATH = '/paapi5/searchitems';




// Function to extract series from title
function extractSeriesFromTitle(title) {
  const seriesMatch = title.match(/\((.*?) Book (\d+)\)/);
  if (seriesMatch) {
    return { seriesName: seriesMatch[1], seriesNumber: parseInt(seriesMatch[2], 10) };
  }
  return { seriesName: null, seriesNumber: null };
}

// Function to extract relevant details from each book

function extractBookDetails(item) {
  const asin = item.ASIN || "N/A";
  const title = item.ItemInfo?.Title?.DisplayValue || "N/A";

  // Extract series info from the title (if present)
  const { seriesName, seriesNumber } = extractSeriesFromTitle(title);

  // Extract author(s) as array, format as 'First Last' if name is 'Last, First'
  const authors = (item.ItemInfo?.ByLineInfo?.Contributors || []).map(contrib => {
    if (contrib.Name && contrib.Name.includes(',')) {
      // Convert 'Last, First' to 'First Last'
      const [last, first] = contrib.Name.split(',').map(s => s.trim());
      return `${first} ${last}`;
    }
    return contrib.Name || '';
  });

  const publisher = item.ItemInfo?.ByLineInfo?.Manufacturer?.DisplayValue || "Unknown";

  // Extract release date
  const releaseDate = item.ItemInfo?.ContentInfo?.PublicationDate?.DisplayValue || "N/A";

  // Extract categories (BrowseNodeInfo)
  const categories = item.BrowseNodeInfo?.BrowseNodes?.map(browseNode => browseNode.DisplayName) || [];

  // Extract affiliate link
  const affiliateLink = item.DetailPageURL;

  // Extract price
  const price = item.Offers?.Listings?.[0]?.Price?.DisplayAmount || "N/A";

  // Extract book image URL
  const bookImage = item.Images?.Primary?.Medium?.URL || "No image available";

  return {
    asin,
    title,
    seriesName,
    seriesNumber,
    authors,
    publisher,
    releaseDate,
    categories,
    affiliateLink,
    price,
    bookImage
  };
}


// --- Mongoose and 3xBooks models ---
const mongoose = require('mongoose');
const Author3x = require('../models/Author3x');
const Category3x = require('../models/Category3x');
const Series3x = require('../models/Series3x');
const Book3x = require('../models/Book3x');

const MONGO_URI = process.env.MONGO_URI;


// Function to perform the API request, process, and store the response
async function searchBooksAndStore(keyword) {
  const requestBody = {
    Keywords: keyword,
    PartnerTag: PARTNER_TAG,
    PartnerType: 'Associates',
    Marketplace: 'www.amazon.com',
    Operation: 'SearchItems',
    Resources: [
      "ItemInfo.Title",
      "ItemInfo.ByLineInfo",
      "ItemInfo.ContentInfo",
      "BrowseNodeInfo.BrowseNodes",
      "Images.Primary.Medium",
      "Offers.Listings.Price"
    ]
  };

  const requestOptions = {
    host: ENDPOINT,
    path: PATH,
    service: SERVICE,
    region: REGION,
    method: "POST",
    headers: {
      Host: ENDPOINT,
      Accept: "application/json, text/javascript",
      "Accept-Language": "en-US",
      "Content-Type": "application/json; charset=UTF-8",
      "Content-Encoding": "amz-1.0",
      "X-Amz-Target": "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems"
    },
    body: JSON.stringify(requestBody),
  };

  aws4.sign(requestOptions, {
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
  });

  try {
    // Always connect to the 3xBooks database
    await mongoose.connect(MONGO_URI, { dbName: '3xBooks', useNewUrlParser: true, useUnifiedTopology: true });
    const response = await axios({
      method: 'POST',
      url: `https://${ENDPOINT}${PATH}`,
      headers: requestOptions.headers,
      data: requestOptions.body,
    });
    // console.log("✅ API Response:", JSON.stringify(response.data, null, 2));
    // Extract book details from response and store in DB
    const items = response.data?.SearchResult?.Items || [];
    if (items.length > 0) {
      for (const item of items) {
        const bookDetails = extractBookDetails(item);

        // Authors (array)
        const authorIds = [];
        for (const authorName of bookDetails.authors) {
          if (!authorName) continue;
          let authorDoc = await Author3x.findOne({ name: authorName });
          if (!authorDoc) {
            authorDoc = await Author3x.create({ name: authorName });
          }
          authorIds.push(authorDoc._id);
        }

        // Categories
        const categoryIds = [];
        for (const catName of bookDetails.categories) {
          let catDoc = await Category3x.findOne({ name: catName });
          if (!catDoc) {
            catDoc = await Category3x.create({ name: catName });
          }
          categoryIds.push(catDoc._id);
        }

        // Handle series
        let seriesDoc = null;
        if (bookDetails.seriesName) {
          seriesDoc = await Series3x.findOne({ name: bookDetails.seriesName });
          if (!seriesDoc) {
            seriesDoc = await Series3x.create({ name: bookDetails.seriesName, number: bookDetails.seriesNumber });
          }
        }
        // Handle releaseDate: convert to Date or set null if invalid
        let releaseDate = null;
        if (bookDetails.releaseDate && bookDetails.releaseDate !== 'N/A') {
          const d = new Date(bookDetails.releaseDate);
          if (!isNaN(d.getTime())) releaseDate = d;
        }
        // Book (upsert)
        const bookDoc = await Book3x.findOneAndUpdate(
          { asin: bookDetails.asin },
          {
            asin: bookDetails.asin,
            title: bookDetails.title,
            authors: authorIds,
            publisher: bookDetails.publisher,
            releaseDate: releaseDate,
            categories: categoryIds,
            series: seriesDoc ? seriesDoc._id : null,
            seriesNumber: bookDetails.seriesNumber,
            affiliateLink: bookDetails.affiliateLink,
            price: bookDetails.price,
            bookImage: bookDetails.bookImage,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        // Add book to each author's books array if not already present
        for (const authorId of authorIds) {
          let authorDoc = await Author3x.findById(authorId);
          if (!authorDoc.books) authorDoc.books = [];
          if (!authorDoc.books.some(bid => bid.equals(bookDoc._id))) {
            authorDoc.books.push(bookDoc._id);
            await authorDoc.save();
          }
        }
        console.log(`Stored book: ${bookDetails.title}`);
      }
    } else {
      console.log('No books found for the keyword:', keyword);
    }
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error fetching/storing data:', error.response?.data || error.message);
    await mongoose.disconnect();
  }
}

// Test with a keyword
searchBooksAndStore('Books');
