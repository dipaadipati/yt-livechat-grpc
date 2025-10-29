# YouTube Live Chat GRPC

Versi terbaru dari [YouTube Live Chat Server](https://github.com/dipaadipati/yt-livechat-server) menggunakan gRPC untuk mengakses live chat secara langsung melalui YouTube API.

### ✨ Kelebihan (gRPC):
- Tidak memerlukan browser tab yang harus aktif
- Lebih stabil karena menggunakan API resmi YouTube
- Hemat resource karena tidak perlu menjalankan browser
- Auto reconnect yang lebih handal
- Tidak terpengaruh perubahan layout YouTube

### ⚠️ Keterbatasan:
- Membership badge tidak tersedia
- Membership emoji tidak tampil sebagai gambar (contoh: `:_emoji:`)
- Memerlukan YouTube API Key
- Terbatas oleh quota API YouTube

## 📋 Fitur

- ✅ Stream live chat YouTube secara real-time
- ✅ WebSocket server untuk broadcast chat ke multiple clients
- ✅ HTTP server untuk menampilkan chat di browser
- ✅ Support emoji custom
- ✅ Support ~~member badge~~ & moderator badge
- ✅ Chat history (max 100 pesan)
- ✅ Auto-reconnect ke server

## 🛠️ Requirement

- **Node.js** v14+ (download dari https://nodejs.org/)
- **YouTube API Key** (dari Google Cloud Console)

## 📦 Installation

### Setup Node.js Server

```bash
# Clone atau download project ini
git clone https://github.com/dipaadipati/yt-livechat-grpc.git

# Pindah lokasi
cd yt-livechat-grpc

# Install dependencies
npm install
```

## 🚀 Cara Menggunakan

### Step 1: Jalankan Server

```bash
node server.js
```

Output yang benar:
```
HTTP server listening on http://localhost:3000
Found live video: STREAM_NAME
Found live chat ID: LIVE_CHAT_ID
```

### Step 2: Lihat Chat

**Opsi A: Browser**
- Buka `http://localhost:3000` di browser baru
- Chat akan muncul real-time

**Opsi B: OBS**
1. Buka OBS Studio
2. Add Source → **Browser**
3. URL: `http://localhost:3000`
4. Width: 500 (dapat disesuaikan)
5. Height: 600 (dapat disesuaikan)
6. Centang **Shutdown source when not visible** (optional)

## ⚙️ Struktur Folder

```
│ yt-livechat-grpc
├── server.js              # Main WebSocket + HTTP server
├── config.examples.js     # File Konfigurasi (rename ke config.js)
├── YoutubeLiveChat.js     # Mainscript untuk mendapatkan stream API
├── public/
│   ├── index.html         # UI untuk menampilkan chat
│   ├── script.js          # Frontend logic
│   └── style.css          # Styling
├── emojis/                # Folder untuk custom emoji (optional)
├── grpc/                  # Folder yang berisi module grpc resmi
├── package.json
└── README.md              # File ini
```

## 🎯 Konfigurasi

```javascript
// config.js
module.exports = {
    API_KEY: 'YOUR_API_KEY_HERE',
    CHANNEL_ID: 'UC...', // Channel ID YouTube
    HTTP_PORT: 3000, // HTTP server port
    WS_PORT: 8080, // WebSocket port
    MAX_HISTORY: 100 // Maximum chat history to store
}
```

### Custom Emoji (optional)

1. Buat folder `emojis` di root project
2. Taruh file emoji (.png, .jpg, .webp) ke sana
3. Nama file harus sesuai dengan kode emoji di chat
   - Contoh: `YT_emote1.webp` → `YT_emote1` di chat akan diganti gambar

Contoh struktur:
```
emojis/
├── emote_name.png
├── lol.jpg
├── YT_emote1.webp
└── thumbsup.png
```

## ⚠️ Known Issues & Solusi

### ❌ Problem 1: "WebSocket is closed" Error

**Penyebab:** Server tidak running atau port terblokir

**Solusi:**
```bash
# Pastikan server sudah running
node server.js

# Cek apakah port 8080 & 3000 tidak terpakai
# Windows:
netstat -ano | findstr :8080
netstat -ano | findstr :3000
```

### ❌ Problem 2: Chat Tidak Muncul di OBS

**Penyebab:** Browser source setting salah atau URL tidak accessible

**Solusi:**
1. Buka `http://localhost:3000` di browser lokal, pastikan chat muncul
2. Di OBS, cek ulang URL dan settings
3. Restart OBS browser source (right-click → Refresh)
4. Cek firewall Windows tidak memblokir port 3000

### ❌ Problem 3: Emoji Tidak Muncul (Termasuk Member Emoji)

**Penyebab:** 
- Folder `emojis` tidak ada
- Nama file emoji tidak sesuai
- Member emoji muncul dalam format `:_namaemoji:`

**Solusi:**
1. Buat folder `emojis` di root project
2. Untuk emoji biasa:
   - Nama file harus sesuai format di chat
   - Contoh: `YT_emote1.webp` → `YT_emote1`
3. Untuk member emoji:
   - Simpan file dengan nama persis seperti format di chat
   - Contoh: Jika di chat muncul `:_catdance:` 
   - Simpan file dengan nama `:_catdance:.png`
4. Struktur folder yang benar:
   ```
   emojis/
   ├── YT_emote1.webp           # Emoji biasa
   ├── :_catdance:.png          # Member emoji
   ├── :_pepehappy:.png         # Member emoji
   └── other_emoji.png          # Emoji biasa
   ```
5. Cek di `/api/emojis` apakah emoji sudah ter-load:
   ```
   http://localhost:3000/api/emojis
   ```

**Note:** Dengan cara ini, member emoji yang muncul dalam format `:_namaemoji:` akan otomatis diganti dengan gambar yang sesuai dari folder `emojis`.

### ❌ Problem 4: Browser Tab Freeze/Lag

**Penyebab:** 
- Chat history terlalu banyak
- Rendering 100+ chat items

**Solusi:**
- Kurangi `MAX_HISTORY` di server.js:
  ```javascript
  const MAX_HISTORY = 50;  // Ubah dari 100 ke 50
  ```

### Clear Chat History

Restart server:
```bash
# Stop: Ctrl + C
# Start: node server.js
```

## 📱 API Endpoints

Jika butuh integrate ke aplikasi lain:

```bash
# Get all chat history
GET http://localhost:3000/api/chats

# Get all emoji mappings
GET http://localhost:3000/api/emojis

# Get specific emoji
GET http://localhost:3000/emojis/emoji_name.png
```

## 🚀 Deployment (Optional)

Untuk production / long-term streaming:

1. **Gunakan PM2** untuk auto-restart:
   ```bash
   npm install -g pm2
   pm2 start server.js --name "yt-chat"
   pm2 startup
   pm2 save
   ```

2. **Gunakan VPS/Cloud** jika perlu akses dari luar
3. **Setup HTTPS** jika perlu secure connection

## 💡 Kapan Menggunakan v1 atau v2?

### Gunakan v1 ([yt-livechat-server](https://github.com/dipaadipati/yt-livechat-server)) jika:
- Anda membutuhkan fitur membership badge
- Ingin menampilkan custom emoji sebagai gambar
- Tidak memiliki YouTube API Key
- Tidak masalah membuka tab browser

### Gunakan v2 (yt-livechat-grpc) jika:
- Ingin solusi yang lebih ringan tanpa browser
- Membutuhkan stabilitas yang lebih baik
- Memiliki YouTube API Key
- Tidak terlalu membutuhkan fitur membership badge

## 📝 Changelog

### v1.1
- Tambah support moderator badge
- Tambah support custom emoji
- Tambah chat history API
- Fix memory leak (process cache limit)

### v1.0
- Initial release
- Basic stream & broadcast

## 📄 License

Free to use for personal & streaming purpose

---

**Author:** Adipati Rezkya  
**Last Updated:** October 29, 2025