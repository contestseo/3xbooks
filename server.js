require('dotenv').config();
const nodemailer = require('nodemailer');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
// app.use(cors());


const allowedOrigins = [
  'https://3xbooks.com',
  'http://192.168.20.193:3000',
  'https://exbooks.onrender.com'
];

app.use(cors({
  origin: function(origin, callback){
    // allow requests with no origin (like mobile apps, Postman)
    if(!origin) return callback(null, true);
    if(allowedOrigins.indexOf(origin) === -1){
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET','POST','PUT','DELETE'],
  credentials: true
}));


app.use(bodyParser.json());

// ✅ Contact form endpoint (instant response)
app.post('/api/contact', (req, res) => {
  const { name, email, phone, subject, message } = req.body;

  if (!name || !email || !message) {
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
    from: `"${name}" <${email}>`,
    to: process.env.CONTACT_RECEIVER,
    subject: 'New Contact Form Submission',
    html: `
      <h3>Contact Form Details</h3>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
      <p><strong>Message:</strong><br/> ${message}</p>
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
    to: process.env.CONTACT_RECEIVER,
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



// MongoDB connection
const mongoUri = process.env.MONGO_URI;

mongoose.connect(mongoUri, { dbName: '3xBooks', useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// API Routes
app.use('/api/filter/books', require('./routes/books'));
app.use('/api/books', require('./routes/books'));
app.use('/api/authors', require('./routes/authors'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/category', require('./routes/categories'));
app.use('/api/series', require('./routes/series'));

// ✅ Serve React frontend build (important part)
// const frontendPath = path.join(__dirname, '../frontend/build');
// app.use(express.static(frontendPath));

// // Handle React routing, return index.html for all other routes
// app.get('*', (req, res) => {
//   res.sendFile(path.join(frontendPath, 'index.html'));
// });




// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
