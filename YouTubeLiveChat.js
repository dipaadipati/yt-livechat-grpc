const grpc = require('@grpc/grpc-js');
const { V3DataLiveChatMessageServiceClient } = require('./grpc/stream_list_grpc_pb.js');
const { LiveChatMessageListRequest } = require('./grpc/stream_list_pb.js');
const EventEmitter = require('events');

class YouTubeLiveChat extends EventEmitter {
    constructor(youtubeAPI, channelId, videoId = '') {
        super();
        this.youtubeAPI = youtubeAPI;
        this.currentVideoId = null;
        this.liveChatId = null;
        this.nextPageToken = '';
        this.quotaSpent = 0;
        this.processedMessages = new Set();

        (async () => {
            try {
                if (videoId != '') {
                    this.currentVideoId = videoId;
                } else if (channelId.startsWith('UC')) {
                    this.channelId = channelId;
                } else {
                    throw new Error('Channel not found for ID: ' + channelId);
                }
            } catch (err) {
                console.error('Error initializing channelId:', err);
                console.error('\n\x1b[31mTo get the channel ID correctly:\x1b[0m\n' +
                    '\x1b[33m1. Navigate to the YouTube channel page\n' +
                    '2. Click the "About" tab\n' +
                    '3. Click "Share channel" and copy the channel ID\x1b[0m');
                this.channelId = null;
            }
        })();
    }

    // Mendapatkan video live terbaru dari channel
    async getCurrentLiveVideo() {
        try {
            const response = await this.youtubeAPI.search.list({
                channelId: this.channelId,
                eventType: 'live',
                type: ['video'],
                part: ['id,snippet']
            });
            const data = response.data;

            this.quotaSpent += 100;

            if (data.items && data.items.length > 0) {
                const liveVideo = data.items[0];
                this.currentVideoId = liveVideo.id.videoId;
                console.log(`Found live video: ${liveVideo.snippet.title}`);
                return this.currentVideoId;
            } else {
                console.log('No live video found');
                console.log(`Total quota spent: ${this.quotaSpent} units`);
                return null;
            }
        } catch (error) {
            console.error('Error getting live video:', error.message);
            return null;
        }
    }

    // Mendapatkan live chat ID dari video
    async getLiveChatId(videoId) {
        try {
            const response = await this.youtubeAPI.videos.list({
                id: [videoId],
                part: ['liveStreamingDetails']
            });
            const data = response.data;

            this.quotaSpent += 1;

            if (data.items && data.items.length > 0) {
                const liveChatId = data.items[0].liveStreamingDetails?.activeLiveChatId;
                this.liveChatId = liveChatId;
                console.log(`Found live chat ID: ${liveChatId}`);
                return liveChatId;
            }
        } catch (error) {
            console.error('Error getting live chat ID:', error.message);
        }
        return null;
    }

    // Mendapatkan total kuota yang telah digunakan
    getQuotaSpent() {
        return this.quotaSpent;
    }

    async startLiveChatMonitoring() {
        try {
            if (!this.currentVideoId) {
                const videoId = await this.getCurrentLiveVideo();
                if (!videoId) {
                    console.log('Tidak ada video live yang ditemukan. Mencoba lagi dalam 30 detik...');
                    setTimeout(() => this.startLiveChatMonitoring(), 30000);
                    return;
                }
            }

            const liveChatId = await this.getLiveChatId(this.currentVideoId);
            if (!liveChatId) {
                console.log('Tidak ada live chat yang ditemukan. Mencoba lagi dalam 30 detik...');
                setTimeout(() => this.startLiveChatMonitoring(), 30000);
                return;
            }

            const client = new V3DataLiveChatMessageServiceClient(
                'youtube.googleapis.com:443',
                grpc.credentials.createSsl()
            );

            while (true) {
                const request = new LiveChatMessageListRequest();
                request.setLiveChatId(this.liveChatId);
                request.setMaxResults(20);
                request.setPartList(['snippet', 'authorDetails']);
                request.setPageToken(this.nextPageToken);

                const metadata = new grpc.Metadata();
                metadata.add('x-goog-api-key', this.youtubeAPI.context._options.auth);

                const stream = client.streamList(request, metadata);

                for await (const response of stream) {
                    const res = response.toObject();
                    const messages = res.itemsList;

                    messages.forEach(msg => {
                        const messageId = msg.id;

                        if (this.processedMessages.has(messageId)) {
                            return;
                        }

                        const chatMessage = {
                            author: msg.authorDetails?.displayName || 'Unknown',
                            authorImage: msg.authorDetails?.profileImageUrl || null,
                            message: msg.snippet?.displayMessage || '',
                            isOwner: msg.authorDetails?.isChatOwner || false,
                            isMember: msg.authorDetails?.isChatSponsor || false,
                            isModerator: msg.authorDetails?.isChatModerator || false,
                            timestamp: new Date(msg.snippet?.publishedAt).toISOString()
                        };

                        // Emit event dengan pesan baru
                        this.emit('chat', chatMessage);

                        this.processedMessages.add(messageId);
                    });

                    this.nextPageToken = response.getNextPageToken();
                    if (!this.nextPageToken) break;
                }
            }

        } catch (error) {
            console.error('Error in live chat monitoring:', error.message);
            this.emit('error', error);
            setTimeout(() => this.startLiveChatMonitoring(), 5000);
        }
    }
}

module.exports = YouTubeLiveChat;