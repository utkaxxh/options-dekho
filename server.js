const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Zerodha API Configuration from environment variables
const KITE_API_KEY = process.env.KITE_API_KEY;
const KITE_API_SECRET = process.env.KITE_API_SECRET;
const KITE_BASE_URL = 'https://api.kite.trade';

// In-memory session storage (use Redis in production)
const userSessions = new Map();

// Helper function to generate checksum
function generateChecksum(apiKey, requestToken, apiSecret) {
    const data = apiKey + requestToken + apiSecret;
    return crypto.createHash('sha256').update(data).digest('hex');
}

// Helper function to make authenticated API calls to Kite
async function makeKiteAPICall(accessToken, endpoint, method = 'GET', data = null) {
    const url = `${KITE_BASE_URL}${endpoint}`;
    const headers = {
        'Authorization': `token ${KITE_API_KEY}:${accessToken}`,
        'X-Kite-Version': '3',
        'Content-Type': 'application/json'
    };

    const config = {
        method: method,
        headers: headers
    };

    if (data && method !== 'GET') {
        config.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, config);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} - ${result.message || response.statusText}`);
        }

        if (result.status !== 'success') {
            throw new Error(`Kite API Error: ${result.message || 'Unknown error'}`);
        }

        return result.data;
    } catch (error) {
        console.error('Kite API call failed:', error);
        throw error;
    }
}

// Routes

// Get Kite login URL
app.get('/api/kite/login-url', (req, res) => {
    if (!KITE_API_KEY) {
        return res.status(500).json({ 
            success: false, 
            error: 'Kite API key not configured. Please set KITE_API_KEY in environment variables.' 
        });
    }

    const loginUrl = `https://kite.zerodha.com/connect/login?api_key=${KITE_API_KEY}&v=3`;
    res.json({ 
        success: true, 
        loginUrl,
        message: 'Complete login and provide the request token from the redirect URL' 
    });
});

// Exchange request token for access token
app.post('/api/kite/access-token', async (req, res) => {
    try {
        const { requestToken } = req.body;

        if (!requestToken) {
            return res.status(400).json({ 
                success: false, 
                error: 'Request token is required' 
            });
        }

        if (!KITE_API_SECRET) {
            return res.status(500).json({ 
                success: false, 
                error: 'Kite API secret not configured. Please set KITE_API_SECRET in environment variables.' 
            });
        }

        const checksum = generateChecksum(KITE_API_KEY, requestToken, KITE_API_SECRET);
        
        const response = await fetch(`${KITE_BASE_URL}/session/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `api_key=${KITE_API_KEY}&request_token=${requestToken}&checksum=${checksum}`
        });

        const result = await response.json();

        if (!response.ok || result.status !== 'success') {
            throw new Error(result.message || 'Failed to generate access token');
        }

        const { access_token, user_id } = result.data;
        
        // Store session
        const sessionId = crypto.randomUUID();
        userSessions.set(sessionId, {
            accessToken: access_token,
            userId: user_id,
            createdAt: new Date()
        });

        res.json({
            success: true,
            sessionId,
            userId: user_id,
            message: 'Successfully authenticated with Zerodha'
        });

    } catch (error) {
        console.error('Token exchange failed:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Get user profile
app.get('/api/kite/profile', async (req, res) => {
    try {
        const sessionId = req.headers['x-session-id'];
        const session = userSessions.get(sessionId);

        if (!session) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired session'
            });
        }

        const profile = await makeKiteAPICall(session.accessToken, '/user/profile');
        res.json({ success: true, data: profile });

    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Get Last Traded Price (LTP)
app.post('/api/kite/ltp', async (req, res) => {
    try {
        const sessionId = req.headers['x-session-id'];
        const session = userSessions.get(sessionId);

        if (!session) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired session'
            });
        }

        const { instruments } = req.body;
        
        if (!instruments || !Array.isArray(instruments)) {
            return res.status(400).json({
                success: false,
                error: 'Instruments array is required'
            });
        }

        const instrumentParams = instruments.join('&i=');
        const ltp = await makeKiteAPICall(session.accessToken, `/quote/ltp?i=${instrumentParams}`);
        
        res.json({ success: true, data: ltp });

    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Get quotes
app.post('/api/kite/quotes', async (req, res) => {
    try {
        const sessionId = req.headers['x-session-id'];
        const session = userSessions.get(sessionId);

        if (!session) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired session'
            });
        }

        const { instruments } = req.body;
        
        if (!instruments || !Array.isArray(instruments)) {
            return res.status(400).json({
                success: false,
                error: 'Instruments array is required'
            });
        }

        const instrumentParams = instruments.join('&i=');
        const quotes = await makeKiteAPICall(session.accessToken, `/quote?i=${instrumentParams}`);
        
        res.json({ success: true, data: quotes });

    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Search instruments
app.get('/api/kite/instruments', async (req, res) => {
    try {
        const sessionId = req.headers['x-session-id'];
        const session = userSessions.get(sessionId);

        if (!session) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired session'
            });
        }

        const { search } = req.query;
        
        if (!search) {
            return res.status(400).json({
                success: false,
                error: 'Search query is required'
            });
        }

        const instruments = await makeKiteAPICall(session.accessToken, `/instruments?search=${encodeURIComponent(search)}`);
        
        res.json({ success: true, data: instruments });

    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Logout
app.post('/api/kite/logout', (req, res) => {
    const sessionId = req.headers['x-session-id'];
    
    if (sessionId && userSessions.has(sessionId)) {
        userSessions.delete(sessionId);
    }
    
    res.json({ 
        success: true, 
        message: 'Logged out successfully' 
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Kite API server is running',
        timestamp: new Date().toISOString(),
        activeSessions: userSessions.size
    });
});

// Serve static files from public directory
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Kite API server running on port ${PORT}`);
    console.log(`📱 Frontend: http://localhost:${PORT}`);
    console.log(`🔗 API Base: http://localhost:${PORT}/api`);
    console.log(`🔑 API Key configured: ${!!KITE_API_KEY}`);
    console.log(`🔐 API Secret configured: ${!!KITE_API_SECRET}`);
});

module.exports = app;