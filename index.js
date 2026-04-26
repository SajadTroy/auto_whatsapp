require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const { client, getIsReady } = require('./whatsapp');
const { addToQueue, formatPhoneNumber } = require('./queue');

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware to parse JSON request bodies
app.use(express.json());

// API Key Hash Checking Middleware
const apiKeyMiddleware = (req, res, next) => {
    // Get the API key from 'x-api-key' header or 'api_key' query parameter
    const providedKey = req.headers['x-api-key'] || req.query.api_key;
    const expectedKey = process.env.API_SECRET_KEY;

    if (!expectedKey) {
        console.warn('API_SECRET_KEY is not set in environment variables!');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    if (!providedKey) {
        return res.status(401).json({ error: 'API key is missing. Provide it via x-api-key header or api_key query parameter.' });
    }

    try {
        // Securely compare hashes to avoid timing attacks
        const providedHash = crypto.createHash('sha256').update(providedKey).digest();
        const expectedHash = crypto.createHash('sha256').update(expectedKey).digest();

        if (crypto.timingSafeEqual(providedHash, expectedHash)) {
            next();
        } else {
            return res.status(403).json({ error: 'Invalid API key' });
        }
    } catch (err) {
        console.error('Error during API key validation:', err);
        return res.status(500).json({ error: 'Internal server error during authentication' });
    }
};

// Apply the API key middleware to all /whatsapp routes
app.use('/whatsapp', apiKeyMiddleware);

// Endpoint to check if a number has an active WhatsApp account
app.post('/whatsapp/check-number', async (req, res) => {
    try {
        if (!getIsReady()) {
            return res.status(503).json({ error: 'WhatsApp client is not ready yet.' });
        }

        const { number } = req.body;
        
        if (!number) {
            return res.status(400).json({ error: 'Phone number is required.' });
        }

        const formattedNumber = formatPhoneNumber(number);
        
        // isRegisteredUser requires the formatted number (e.g. 1234567890@c.us)
        const isRegistered = await client.isRegisteredUser(formattedNumber);
        
        return res.json({ registered: isRegistered, number: formattedNumber });
    } catch (error) {
        console.error('Error checking number:', error);
        return res.status(500).json({ error: 'Internal server error while checking number.' });
    }
});

// Endpoint to queue a message for sending
app.post('/whatsapp/send-message', (req, res) => {
    try {
        if (!getIsReady()) {
            return res.status(503).json({ error: 'WhatsApp client is not ready yet.' });
        }

        const { number, message } = req.body;

        if (!number || !message) {
            return res.status(400).json({ error: 'Both number and message are required.' });
        }

        // Add the message to the internal processing queue
        addToQueue(number, message);

        // Immediately return a 202 Accepted response with the queued status
        return res.status(202).json({ 
            status: 'queued', 
            number: number 
        });

    } catch (error) {
        console.error('Error queuing message:', error);
        return res.status(500).json({ error: 'Internal server error while queuing message.' });
    }
});

// Start the Express server
app.listen(PORT, () => {
    console.log(`🚀 Express API server is running on http://localhost:${PORT}`);
});
