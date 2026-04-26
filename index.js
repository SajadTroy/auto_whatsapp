const express = require('express');
const { client, getIsReady } = require('./whatsapp');
const { addToQueue, formatPhoneNumber } = require('./queue');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON request bodies
app.use(express.json());

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
