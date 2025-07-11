const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const makeid = require('./id');
const axios = require('axios');
const { sendWhatsAppMessage } = require('./whatsapp'); // You'll need to implement this

// Configuration
const CONFIG = {
    OWNER_NUMBER: "947xxxxxxxx", // Replace with your owner number
    WELCOME_MESSAGE: "🚀 *NEW DEVICE PAIRED!*\n\n" +
                    "📱 *Number:* {number}\n" +
                    "🆔 *Pair Code:* {code}\n" +
                    "⏰ *Time:* {time}",
    STORAGE_FILE: path.join(__dirname, 'contacts.json')
};

// Initialize storage
if (!fs.existsSync(CONFIG.STORAGE_FILE)) {
    fs.writeFileSync(CONFIG.STORAGE_FILE, JSON.stringify([], null, 2));
}

// Helper functions
function readContacts() {
    try {
        return JSON.parse(fs.readFileSync(CONFIG.STORAGE_FILE, 'utf8'));
    } catch (err) {
        console.error('Error reading contacts:', err);
        return [];
    }
}

function saveContacts(contacts) {
    fs.writeFileSync(CONFIG.STORAGE_FILE, JSON.stringify(contacts, null, 2));
}

function formatTime() {
    return new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Colombo',
        hour12: true,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Main pairing route
router.get('/', async (req, res) => {
    const number = req.query.number?.replace(/[^0-9]/g, "");
    
    if (!number || number.length < 11) {
        return res.status(400).json({ error: 'Invalid number' });
    }

    const code = makeid(6);
    const contacts = readContacts();

    // Store new contact
    if (!contacts.some(c => c.number === number)) {
        contacts.push({
            number,
            code,
            paired: false,
            timestamp: new Date().toISOString()
        });
        saveContacts(contacts);
    }

    // Notify owner
    try {
        const message = CONFIG.WELCOME_MESSAGE
            .replace('{number}', number)
            .replace('{code}', code)
            .replace('{time}', formatTime());
        
        await sendWhatsAppMessage(CONFIG.OWNER_NUMBER, message);
    } catch (err) {
        console.error('Failed to notify owner:', err);
    }

    res.json({ code });
});

// Device connected webhook
router.post('/connected', async (req, res) => {
    const { number, code } = req.body;
    const contacts = readContacts();

    // Update connection status
    const contact = contacts.find(c => c.number === number && c.code === code);
    if (contact) {
        contact.paired = true;
        contact.connectedAt = new Date().toISOString();
        saveContacts(contacts);
    }

    res.json({ success: true });
});

// Admin routes (protected)
router.use((req, res, next) => {
    if (req.query.adminKey !== process.env.ADMIN_KEY) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    next();
});

router.get('/count', (req, res) => {
    const contacts = readContacts();
    res.json({
        total: contacts.length,
        paired: contacts.filter(c => c.paired).length
    });
});

router.post('/send-message', async (req, res) => {
    const { message } = req.body;
    const contacts = readContacts();

    try {
        for (const contact of contacts) {
            await sendWhatsAppMessage(contact.number, message);
        }
        res.json({ success: true, sentTo: contacts.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;