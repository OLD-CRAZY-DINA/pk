const { Boom } = require('@hapi/boom');
const { makeWASocket } = require('baileys');

let client = null;

async function initWhatsApp() {
    client = makeWASocket({
        printQRInTerminal: true,
        auth: state.saveState,
        version: [2, 2413, 1]
    });

    client.ev.on('connection.update', (update) => {
        if (update.qr) console.log('QR Code:', update.qr);
        if (update.connection === 'open') console.log('WhatsApp connected!');
    });

    client.ev.on('messages.upsert', () => {});
}

async function sendWhatsAppMessage(number, message) {
    if (!client) await initWhatsApp();
    
    try {
        const jid = `${number}@s.whatsapp.net`;
        await client.sendMessage(jid, { text: message });
        return true;
    } catch (err) {
        console.error('Send message error:', err);
        throw err;
    }
}

module.exports = { sendWhatsAppMessage };