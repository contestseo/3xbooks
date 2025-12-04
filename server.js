require('dotenv').config();
const nodemailer = require('nodemailer');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// ==== SSR IMPORTS FOR GOOGLE SEO ====
const chromium = require("chrome-aws-lambda");
const puppeteer = require("puppeteer-core");

const app = express();

const allowedOrigins = [
  'https://3xbooks.com',
  'http://localhost:3000',
  'http://192.168.20.186:3000',
  'https://exbooks.onrender.com'
];

app.use(cors({
  origin: function(origin, callback){
    if (!origin) return callback(null, true);
    if (!allowedOrigins.includes(origin)) {
      return callback(new Error('Not allowed by CORS'), false);
    }
    return callback(null, true);
  },
  methods: ['GET','POST','PUT','DELETE'],
  credentials: true
}));

app.use(bodyParser.json());

// ===== BOT DETECTION FUNCTION =====
function isBot(ua = "") {
  return /bot|googlebot|crawler|spider|robot|crawling|facebookexternalhit|twitterbot|bingbot/i.test(ua);
}

// ===== SSR: Render Page in Headless Chrome for Search Bots =====
async function renderPage(url) {
  const executablePath = await chromium.executablePath;

  const browser = await puppeteer.launch({
    executablePath,
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    headless: chromium.headless
  });

  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle0" });

  const html = await page.content();
  await browser.close();
  return html;
}

// ===== SSR Middleware =====
app.use(async (req, res, next) => {
  const ua = req.headers["user-agent"] || "";

  if (isBot(ua)) {
    try {
      const fullURL = req.protocol + "://" + req.get("host") + req.originalUrl;
      console.log("🤖 Rendering SSR for bot:", fullURL);

      const html = await renderPage(fullURL);
      return res.send(html);

    } catch (err) {
      console.error("❌ SSR Rendering Error:", err);
      return next();
    }
  }

  next();
});

// API Root Test
app.get("/", (req, res) => {
  res.send("Backend Live with SSR Enabled");
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  dbName: '3xBooksClone',
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("✅ MongoDB connected"))
.catch(err => console.log("❌ MongoDB connection failed:", err));

app.use('/api/books', require('./routes/books'));
app.use('/api/authors', require('./routes/authors'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/series', require('./routes/series'));

// ===== CONTACT FORM =====
app.post('/api/contact', (req, res) => {
  const { name, email, phone, subject, message } = req.body;

  if (!name || !phone || !email || !message) {
    return res.status(400).json({ error: 'Please fill all required fields' });
  }

  // Respond immediately
  res.status(200).json({ message: 'Email sent successfully' });

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: `Aspire Developer`,
    to: `${process.env.CONTACT_RECEIVER}, ${process.env.CONTACT_RECEIVER1}, ${process.env.CONTACT_RECEIVER2}`,
    subject: 'New Contact Form Submission',
    html: `
      <h3>Contact Form Details</h3>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
      <p><strong>Subject:</strong> ${subject || 'N/A'}</p>
      <p><strong>Message:</strong> ${message}</p>
    `,
  };

  transporter.sendMail(mailOptions)
    .then(() => console.log(`📧 Contact email sent from ${email}`))
    .catch(err => console.error('❌ Contact form email error:', err));
});

// ===== NEWSLETTER =====
app.post('/api/newsletter', (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Please fill all required fields' });
  }

  res.status(200).json({ message: 'Email sent successfully' });

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: `"Newsletter Subscriber" <${process.env.SMTP_USER}>`,
    to: `${process.env.CONTACT_RECEIVER}, ${process.env.CONTACT_RECEIVER1}, ${process.env.CONTACT_RECEIVER2}`,
    subject: 'New Newsletter Subscription',
    html: `<h3>Email:</h3><p>${email}</p>`
  };

  transporter.sendMail(mailOptions)
    .then(() => console.log(`📧 Newsletter email sent from ${email}`))
    .catch(err => console.error('❌ Newsletter email error:', err));
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
