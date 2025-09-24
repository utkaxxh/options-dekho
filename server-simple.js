const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configuration
const KITE_API_KEY = process.env.KITE_API_KEY;
const KITE_API_SECRET = process.env.KITE_API_SECRET;
const KITE_BASE_URL = 'https://api.kite.trade';
const JWT_SECRET = process.env.JWT_SECRET;
const APP_URL = process.env.APP_URL || 'http://localhost:5000';

// In-memory user storage (for demo purposes)
// In production, this should be a proper database
const users = new Map();
const sessions = new Map();

// Helper Functions
function generateJWT(userId) {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            error: 'Access token required' 
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (error) {
        return res.status(403).json({ 
            success: false, 
            error: 'Invalid or expired token' 
        });
    }
}

function generateChecksum(apiKey, requestToken, apiSecret) {
    const data = apiKey + requestToken + apiSecret;
    return crypto.createHash('sha256').update(data).digest('hex');
}

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

// User Authentication Routes

// Register new user
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({
                success: false,
                error: 'Email, password, and name are required'
            });
        }

        // Check if user already exists
        if (users.has(email)) {
            return res.status(400).json({
                success: false,
                error: 'User with this email already exists'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const userId = crypto.randomUUID();
        const user = {
            id: userId,
            email,
            password: hashedPassword,
            name,
            created_at: new Date().toISOString(),
            is_active: true,
            zerodha_connected: false
        };

        users.set(email, user);

        // Generate JWT token
        const token = generateJWT(userId);

        res.json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    zerodha_connected: user.zerodha_connected
                },
                token
            }
        });

    } catch (error) {
        console.error('Registration failed:', error);
        res.status(500).json({
            success: false,
            error: 'Registration failed: ' + error.message
        });
    }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        // Get user
        const user = users.get(email);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        // Generate JWT token
        const token = generateJWT(user.id);

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    zerodha_connected: user.zerodha_connected || false
                },
                token
            }
        });

    } catch (error) {
        console.error('Login failed:', error);
        res.status(500).json({
            success: false,
            error: 'Login failed: ' + error.message
        });
    }
});

// Get current user profile
app.get('/api/auth/profile', authenticateToken, async (req, res) => {
    try {
        // Find user by ID
        const user = Array.from(users.values()).find(u => u.id === req.userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    zerodha_connected: user.zerodha_connected || false
                }
            }
        });

    } catch (error) {
        console.error('Profile fetch failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch profile: ' + error.message
        });
    }
});

// Zerodha Integration Routes
app.get('/api/zerodha/auth-url', authenticateToken, (req, res) => {
    try {
        if (!KITE_API_KEY) {
            return res.status(500).json({ 
                success: false, 
                error: 'Kite API key not configured' 
            });
        }

        const state = crypto.randomBytes(32).toString('hex');
        const authUrl = `https://kite.zerodha.com/connect/login?api_key=${KITE_API_KEY}&v=3&state=${state}`;
        const redirectUrl = `${APP_URL}/api/zerodha/callback`;

        res.json({
            success: true,
            data: {
                authUrl,
                redirectUrl,
                state,
                message: 'Redirect user to authUrl and handle the callback'
            }
        });

    } catch (error) {
        console.error('Auth URL generation failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate auth URL: ' + error.message
        });
    }
});

// Handle Zerodha callback
app.get('/api/zerodha/callback', async (req, res) => {
    try {
        const { request_token, action, status, state } = req.query;

        if (status === 'error' || action === 'error') {
            return res.redirect(`${APP_URL}/auth-error?error=zerodha_auth_failed`);
        }

        if (!request_token) {
            return res.redirect(`${APP_URL}/auth-error?error=no_request_token`);
        }

        res.redirect(`${APP_URL}/zerodha-callback?request_token=${request_token}&state=${state}`);

    } catch (error) {
        console.error('Zerodha callback failed:', error);
        res.redirect(`${APP_URL}/auth-error?error=callback_failed`);
    }
});

// Exchange request token for access token
app.post('/api/zerodha/access-token', authenticateToken, async (req, res) => {
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
                error: 'Kite API secret not configured'
            });
        }

        // Generate checksum and exchange token
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
            throw new Error(result.message || 'Failed to exchange request token');
        }

        const { access_token, refresh_token, user_id, user_name, user_shortname } = result.data;

        // Find and update user
        const user = Array.from(users.values()).find(u => u.id === req.userId);
        if (user) {
            user.zerodha_connected = true;
            user.zerodha_user_id = user_id;
            user.zerodha_user_name = user_name;
            user.zerodha_access_token = access_token; // In production, encrypt this
            user.zerodha_refresh_token = refresh_token;
            user.zerodha_connected_at = new Date().toISOString();
        }

        res.json({
            success: true,
            message: 'Zerodha account connected successfully',
            data: {
                zerodha_user_id: user_id,
                zerodha_user_name: user_name,
                connected_at: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Token exchange failed:', error);
        res.status(400).json({
            success: false,
            error: 'Token exchange failed: ' + error.message
        });
    }
});

// Get Last Traded Price with authentication
app.post('/api/zerodha/ltp', authenticateToken, async (req, res) => {
    try {
        const { instruments } = req.body;

        if (!instruments || !Array.isArray(instruments)) {
            return res.status(400).json({
                success: false,
                error: 'Instruments array is required'
            });
        }

        // Find user
        const user = Array.from(users.values()).find(u => u.id === req.userId);
        if (!user || !user.zerodha_access_token) {
            return res.status(404).json({
                success: false,
                error: 'Zerodha account not connected'
            });
        }

        // Get LTP from Zerodha
        const instrumentParams = instruments.join('&i=');
        const ltp = await makeKiteAPICall(user.zerodha_access_token, `/quote/ltp?i=${instrumentParams}`);

        res.json({
            success: true,
            data: ltp
        });

    } catch (error) {
        console.error('LTP fetch failed:', error);
        res.status(400).json({
            success: false,
            error: 'Failed to fetch LTP: ' + error.message
        });
    }
});

// Disconnect Zerodha account
app.post('/api/zerodha/disconnect', authenticateToken, async (req, res) => {
    try {
        // Find and update user
        const user = Array.from(users.values()).find(u => u.id === req.userId);
        if (user) {
            user.zerodha_connected = false;
            delete user.zerodha_user_id;
            delete user.zerodha_user_name;
            delete user.zerodha_access_token;
            delete user.zerodha_refresh_token;
            delete user.zerodha_connected_at;
        }

        res.json({
            success: true,
            message: 'Zerodha account disconnected successfully'
        });

    } catch (error) {
        console.error('Zerodha disconnect failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to disconnect Zerodha account: ' + error.message
        });
    }
});

// Logout
app.post('/api/auth/logout', authenticateToken, (req, res) => {
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Options Premium Calculator API is running',
        timestamp: new Date().toISOString(),
        services: {
            kite_api: !!KITE_API_KEY,
            jwt: !!JWT_SECRET
        }
    });
});

// Serve frontend routes
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.get('/auth', (req, res) => {
    res.sendFile(__dirname + '/public/auth.html');
});

app.get('/app', (req, res) => {
    res.sendFile(__dirname + '/public/app.html');
});

app.get('/zerodha-callback', (req, res) => {
    res.sendFile(__dirname + '/public/zerodha-callback.html');
});

app.get('/auth-error', (req, res) => {
    res.sendFile(__dirname + '/public/auth-error.html');
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Options Premium Calculator server running on port ${PORT}`);
    console.log(`📱 Landing Page: http://localhost:${PORT}`);
    console.log(`🔐 Auth Page: http://localhost:${PORT}/auth`);
    console.log(`📊 Calculator App: http://localhost:${PORT}/app`);
    console.log(`🔑 Kite API Key configured: ${!!KITE_API_KEY}`);
    console.log(`🔐 Kite API Secret configured: ${!!KITE_API_SECRET}`);
    console.log(`🛡️  JWT Secret configured: ${!!JWT_SECRET}`);
    console.log(`💾 Using in-memory storage (demo mode)`);
});

module.exports = app;