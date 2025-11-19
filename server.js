require('dotenv').config();
const nodemailer = require('nodemailer');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

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

// ✅ Required by Render to wake instance
app.get("/", (req, res) => {
  res.send("✅ Backend API running");
});

// MongoDB connection
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


// ✅ Contact form endpoint (instant response)
app.post('/api/contact', (req, res) => {
  const { name, email, phone, subject, message } = req.body;

  if (!name || !phone || !email || !message) {
    return res.status(400).json({ error: 'Please fill all required fields' });
  }

  // Respond immediately
  res.status(200).json({ message: 'Email sent successfully' });

  // Send email in the background
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
    // to: `${process.env.CONTACT_RECEIVER}, ${process.env.CONTACT_RECEIVER2}`,
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
    .then(() => console.log(`✅ Contact form email sent from ${email}`))
    .catch(err => console.error('❌ Contact form email error:', err));
});


// ✅ Newsletter form endpoint (instant response)
app.post('/api/newsletter', (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Please fill all required fields' });
  }

  // Respond immediately
  res.status(200).json({ message: 'Email sent successfully' });

  // Send email in background
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
    subject: 'New Newsletter Form Submission',
    html: `
      <h3>Newsletter Form Details</h3>
      <p><strong>Email:</strong> ${email}</p>
    `,
  };

  transporter.sendMail(mailOptions)
    .then(() => console.log(`✅ Newsletter email sent from ${email}`))
    .catch(err => console.error('❌ Newsletter email error:', err));
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
