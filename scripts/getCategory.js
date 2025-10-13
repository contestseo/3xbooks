const mongoose = require('mongoose');
const axios = require('axios');
const aws4 = require('aws4');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Category3x = require('../models/Category3x');

// Amazon PAAPI credentials
const ACCESS_KEY = process.env.PAAPI_ACCESS_KEY;
const SECRET_KEY = process.env.PAAPI_SECRET_KEY;
const PARTNER_TAG = process.env.PAAPI_PARTNER_TAG;

const ENDPOINT = 'webservices.amazon.com';
const REGION = 'us-east-1';
const SERVICE = 'ProductAdvertisingAPI';
const PATH = '/paapi5/searchitems';

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI;

// Small delay to avoid hitting API limits
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function searchItems(keyword) {
  const body = {
    Keywords: keyword,
    PartnerTag: PARTNER_TAG,
    PartnerType: 'Associates',
    Marketplace: 'www.amazon.com',
    Resources: ["BrowseNodeInfo.BrowseNodes"]
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

  const response = await axios.post(`https://${ENDPOINT}${PATH}`, body, { headers: requestOptions.headers });
  return response.data.SearchResult?.Items || [];
}

async function saveCategory(node) {
  // Only save human-readable DisplayName
  const name = node.DisplayName;
  if (!name) return;

  try {
    await Category3x.updateOne(
      { name },
      { $setOnInsert: { name } },
      { upsert: true }
    );
    console.log('Saved category:', name);

    // Recursively save child categories
    if (node.BrowseNodes && node.BrowseNodes.length > 0) {
      for (const child of node.BrowseNodes) {
        await saveCategory(child);
      }
    }
  } catch (err) {
    console.error('Error saving category:', name, err.message);
  }
}

async function main() {
  try {
    await mongoose.connect(MONGO_URI, { dbName: '3xBooks', useNewUrlParser: true, useUnifiedTopology: true });
    console.log('MongoDB connected');

    const items = await searchItems('Books'); // Fetch items to extract categories

    for (const item of items) {
      const browseNodes = item.BrowseNodeInfo?.BrowseNodes || [];
      for (const node of browseNodes) {
        await saveCategory(node);
        await sleep(1200); // avoid API throttling
      }
    }

    console.log('✅ All human-readable categories saved');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
    await mongoose.disconnect();
  }
}

main();
