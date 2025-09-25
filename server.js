const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const KITE_API_KEY = process.env.KITE_API_KEY;
const KITE_API_SECRET = process.env.KITE_API_SECRET;

// In-memory token storage (use database in production)
let tokenStore = {
  access_token: null,
  created_at: null,
  expires_at: null
};

// Check if access token is valid (not expired)
function isTokenValid() {
  if (!tokenStore.access_token || !tokenStore.expires_at) {
    return false;
  }
  return new Date() < new Date(tokenStore.expires_at);
}

// Generate checksum for token exchange
function generateChecksum(apiKey, requestToken, apiSecret) {
  return crypto
    .createHash('sha256')
    .update(apiKey + requestToken + apiSecret)
    .digest('hex');
}

// Make API call to Kite with current access token
async function kiteApiCall(endpoint, options = {}) {
  const { method = 'GET', body = null } = options;
  
  if (!KITE_API_KEY) {
    throw new Error('Kite API key not configured');
  }

  if (!isTokenValid()) {
    throw new Error('Access token expired or not available. Please login again.');
  }

  const headers = {
    Authorization: `token ${KITE_API_KEY}:${tokenStore.access_token}`,
    'X-Kite-Version': '3'
  };

  const fetchOpts = { method, headers };
  if (body && method !== 'GET') {
    headers['Content-Type'] = 'application/json';
    fetchOpts.body = JSON.stringify(body);
  }

  const resp = await fetch(endpoint, fetchOpts);
  const text = await resp.text();

  try {
    const parsed = JSON.parse(text);
    if (!resp.ok) {
      // If token expired, clear it
      if (resp.status === 403 || parsed.message?.includes('token')) {
        tokenStore = { access_token: null, created_at: null, expires_at: null };
      }
      throw new Error(parsed.message || `API error ${resp.status}`);
    }
    return parsed;
  } catch (e) {
    if (!resp.ok) {
      throw new Error(`API error ${resp.status}: ${text}`);
    }
    throw e;
  }
}

// Get Kite login URL
app.get('/api/auth/login-url', (req, res) => {
  if (!KITE_API_KEY) {
    return res.status(500).json({
      success: false,
      error: 'Kite API key not configured'
    });
  }

  const loginUrl = `https://kite.zerodha.com/connect/login?api_key=${KITE_API_KEY}&v=3`;
  
  res.json({
    success: true,
    data: {
      login_url: loginUrl,
      api_key: KITE_API_KEY
    }
  });
});

// Handle Kite callback and exchange request token for access token
app.post('/api/auth/token-exchange', async (req, res) => {
  try {
    const { request_token } = req.body;

    if (!request_token) {
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

    const checksum = generateChecksum(KITE_API_KEY, request_token, KITE_API_SECRET);

    const response = await fetch('https://api.kite.trade/session/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Kite-Version': '3'
      },
      body: new URLSearchParams({
        api_key: KITE_API_KEY,
        request_token,
        checksum
      })
    });

    const result = await response.json();

    if (!response.ok || result.status !== 'success') {
      throw new Error(result.message || 'Failed to exchange token');
    }

    // Store the access token with expiry (6 AM next day IST)
    const now = new Date();
    const tomorrow6AM = new Date(now);
    tomorrow6AM.setDate(now.getDate() + 1);
    tomorrow6AM.setHours(6, 0, 0, 0); // 6:00 AM
    
    tokenStore = {
      access_token: result.data.access_token,
      created_at: now.toISOString(),
      expires_at: tomorrow6AM.toISOString()
    };

    res.json({
      success: true,
      data: {
        message: 'Login successful',
        user_id: result.data.user_id,
        expires_at: tokenStore.expires_at
      }
    });

  } catch (error) {
    console.error('Token exchange error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to exchange token'
    });
  }
});

// Check authentication status
app.get('/api/auth/status', (req, res) => {
  const isValid = isTokenValid();
  
  res.json({
    success: true,
    data: {
      authenticated: isValid,
      expires_at: tokenStore.expires_at,
      needs_login: !isValid
    }
  });
});

// Generate tradingsymbol for PUT option
function generatePutTradingSymbol(symbol, expiry, strike) {
  // Parse expiry date (YYYY-MM-DD format)
  const expiryDate = new Date(expiry);
  
  // Get year (last 2 digits) and month
  const year = expiryDate.getFullYear().toString().slice(-2);
  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 
                     'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const month = monthNames[expiryDate.getMonth()];
  
  // Format: SYMBOL + YY + MMM + STRIKE + PE
  // Example: RELIANCE24OCT3000PE
  return `${symbol.toUpperCase()}${year}${month}${strike}PE`;
}

// Put LTP endpoint (requires authentication)
app.post('/api/put-ltp', async (req, res) => {
  try {
    // Check if authenticated first
    if (!isTokenValid()) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated. Please login first.',
        needs_login: true
      });
    }

    const { symbol, strike, expiry } = req.body;
    
    if (!symbol || !strike || !expiry) {
      return res.status(400).json({ 
        success: false, 
        error: 'symbol, strike, and expiry are required' 
      });
    }

    const symbolUpper = symbol.toUpperCase().trim();
    const strikePrice = Number(strike);
    const expiryDate = expiry.trim();

    // Generate the tradingsymbol directly
    const tradingSymbol = generatePutTradingSymbol(symbolUpper, expiryDate, strikePrice);
    
    // Call LTP API with the generated tradingsymbol
    const ltpData = await kiteApiCall('https://api.kite.trade/quote/ltp', {
      method: 'POST',
      body: { i: [`NFO:${tradingSymbol}`] }
    });

    const instrumentKey = `NFO:${tradingSymbol}`;
    const ltpInfo = ltpData?.data?.[instrumentKey];

    if (!ltpInfo) {
      return res.json({
        success: false,
        error: `No data found for ${tradingSymbol}. Please verify the symbol, expiry date, and strike price.`
      });
    }

    const ltp = ltpInfo.last_price || 0;

    // For lot size, we'll need to make a separate call to get instrument details
    // or use common lot sizes for major indices
    const lotSizeMap = {
      'NIFTY': 50,
      'BANKNIFTY': 15,
      'FINNIFTY': 40,
      'MIDCPNIFTY': 75,
      'SENSEX': 10,
      'BANKEX': 15
    };

    const lotSize = lotSizeMap[symbolUpper] || 1; // Default to 1 if not found

    res.json({
      success: true,
      data: {
        symbol: symbolUpper,
        strike: strikePrice,
        expiry: expiryDate,
        ltp: ltp,
        lot_size: lotSize,
        tradingsymbol: tradingSymbol,
        total_premium: ltp * lotSize
      }
    });

  } catch (error) {
    console.error('Put LTP error:', error);
    
    // If token expired during request, return appropriate error
    if (error.message.includes('token') || error.message.includes('expired')) {
      return res.status(401).json({
        success: false,
        error: 'Session expired. Please login again.',
        needs_login: true
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch PUT LTP'
    });
  }
});

// Test endpoint to verify tradingsymbol generation
app.get('/api/test/tradingsymbol', (req, res) => {
  const { symbol = 'BANKNIFTY', expiry = '2024-12-26', strike = '48000' } = req.query;
  
  try {
    const tradingSymbol = generatePutTradingSymbol(symbol, expiry, strike);
    res.json({
      success: true,
      data: {
        input: { symbol, expiry, strike },
        generated_tradingsymbol: tradingSymbol,
        format_explanation: 'SYMBOL + YY + MMM + STRIKE + PE'
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/health', (req, res) => {
  const isValid = isTokenValid();
  
  res.json({
    success: true,
    message: 'Put LTP API is running',
    timestamp: new Date().toISOString(),
    authenticated: isValid,
    token_expires_at: tokenStore.expires_at
  });
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ success: false, error: 'API endpoint not found' });
  } else {
    res.sendFile(__dirname + '/public/index.html');
  }
});

app.listen(PORT, () => {
  console.log(`Put LTP Server running on port ${PORT}`);
  console.log(`Frontend: http://localhost:${PORT}`);
  console.log(`Kite API Key configured: ${!!KITE_API_KEY}`);
  console.log(`Kite API Secret configured: ${!!KITE_API_SECRET}`);
  console.log(`Auto token management: enabled`);
});