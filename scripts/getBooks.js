const mongoose = require('mongoose');
const axios = require('axios');
const aws4 = require('aws4');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Category3x = require('../models/Category3x');
const Book3x = require('../models/Book3x');
const Author3x = require('../models/Author3x');

const ACCESS_KEY = process.env.PAAPI_ACCESS_KEY;
const SECRET_KEY = process.env.PAAPI_SECRET_KEY;
const PARTNER_TAG = process.env.PAAPI_PARTNER_TAG;

const ENDPOINT = 'webservices.amazon.com';
const REGION = 'us-east-1';
const SERVICE = 'ProductAdvertisingAPI';
const PATH = '/paapi5/searchitems';
const MONGO_URI = process.env.MONGO_URI;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/** Search books by category name and page number */
async function searchBooksByCategory(categoryName, page = 1) {
    const body = {
        Keywords: categoryName,
        PartnerTag: PARTNER_TAG,
        PartnerType: 'Associates',
        Marketplace: 'www.amazon.com',
        ItemPage: page,
        SearchIndex: 'Books',
        Resources: [
            "ItemInfo.Title",
            "ItemInfo.ByLineInfo",
            "ItemInfo.ContentInfo",
            "ItemInfo.ProductInfo",
            "ItemInfo.ManufactureInfo",
            "BrowseNodeInfo.BrowseNodes",
            "Images.Primary.Large",
            "Offers.Listings.Price"
        ],
        "Filters": {
            "Condition": "New",
            "Availability": "Available"
        }
    };

    const requestOptions = {
        host: ENDPOINT,
        path: PATH,
        service: SERVICE,
        region: REGION,
        method: 'POST',
        headers: {
            Host: ENDPOINT,
            Accept: "application/json, text/javascript",
            "Accept-Language": "en-US",
            "Content-Type": "application/json; charset=UTF-8",
            "Content-Encoding": "amz-1.0",
            "X-Amz-Target": "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems"
        },
        body: JSON.stringify(body)
    };

    aws4.sign(requestOptions, { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY });

    try {
        const response = await axios.post(`https://${ENDPOINT}${PATH}`, body, { headers: requestOptions.headers });
        return response.data.SearchResult || {};
    } catch (err) {
        console.error(`Error fetching books for category "${categoryName}" page ${page}:`, err.response?.data || err.message);
        return {};
    }
}

/** Extract author names */
function extractAuthors(contributors) {
    return (contributors || []).map(c => {
        if (!c.Name) return '';
        if (c.Name.includes(',')) {
            const [last, first] = c.Name.split(',').map(s => s.trim());
            return `${first} ${last}`;
        }
        return c.Name;
    }).filter(a => a);
}

/** Extract release date as Date object */
function extractReleaseDate(item) {
    const dateStr = item.ItemInfo?.ContentInfo?.PublicationDate?.DisplayValue;
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
}

/** Save book and link authors and category */
async function saveBook(item, categoryId) {
    const asin = item.ASIN;
    if (!asin) return;

    const title = item.ItemInfo?.Title?.DisplayValue || 'N/A';
    const authors = extractAuthors(item.ItemInfo?.ByLineInfo?.Contributors);
    const affiliateLink = item.DetailPageURL;
    const price = item.Offers?.Listings?.[0]?.Price?.DisplayAmount || 'N/A';
    const bookImage = item.Images?.Primary?.Large?.URL || '';
    const description = item.ItemInfo?.ProductInfo?.Features?.map(f => f.DisplayValue).join(' ') || '';
    const publisher = item.ItemInfo?.ByLineInfo?.Manufacturer?.DisplayValue || 'Unknown';
    const releaseDate = extractReleaseDate(item);

    // Save authors and get IDs
    const authorIds = [];
    for (const name of authors) {
        if (!name) continue;
        let author = await Author3x.findOne({ name });
        if (!author) {
            author = await Author3x.create({ name, books: [] });
        }
        authorIds.push(author._id);
    }

    // Upsert book
    const bookDoc = await Book3x.findOneAndUpdate(
        { asin },
        {
            asin,
            title,
            authors: authorIds,
            categories: [categoryId],
            affiliateLink,
            price,
            bookImage,
            description,
            publisher,
            releaseDate
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Add book to each author's books array
    for (const authorId of authorIds) {
        const authorDoc = await Author3x.findById(authorId);
        if (!authorDoc.books.includes(bookDoc._id)) {
            authorDoc.books.push(bookDoc._id);
            await authorDoc.save();
        }
    }

    console.log(`Saved book: ${title}`);
}

/** Update total number of books in category */
async function updateCategoryBookCount(categoryId) {
    const count = await Book3x.countDocuments({ categories: categoryId });
    await Category3x.findByIdAndUpdate(categoryId, { totalBooks: count });
    console.log(`Updated category totalBooks: ${count}`);
}

/** Main function */
async function main() {
    try {
        await mongoose.connect(MONGO_URI, { dbName: '3xBooks', useNewUrlParser: true, useUnifiedTopology: true });
        console.log('MongoDB connected');
        let startFetching = false
        const categories = await Category3x.find();
        for (const cat of categories) {
            console.log(`\nFetching books for category: ${cat.name}`);

            // Start only when we reach "Americas"
            if (!startFetching) {
                if (cat.name) {
                    startFetching = true;
                } else {
                    continue; // skip until we reach "Americas"
                }
            }

            if (startFetching) {
                // First request to get total count
                const firstPageResult = await searchBooksByCategory(cat.name, 1);
                const totalCount = firstPageResult.TotalResultCount || 0;
                const totalPages = Math.min(Math.ceil(totalCount / 10), 10); // max 10 pages per PAAPI

                // Loop through pages
                for (let page = 1; page <= totalPages; page++) {
                    const result = await searchBooksByCategory(cat.name, page);
                    const books = result.Items || [];
                    for (const item of books) {
                        await saveBook(item, cat._id);
                        await sleep(1200); // prevent throttling
                    }
                }

                await updateCategoryBookCount(cat._id); // update totalBooks after fetching
                
            }
            
        }

        console.log('✅ All books fetched and saved');
    await mongoose.disconnect();
    } catch (err) {
        console.error(err);
        await mongoose.disconnect();
    }
}

main();
