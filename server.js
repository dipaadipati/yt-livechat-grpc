const { google } = require('googleapis');
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const YouTubeLiveChat = require('./YouTubeLiveChat');
if (!fs.existsSync('./config.js')) {
    console.error('config.js not found! Please create config.js based on config.example.js');
    process.exit(1);
}
const { API_KEY, VIDEO_ID, CHANNEL_ID, HTTP_PORT, WS_PORT, MAX_HISTORY } = require('./config');

const youtube = google.youtube({
    version: 'v3',
    auth: API_KEY
});

const chat = new YouTubeLiveChat(youtube, CHANNEL_ID, VIDEO_ID);
if (!chat.channelId && !chat.currentVideoId) {
    process.exit(1);
}

// Simpan chat history
let chatHistory = [];

// Create HTTP server
const httpServer = http.createServer((req, res) => {
    if (req.url === '/api/chats') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(chatHistory));
    } else if (req.url === '/api/emojis') {
        const emojisDir = path.join(__dirname, 'emojis');
        fs.readdir(emojisDir, (err, files) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
                return;
            }
            const emojis = {};
            files.forEach(file => {
                if (file === '.gitkeep') return;
                const ext = path.extname(file).toLowerCase();
                const name = path.basename(file, ext);
                const urlEncodedFile = encodeURIComponent(file);
                emojis[name] = `/emojis/${urlEncodedFile}`;
            });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ emojis }));
        });
    } else if (req.url.startsWith('/emojis/')) {
        const emojiPath = path.join(__dirname, req.url);
        fs.readFile(emojiPath, (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Not Found');
            } else {
                res.writeHead(200, { 'Content-Type': 'image/png' });
                res.end(data);
            }
        });
    } else {
        let filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Not Found');
            } else {
                const ext = path.extname(filePath).toLowerCase();
                const mimeTypes = {
                    '.html': 'text/html',
                    '.js': 'application/javascript',
                    '.css': 'text/css',
                    '.json': 'application/json',
                    '.png': 'image/png',
                    '.jpg': 'image/jpeg',
                    '.gif': 'image/gif',
                };
                res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
                res.end(data);
            }
        });
    }
});

httpServer.listen(HTTP_PORT, () => {
    console.log(`HTTP server listening on http://localhost:${HTTP_PORT}`);
});

// Create WebSocket server
const wss = new WebSocket.Server({ port: WS_PORT });

wss.on('connection', (ws) => {
    ws.on('message', (data) => {
        try {
            const chat = JSON.parse(data);

            // Simpan ke history
            chatHistory.push(chat);
            if (chatHistory.length > MAX_HISTORY) {
                chatHistory.shift();
            }

            // Broadcast ke semua WebSocket clients

        } catch (err) {
            console.error('Invalid message:', data);
        }
    });
});

// Listen untuk pesan chat baru
chat.on('chat', (message) => {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
    // Atau lakukan sesuatu dengan message.authorDetails
});

// Listen untuk error
chat.on('error', (error) => {
    console.error('Chat error:', error);
});

chat.startLiveChatMonitoring();