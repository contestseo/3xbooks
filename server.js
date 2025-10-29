require('dotenv').config();
const nodemailer = require('nodemailer');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// ------------------ CORS ------------------
const allowedOrigins = [
  'https://3xbooks.com',
  'http://localhost:3000',
  'https://exbooks.onrender.com'
];

app.use(cors({
  origin: function(origin, callback){
    if(!origin) return callback(null, true); // mobile apps, Postman
    if(allowedOrigins.indexOf(origin) === -1){
      return callback(new Error('CORS not allowed'), false);
    }
    return callback(null, true);
  },
  methods: ['GET','POST','PUT','DELETE'],
  credentials: true
}));

// ------------------ Body Parser ------------------
app.use(bodyParser.json());

// ------------------ Contact Form ------------------
app.post('/api/contact', async (req, res) => {
  const { name, email, phone, subject, message } = req.body;

  if (!name || !phone || !email || !message) {
    return res.status(400).json({ error: 'Please fill all required fields' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10), // 465 (SSL) or 587 (TLS)
      secure: process.env.SMTP_PORT == 465,     // true for 465, false for 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `"Aspire Developer" <${process.env.SMTP_USER}>`,
      to: `${process.env.CONTACT_RECEIVER},${process.env.CONTACT_RECEIVER1},${process.env.CONTACT_RECEIVER2}`,
      subject: 'New Contact Form Submission',
      html: `
        <h3>Contact Form Details</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Subject:</strong> ${subject || 'N/A'}</p>
        <p><strong>Message:</strong> ${message}</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    console.log(`✅ Contact form email sent from ${email}`);
    res.status(200).json({ message: 'Email sent successfully' });

  } catch (err) {
    console.error('❌ Contact form email error:', err);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// ------------------ Newsletter Form ------------------
app.post('/api/newsletter', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10),
      secure: process.env.SMTP_PORT == 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `"Newsletter Subscriber" <${process.env.SMTP_USER}>`,
      to: `${process.env.CONTACT_RECEIVER},${process.env.CONTACT_RECEIVER1},${process.env.CONTACT_RECEIVER2}`,
      subject: 'New Newsletter Form Submission',
      html: `<p><strong>Email:</strong> ${email}</p>`,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Newsletter email sent from ${email}`);
    res.status(200).json({ message: 'Email sent successfully' });

  } catch (err) {
    console.error('❌ Newsletter email error:', err);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// ------------------ MongoDB ------------------
mongoose.connect(process.env.MONGO_URI, {
  dbName: '3xBooks', useNewUrlParser: true, useUnifiedTopology: true
})
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ------------------ API Routes ------------------
app.use('/api/filter/books', require('./routes/books'));
app.use('/api/books', require('./routes/books'));
app.use('/api/authors', require('./routes/authors'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/category', require('./routes/categories'));
app.use('/api/series', require('./routes/series'));

// ------------------ Serve React Frontend ------------------
// const frontendPath = path.join(__dirname, '../frontend/build');
// app.use(express.static(frontendPath));
// app.get('*', (req, res) => res.sendFile(path.join(frontendPath, 'index.html')));

// ------------------ Start Server ------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
