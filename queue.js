const { client } = require('./whatsapp');

// Internal in-memory queue to hold messages
const messageQueue = [];
let isProcessing = false;

/**
 * Helper function to format the phone number.
 * Strips spaces, '+', or '-' and appends '@c.us' if missing.
 */
function formatPhoneNumber(number) {
    let cleanedNumber = String(number).replace(/[\s+-]/g, '');
    
    if (!cleanedNumber.endsWith('@c.us')) {
        cleanedNumber = `${cleanedNumber}@c.us`;
    }
    
    return cleanedNumber;
}

/**
 * Helper to generate a random delay between min and max (in milliseconds).
 */
function getRandomDelay(min = 120000, max = 300000) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Adds a message to the queue and starts processing if not already doing so.
 */
function addToQueue(number, message) {
    const formattedNumber = formatPhoneNumber(number);
    messageQueue.push({ number: formattedNumber, message, originalNumber: number });
    
    console.log(`[Queue] 📥 Message added to queue for ${formattedNumber}. Queue length: ${messageQueue.length}`);
    
    if (!isProcessing) {
        processQueue();
    }
}

/**
 * Async function to process the queue sequentially with random delays.
 */
async function processQueue() {
    if (messageQueue.length === 0) {
        isProcessing = false;
        console.log('[Queue] 🛑 Queue is empty. Stopped processing.');
        return;
    }

    isProcessing = true;
    
    // Get the first message from the queue
    const task = messageQueue.shift();
    
    // Random delay between 2 and 5 minutes (120,000 to 300,000 ms)
    const delayMs = getRandomDelay(120000, 300000);
    console.log(`[Queue] ⏳ Delaying for ${(delayMs / 1000).toFixed(1)} seconds before sending to ${task.number}...`);
    
    // Wait for the random delay
    await new Promise(resolve => setTimeout(resolve, delayMs));
    
    try {
        console.log(`[Queue] 🚀 Attempting to send message to ${task.number}...`);
        
        // Use whatsapp-web.js to send the message
        await client.sendMessage(task.number, task.message);
        
        console.log(`[Queue] ✅ Successfully sent message to ${task.number}.`);
    } catch (error) {
        // Catch any failure and ensure the queue continues processing
        console.error(`[Queue] ❌ Failed to send message to ${task.number}:`, error.message);
    }
    
    // Recursively process the next item in the queue
    processQueue();
}

module.exports = {
    addToQueue,
    formatPhoneNumber
};
