const mongoose = require('mongoose');
const axios = require('axios');
const aws4 = require('aws4');
const path = require('path');
const slugify = require('slugify');
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
const SEARCH_PATH = '/paapi5/searchitems';
const GETITEMS_PATH = '/paapi5/getitems';
const MONGO_URI = process.env.MONGO_URI;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/** Helper to sign and send PAAPI request */
async function sendPaapiRequest(path, body, retries = 3) {
    const requestOptions = {
        host: ENDPOINT,
        path,
        service: SERVICE,
        region: REGION,
        method: 'POST',
        headers: {
            Host: ENDPOINT,
            Accept: "application/json, text/javascript",
            "Accept-Language": "en-US",
            "Content-Type": "application/json; charset=UTF-8",
            "Content-Encoding": "amz-1.0",
            "X-Amz-Target": path.includes('getitems')
                ? "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems"
                : "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems"
        },
        body: JSON.stringify(body)
    };

    aws4.sign(requestOptions, { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY });

    try {
        const response = await axios.post(`https://${ENDPOINT}${path}`, body, { headers: requestOptions.headers });
        return response.data;
    } catch (err) {
        const data = err.response?.data;
        const message = data?.Errors?.[0]?.Message || err.message;

        if (data?.__type?.includes("TooManyRequests") && retries > 0) {
            const delay = 4000; // wait 4 seconds before retry
            console.warn(`⚠️ Throttled by Amazon. Retrying in ${delay / 1000}s...`);
            await sleep(delay);
            return sendPaapiRequest(path, body, retries - 1);
        }

        console.error(`❌ PAAPI request error:`, data || err.message);
        return null;
    }
}


/** Search books by category/keyword */
async function searchBooksByCategory(keyword, page = 1) {
    const body = {
        Keywords: keyword,
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
            "ItemInfo.Classifications",
            "Images.Primary.Large",
            "Offers.Listings.MerchantInfo",
            "Offers.Listings.Price"
        ],
        Filters: {
            Condition: "New",
            Availability: "Available"
        }
    };
    const result = await sendPaapiRequest(SEARCH_PATH, body);
    return result?.SearchResult || {};
}

/** Get detailed items using ASINs */
async function getItemsDetails(asins) {
    if (!asins.length) return [];
    const body = {
        PartnerTag: PARTNER_TAG,
        PartnerType: 'Associates',
        Marketplace: 'www.amazon.com',
        ItemIds: asins.slice(0, 10),
        Resources: [
            "ItemInfo.Title",
            "ItemInfo.ByLineInfo",
            "ItemInfo.ContentInfo",
            "ItemInfo.ProductInfo",
            "ItemInfo.Classifications",
            "Images.Primary.Large",
            "Offers.Listings.Price",
            "Offers.Listings.MerchantInfo",
            "CustomerReviews.Count",
            "CustomerReviews.StarRating"
        ]
    };
    const result = await sendPaapiRequest(GETITEMS_PATH, body);
    return result?.ItemsResult?.Items || [];
}

/** Extract authors */
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

/** Extract release date */
function extractReleaseDate(item) {
    const dateStr = item.ItemInfo?.ContentInfo?.PublicationDate?.DisplayValue;
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
}

/** Generate unique slug */
async function generateUniqueSlug(title) {
    const baseSlug = slugify(title, { lower: true, strict: true });
    let slug = baseSlug;
    let count = 2;

    while (await Book3x.exists({ slug })) {
        slug = `${baseSlug}-${count}`;
        count++;
    }

    return slug;
}

/** Save book and link authors & category */
async function saveBook(item, categoryId) {
    const asin = item.ASIN;
    if (!asin) return;

    // Skip non-physical formats
    const binding = item.ItemInfo?.ProductInfo?.Binding?.DisplayValue 
        || item.ItemInfo?.Classifications?.Binding?.DisplayValue 
        || '';
    if (binding.toLowerCase().includes("kindle") || binding.toLowerCase().includes("audible")) {
        console.log(`❌ Skipped non-physical format: ${binding} - ${item.ItemInfo?.Title?.DisplayValue}`);
        return;
    }

    const title = item.ItemInfo?.Title?.DisplayValue || 'N/A';
    const slug = await generateUniqueSlug(title);

    const authors = extractAuthors(item.ItemInfo?.ByLineInfo?.Contributors);
    const affiliateLink = item.DetailPageURL;
    const price = item.Offers?.Listings?.[0]?.Price?.DisplayAmount || 'N/A';
    const bookImage = item.Images?.Primary?.Large?.URL || '';
    const description = item.ItemInfo?.ProductInfo?.Features?.map(f => f.DisplayValue).join(' ') || '';
    const publisher = item.ItemInfo?.ByLineInfo?.Manufacturer?.DisplayValue || 'Unknown';
    const releaseDate = extractReleaseDate(item);
    const feedbackCount = item.Offers?.Listings?.[0]?.MerchantInfo?.FeedbackCount || 0;
    const feedbackRating = item.Offers?.Listings?.[0]?.MerchantInfo?.FeedbackRating || 0;

    const authorIds = [];
    for (const name of authors) {
        if (!name) continue;
        let author = await Author3x.findOne({ name });
        if (!author) author = await Author3x.create({ name, books: [] });
        authorIds.push(author._id);
    }

    const bookDoc = await Book3x.findOneAndUpdate(
        { asin },
        {
            asin,
            title,
            slug,
            authors: authorIds,
            categories: [categoryId],
            affiliateLink,
            price,
            bookImage,
            description,
            publisher,
            releaseDate,
            feedbackCount,
            feedbackRating,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    for (const authorId of authorIds) {
        const authorDoc = await Author3x.findById(authorId);
        if (!authorDoc.books.includes(bookDoc._id)) {
            authorDoc.books.push(bookDoc._id); // ✅ FIXED: use ObjectId, not slug
            await authorDoc.save();
        }
    }

    console.log(`✅ Saved book: ${title} (${slug})`);
}

/** Update category book count */
async function updateCategoryBookCount(categoryId) {
    const count = await Book3x.countDocuments({ categories: categoryId });
    await Category3x.findByIdAndUpdate(categoryId, { totalBooks: count });
}

/** Main function */
async function main() {
    try {
        await mongoose.connect(MONGO_URI, { dbName: '3xBooks', useNewUrlParser: true, useUnifiedTopology: true });
        console.log('MongoDB connected');

        const categories = await Category3x.find();
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

        for (const cat of categories) {
            console.log(`\nFetching books for category: ${cat.name}`);

            for (const letter of letters) {
                const keyword = `${cat.name} ${letter}`;
                const firstPage = await searchBooksByCategory(keyword, 1);
                const totalCount = firstPage.TotalResultCount || 0;
                const totalPages = Math.ceil(totalCount / 10);

                for (let page = 1; page <= totalPages; page++) {
                    const searchResult = await searchBooksByCategory(keyword, page);
                    const items = searchResult.Items || [];
                    const asins = items.map(i => i.ASIN);
                    const detailedItems = await getItemsDetails(asins);

                    for (const item of detailedItems) {
                        await saveBook(item, cat._id);
                        await sleep(1200); // API throttling
                    }
                }
            }

            await updateCategoryBookCount(cat._id);
        }

        console.log('✅ All books fetched and saved');
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
        await mongoose.disconnect();
    }
}

main();
