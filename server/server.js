const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    console.log('Request URL:', req.url);
    next();
});

// OAuth2 configuration
const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    'http://localhost:3000/oauth2callback'
);

// Generate OAuth2 URL
app.get('/auth', (req, res) => {
    console.log('Auth endpoint hit');
    try {
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: ['https://mail.google.com/']
        });
        console.log('Generated auth URL:', authUrl);
        res.redirect(authUrl);
    } catch (error) {
        console.error('Error generating auth URL:', error);
        res.status(500).send('Error generating authentication URL');
    }
});

// OAuth2 callback
app.get('/oauth2callback', async (req, res) => {
    const { code } = req.query;
    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        res.send('Authentication successful! You can close this window.');
    } catch (error) {
        res.status(500).send('Authentication failed');
    }
});

// Create a transporter using Gmail OAuth2
const createTransporter = async () => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            type: 'OAuth2',
            user: process.env.EMAIL,
            clientId: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            refreshToken: process.env.REFRESH_TOKEN,
            accessToken: oauth2Client.getAccessToken()
        }
    });
    return transporter;
};

// Email sending endpoint
app.post('/send-email', async (req, res) => {
    const { name, email, message } = req.body;
    
    try {
        const transporter = await createTransporter();
        
        const mailOptions = {
            from: process.env.EMAIL,
            to: '27divyansingh@gmail.com',
            subject: `New Contact Form Message from ${name}`,
            text: `
                Name: ${name}
                Email: ${email}
                Message: ${message}
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info);
        
        res.status(200).json({ message: 'Email sent successfully!' });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ 
            error: 'Failed to send email',
            details: error.message 
        });
    }
});

app.get('/', (req, res) => {
    res.send('Root is working!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 