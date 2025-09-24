const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Zerodha API configuration
const KITE_API_KEY = process.env.KITE_API_KEY;
const KITE_API_SECRET = process.env.KITE_API_SECRET;
const APP_URL = process.env.APP_URL || 'http://localhost:5000';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Auth Routes

// Register
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
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        error: 'User already exists with this email' 
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user in database
    const { data: user, error } = await supabase
      .from('users')
      .insert([{
        email: email.toLowerCase(),
        password_hash: hashedPassword,
        name: name,
        created_at: new Date().toISOString(),
        email_confirmed: true // Skip email confirmation for simplicity
      }])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to create user account' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        name: user.name 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user info and token
    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          email_confirmed: user.email_confirmed
        },
        token: token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during registration'
    });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and password are required' 
      });
    }

    // Get user from database
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid email or password' 
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid email or password' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        name: user.name 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user info and token
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          email_confirmed: user.email_confirmed
        },
        token: token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during login'
    });
  }
});

// Get user profile
app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, email_confirmed, created_at, zerodha_connected, zerodha_user_id')
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile'
    });
  }
});

// Create alias for users/profile endpoint
app.get('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, email_confirmed, created_at, zerodha_connected, zerodha_user_id')
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile'
    });
  }
});

// Update user profile
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name is required' 
      });
    }

    const { data: user, error } = await supabase
      .from('users')
      .update({ 
        name: name,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) {
      throw new Error('Failed to update profile');
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        email_confirmed: user.email_confirmed
      }
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update profile'
    });
  }
});

// Add PATCH endpoint for users/profile (used by Zerodha disconnect)
app.patch('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    const updates = req.body;

    // Allow only specific fields to be updated
    const allowedFields = ['name', 'zerodha_connected', 'zerodha_access_token', 'zerodha_public_token', 'zerodha_user_id'];
    const filteredUpdates = {};

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    filteredUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('users')
      .update(filteredUpdates)
      .eq('id', req.user.id)
      .select('id, name, email, zerodha_connected, zerodha_user_id, created_at')
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
});

// Zerodha Integration Routes

// Initiate Zerodha authentication
app.get('/api/zerodha/auth-url', authenticateToken, (req, res) => {
  try {
    if (!KITE_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        error: 'Kite API key not configured' 
      });
    }

    // Generate state parameter for security (CSRF protection)
    const state = crypto.randomBytes(32).toString('hex');
    
    const authUrl = `https://kite.zerodha.com/connect/login?api_key=${KITE_API_KEY}&v=3&state=${state}`;
    const redirectUrl = `${APP_URL}/api/zerodha/callback`;

    res.json({
      success: true,
      data: {
        authUrl: authUrl,
        redirectUrl: redirectUrl,
        state: state
      }
    });
  } catch (error) {
    console.error('Zerodha auth URL error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate authentication URL'
    });
  }
});

// Handle Zerodha OAuth callback
app.get('/api/zerodha/callback', async (req, res) => {
  try {
    const { request_token, action, status, state, error } = req.query;
    
    // Redirect to callback page with parameters
    const params = new URLSearchParams({
      request_token: request_token || '',
      action: action || '',
      status: status || 'error',
      state: state || '',
      error: error || ''
    });

    res.redirect(`/zerodha-auth-callback.html?${params.toString()}`);

  } catch (error) {
    console.error('Zerodha callback error:', error);
    res.redirect(`/zerodha-auth-callback.html?status=error&error=${encodeURIComponent(error.message)}`);
  }
});

// Exchange request token for access token
app.post('/api/zerodha/access-token', authenticateToken, async (req, res) => {
  try {
    const { request_token } = req.body;
    
    if (!request_token) {
      return res.status(400).json({
        success: false,
        error: 'Request token is required'
      });
    }

    // Generate checksum
    const checksum = crypto
      .createHash('sha256')
      .update(KITE_API_KEY + request_token + KITE_API_SECRET)
      .digest('hex');

    // Make request to Zerodha for access token
    const response = await fetch('https://api.kite.trade/session/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Kite-Version': '3'
      },
      body: new URLSearchParams({
        api_key: KITE_API_KEY,
        request_token: request_token,
        checksum: checksum
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to get access token');
    }

    // Store access token in database
    const userId = req.user.id;
    const { error: updateError } = await supabase
      .from('users')
      .update({
        zerodha_access_token: result.data.access_token,
        zerodha_public_token: result.data.public_token,
        zerodha_user_id: result.data.user_id,
        zerodha_connected: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      throw new Error('Failed to save Zerodha credentials');
    }

    res.json({
      success: true,
      data: {
        access_token: result.data.access_token,
        user_id: result.data.user_id,
        user_name: result.data.user_name,
        public_token: result.data.public_token
      }
    });

  } catch (error) {
    console.error('Access token exchange error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to exchange access token'
    });
  }
});

// Get instruments list for symbol search
app.get('/api/zerodha/instruments', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { symbol } = req.query;
    
    // Get user's Zerodha credentials from database
    const { data: user, error } = await supabase
      .from('users')
      .select('zerodha_access_token, zerodha_connected')
      .eq('id', userId)
      .single();

    if (error || !user.zerodha_connected) {
      return res.status(400).json({
        success: false,
        error: 'Zerodha account not connected'
      });
    }

    // Get instruments from Zerodha
    const response = await fetch(`https://api.kite.trade/instruments`, {
      headers: {
        'Authorization': `token ${KITE_API_KEY}:${user.zerodha_access_token}`,
        'X-Kite-Version': '3'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch instruments');
    }

    const csvData = await response.text();
    // Parse CSV and filter by symbol if provided
    const lines = csvData.split('\n');
    const headers = lines[0].split(',');
    
    const instruments = [];
    for (let i = 1; i < lines.length && i < 1000; i++) { // Limit for performance
      const row = lines[i].split(',');
      if (row.length >= headers.length) {
        const instrument = {};
        headers.forEach((header, index) => {
          instrument[header.trim()] = row[index]?.trim();
        });
        
        // Filter for options and specific symbol if provided
        if (instrument.segment === 'NFO-OPT' || instrument.segment === 'BFO-OPT') {
          if (!symbol || instrument.name?.includes(symbol.toUpperCase())) {
            instruments.push(instrument);
          }
        }
      }
    }

    res.json({
      success: true,
      data: instruments.slice(0, 100) // Limit results
    });

  } catch (error) {
    console.error('Instruments fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch instruments'
    });
  }
});

// Get option chain for a specific stock
app.post('/api/zerodha/option-chain', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { symbol, expiry } = req.body;

    if (!symbol || !expiry) {
      return res.status(400).json({
        success: false,
        error: 'Symbol and expiry are required'
      });
    }

    // Get user's Zerodha credentials
    const { data: user, error } = await supabase
      .from('users')
      .select('zerodha_access_token, zerodha_connected')
      .eq('id', userId)
      .single();

    if (error || !user.zerodha_connected) {
      return res.status(400).json({
        success: false,
        error: 'Zerodha account not connected'
      });
    }

    // Get instruments first to find option tokens
    const instrumentsResponse = await fetch(`https://api.kite.trade/instruments/NFO`, {
      headers: {
        'Authorization': `token ${KITE_API_KEY}:${user.zerodha_access_token}`,
        'X-Kite-Version': '3'
      }
    });

    if (!instrumentsResponse.ok) {
      throw new Error('Failed to fetch instruments');
    }

    const csvData = await instrumentsResponse.text();
    const lines = csvData.split('\n');
    const headers = lines[0].split(',');
    
    // Find option instruments for the symbol and expiry
    const optionInstruments = [];
    const targetDate = new Date(expiry).toISOString().split('T')[0];
    
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',');
      if (row.length >= headers.length) {
        const instrument = {};
        headers.forEach((header, index) => {
          instrument[header.trim()] = row[index]?.trim();
        });
        
        // Check if it matches our criteria
        if (instrument.name === symbol.toUpperCase() && 
            instrument.instrument_type === 'PE' &&
            instrument.expiry === targetDate) {
          optionInstruments.push({
            instrument_token: instrument.instrument_token,
            trading_symbol: instrument.tradingsymbol,
            strike: parseFloat(instrument.strike),
            expiry: instrument.expiry
          });
        }
      }
    }

    if (optionInstruments.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'No put options found for the specified symbol and expiry'
      });
    }

    // Get LTP for these instruments (limit to 50 to avoid API limits)
    const limitedInstruments = optionInstruments.slice(0, 50);
    const instrumentTokens = limitedInstruments.map(inst => inst.instrument_token);
    
    const ltpResponse = await fetch(`https://api.kite.trade/quote/ltp`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${KITE_API_KEY}:${user.zerodha_access_token}`,
        'X-Kite-Version': '3',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        i: instrumentTokens
      })
    });

    const ltpData = await ltpResponse.json();

    if (!ltpResponse.ok) {
      throw new Error(ltpData.message || 'Failed to get LTP data');
    }

    // Combine instrument data with LTP
    const optionChain = limitedInstruments.map(inst => ({
      ...inst,
      ltp: ltpData.data[inst.instrument_token]?.last_price || 0
    }));

    res.json({
      success: true,
      data: optionChain
    });

  } catch (error) {
    console.error('Option chain error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch option chain'
    });
  }
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

app.get('/confirm', (req, res) => {
  res.sendFile(__dirname + '/public/confirm.html');
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Options Premium Calculator API is running',
    timestamp: new Date().toISOString()
  });
});

// Catch-all handler for SPA routing
app.get('*', (req, res) => {
  // If it's an API route that doesn't exist, return 404
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ 
      success: false, 
      error: 'API endpoint not found' 
    });
  } else {
    // For all other routes, serve the main app
    res.sendFile(__dirname + '/public/app.html');
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Options Premium Calculator server running on port ${PORT}`);
  console.log(`📱 Frontend: http://localhost:${PORT}`);
  console.log(`🔗 API Base: http://localhost:${PORT}/api`);
  console.log(`🗄️  Supabase URL configured: ${!!process.env.SUPABASE_URL}`);
  console.log(`🛡️  JWT Secret configured: ${!!process.env.JWT_SECRET}`);
});