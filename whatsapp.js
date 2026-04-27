const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

let isReady = false;

// Initialize the WhatsApp client with LocalAuth for session management
// Inside whatsapp.js
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

// Listen for the QR code event and log it to the terminal
client.on('qr', (qr) => {
    console.log('📱 Scan the QR code below to link your WhatsApp device:');
    qrcode.generate(qr, { small: true });
});

// Listen for the ready event
client.on('ready', () => {
    console.log('✅ WhatsApp client is successfully connected and ready!');
    isReady = true;
});

// Handle authentication failures
client.on('auth_failure', msg => {
    console.error('❌ Authentication failed:', msg);
});

// Handle disconnection
client.on('disconnected', (reason) => {
    console.log('❌ WhatsApp client disconnected:', reason);
    isReady = false;
});

// Start the client
client.initialize();

module.exports = {
    client,
    getIsReady: () => isReady
};
