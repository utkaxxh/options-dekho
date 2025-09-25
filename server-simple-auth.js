const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

const KITE_API_KEY = process.env.KITE_API_KEY;
const KITE_API_SECRET = process.env.KITE_API_SECRET;
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Helper to call Kite API with current user's access token and handle expiry
async function kiteApiCall(userProfile, endpoint, { method = 'GET', body = null, isCSV = false } = {}) {
  if (!userProfile?.zerodha_connected || !userProfile?.zerodha_access_token) {
    const err = new Error('Zerodha account not connected');
    err.statusCode = 400;
    throw err;
  }

  const headers = {
    Authorization: `token ${KITE_API_KEY}:${userProfile.zerodha_access_token}`,
    'X-Kite-Version': '3'
  };

  let fetchOpts = { method, headers };
  if (body && method !== 'GET') {
    if (isCSV) {
      fetchOpts.body = body;
    } else {
      headers['Content-Type'] = 'application/json';
      fetchOpts.body = JSON.stringify(body);
    }
  }

  const resp = await fetch(endpoint, fetchOpts);
  const text = await resp.text();

  // Try JSON parse when not CSV
  let parsed;
  if (!isCSV) {
    try { parsed = JSON.parse(text); } catch (_) {}
  }

  const message = parsed?.message || parsed?.error_type || text;

  // Handle token expiry/invalid cases
  if (resp.status === 401 || resp.status === 403 || /Token is invalid|expired/i.test(message || '')) {
    // Mark user as disconnected so client can re-trigger login
    try {
      await supabase
        .from('users')
        .update({
          zerodha_connected: false,
          zerodha_access_token: null,
          zerodha_public_token: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userProfile.id);
    } catch (e) {
      console.warn('Failed to mark user disconnected after token expiry:', e.message);
    }

    const err = new Error('Zerodha session expired. Please reconnect.');
    err.statusCode = 401;
    throw err;
  }

  if (!resp.ok) {
    const err = new Error(message || `Kite API error ${resp.status}`);
    err.statusCode = resp.status;
    throw err;
  }

  return isCSV ? text : parsed;
}

// Helper using a centralized env KITE_ACCESS_TOKEN (public endpoints use this)
async function kiteApiCallWithEnv(endpoint, { method = 'GET', body = null, isCSV = false } = {}) {
  const apiKey = KITE_API_KEY;
  const accessToken = process.env.KITE_ACCESS_TOKEN;
  if (!apiKey || !accessToken) {
    const err = new Error('Kite API key or access token not configured');
    err.statusCode = 500;
    throw err;
  }

  const headers = {
    Authorization: `token ${apiKey}:${accessToken}`,
    'X-Kite-Version': '3'
  };

  let fetchOpts = { method, headers };
  if (body && method !== 'GET') {
    if (isCSV) {
      fetchOpts.body = body;
    } else {
      headers['Content-Type'] = 'application/json';
      fetchOpts.body = JSON.stringify(body);
    }
  }

  const resp = await fetch(endpoint, fetchOpts);
  const text = await resp.text();
  let parsed;
  if (!isCSV) {
    try { parsed = JSON.parse(text); } catch (_) {}
  }

  const message = parsed?.message || parsed?.error_type || text;

  if (resp.status === 401 || resp.status === 403 || /Token is invalid|expired/i.test(message || '')) {
    const err = new Error('Kite access token expired. Please refresh KITE_ACCESS_TOKEN.');
    err.statusCode = 401;
    throw err;
  }

  if (!resp.ok) {
    const err = new Error(message || `Kite API error ${resp.status}`);
    err.statusCode = resp.status;
    throw err;
  }

  return isCSV ? text : parsed;
}

// Public endpoints (no auth) for market data
app.get('/api/market/expiries', async (req, res) => {
  try {
    const symbol = (req.query.symbol || '').toUpperCase().trim();
    if (!symbol) {
      return res.status(400).json({ success: false, error: 'symbol is required' });
    }

    const csv = await kiteApiCallWithEnv('https://api.kite.trade/instruments/NFO', { method: 'GET', isCSV: true });
    const lines = csv.split('\n');
    const headers = lines[0].split(',');
    const idxName = headers.findIndex(h => h.trim() === 'name');
    const idxExpiry = headers.findIndex(h => h.trim() === 'expiry');
    const idxType = headers.findIndex(h => h.trim() === 'instrument_type');

    const expiries = new Set();
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',');
      if (row.length <= Math.max(idxName, idxExpiry, idxType)) continue;
      const name = (row[idxName] || '').trim();
      const itype = (row[idxType] || '').trim();
      if (name === symbol && (itype === 'PE' || itype === 'CE')) {
        expiries.add((row[idxExpiry] || '').trim());
      }
    }
    const sorted = Array.from(expiries).filter(Boolean).sort();
    res.json({ success: true, data: sorted });
  } catch (error) {
    const code = error.statusCode || 500;
    res.status(code).json({ success: false, error: error.message || 'Failed to fetch expiries' });
  }
});

app.get('/api/market/strikes', async (req, res) => {
  try {
    const symbol = (req.query.symbol || '').toUpperCase().trim();
    const expiry = (req.query.expiry || '').trim();
    const optionType = ((req.query.optionType || 'PE').toUpperCase() === 'CE') ? 'CE' : 'PE';
    if (!symbol || !expiry) {
      return res.status(400).json({ success: false, error: 'symbol and expiry are required' });
    }

    const csv = await kiteApiCallWithEnv('https://api.kite.trade/instruments/NFO', { method: 'GET', isCSV: true });
    const lines = csv.split('\n');
    const headers = lines[0].split(',');
    const idxName = headers.findIndex(h => h.trim() === 'name');
    const idxExpiry = headers.findIndex(h => h.trim() === 'expiry');
    const idxType = headers.findIndex(h => h.trim() === 'instrument_type');
    const idxStrike = headers.findIndex(h => h.trim() === 'strike');

    const strikes = new Set();
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',');
      if (row.length <= Math.max(idxName, idxExpiry, idxType, idxStrike)) continue;
      const name = (row[idxName] || '').trim();
      const exp = (row[idxExpiry] || '').trim();
      const itype = (row[idxType] || '').trim();
      if (name === symbol && exp === expiry && itype === optionType) {
        const s = parseFloat(row[idxStrike]);
        if (!Number.isNaN(s)) strikes.add(s);
      }
    }
    const sorted = Array.from(strikes).sort((a, b) => a - b);
    res.json({ success: true, data: sorted });
  } catch (error) {
    const code = error.statusCode || 500;
    res.status(code).json({ success: false, error: error.message || 'Failed to fetch strikes' });
  }
});

app.post('/api/market/put-ltp', async (req, res) => {
  try {
    const { symbol, expiry, strike } = req.body || {};
    const s = (symbol || '').toUpperCase().trim();
    const e = (expiry || '').trim();
    const k = Number(strike);
    if (!s || !e || !Number.isFinite(k)) {
      return res.status(400).json({ success: false, error: 'symbol, expiry, and strike are required' });
    }

    const csv = await kiteApiCallWithEnv('https://api.kite.trade/instruments/NFO', { method: 'GET', isCSV: true });
    const lines = csv.split('\n');
    const headers = lines[0].split(',');
    const idxName = headers.findIndex(h => h.trim() === 'name');
    const idxExpiry = headers.findIndex(h => h.trim() === 'expiry');
    const idxType = headers.findIndex(h => h.trim() === 'instrument_type');
    const idxStrike = headers.findIndex(h => h.trim() === 'strike');
    const idxToken = headers.findIndex(h => h.trim() === 'instrument_token');
    const idxTSym = headers.findIndex(h => h.trim() === 'tradingsymbol');
    const idxLot = headers.findIndex(h => h.trim() === 'lot_size');

    const options = [];
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',');
      if (row.length <= Math.max(idxName, idxExpiry, idxType, idxStrike, idxToken, idxTSym, idxLot)) continue;
      if ((row[idxName] || '').trim() !== s) continue;
      if ((row[idxExpiry] || '').trim() !== e) continue;
      if ((row[idxType] || '').trim() !== 'PE') continue;
      const strikeVal = parseFloat(row[idxStrike]);
      if (Number.isNaN(strikeVal)) continue;
      options.push({
        instrument_token: (row[idxToken] || '').trim(),
        tradingsymbol: (row[idxTSym] || '').trim(),
        strike: strikeVal,
        lot_size: parseInt((row[idxLot] || '0').trim(), 10) || 0
      });
    }

    if (options.length === 0) {
      return res.json({ success: true, data: null, message: 'No put options found for the specified symbol and expiry' });
    }

    // Exact or nearest strike
    options.sort((a, b) => Math.abs(a.strike - k) - Math.abs(b.strike - k));
    const chosen = options[0];

    const ltpData = await kiteApiCallWithEnv('https://api.kite.trade/quote/ltp', {
      method: 'POST',
      body: { i: [chosen.instrument_token] }
    });

    const ltp = ltpData?.data?.[chosen.instrument_token]?.last_price || 0;
    res.json({
      success: true,
      data: {
        ltp,
        instrument_token: chosen.instrument_token,
        tradingsymbol: chosen.tradingsymbol,
        usedStrike: chosen.strike,
        lot_size: chosen.lot_size
      }
    });
  } catch (error) {
    const code = error.statusCode || 500;
    res.status(code).json({ success: false, error: error.message || 'Failed to fetch put LTP' });
  }
});

const mapUserProfile = (record) => ({
  id: record.id,
  email: record.email,
  name: record.name,
  zerodha_connected: !!record.zerodha_connected,
  zerodha_user_id: record.zerodha_user_id,
  created_at: record.created_at,
  updated_at: record.updated_at
});

const getDisplayName = (authUser) => {
  const metadata = authUser.user_metadata || {};
  return (
    (metadata.full_name && metadata.full_name.trim()) ||
    (metadata.name && metadata.name.trim()) ||
  (authUser.email ? authUser.email.split('@')[0] : null) ||
  'User'
  );
};

const ensureUserRecord = async (authUser) => {
  const email = (authUser.email || '').toLowerCase();

  if (!email) {
  throw new Error('Authenticated user is missing an email address');
  }

  const { data: existing, error: selectError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  const now = new Date().toISOString();

  if (!existing) {
    const insertPayload = {
      email,
      name: getDisplayName(authUser),
  password_hash: 'supabase-managed',
      email_confirmed: !!authUser.email_confirmed_at,
      created_at: now,
      updated_at: now
    };

    const { data: created, error: insertError } = await supabase
      .from('users')
      .insert([insertPayload])
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return created;
  }

  const updates = {};
  const desiredName = getDisplayName(authUser);

  if (desiredName && existing.name !== desiredName) {
    updates.name = desiredName;
  }

  if (!!authUser.email_confirmed_at && !existing.email_confirmed) {
    updates.email_confirmed = true;
  }

  if (Object.keys(updates).length === 0) {
    return existing;
  }

  updates.updated_at = now;

  const { data: updated, error: updateError } = await supabase
    .from('users')
    .update(updates)
    .eq('id', existing.id)
    .select()
    .single();

  if (updateError) {
    throw updateError;
  }

  return updated;
};

const authenticateRequest = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization || '';

    if (!authorization.startsWith('Bearer ')) {
  return res.status(401).json({ success: false, error: 'Access token required' });
    }

    const token = authorization.slice('Bearer '.length).trim();

    if (!token) {
  return res.status(401).json({ success: false, error: 'Access token required' });
    }

  const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
  return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    const userRecord = await ensureUserRecord(data.user);

    req.currentUser = {
      token,
      auth: data.user,
      profile: userRecord
    };

    next();
  } catch (error) {
  console.error('Authentication error:', error);
  res.status(401).json({ success: false, error: 'Authentication failed' });
  }
};

const sendProfileResponse = (res, profile) => {
  res.json({
    success: true,
    data: mapUserProfile(profile)
  });
};

const updateSupabaseMetadataName = async (authUser, nextName) => {
  if (!nextName) {
    return;
  }

  const metadata = authUser.user_metadata || {};
  if (metadata.full_name === nextName) {
    return;
  }

  try {
    await supabase.auth.admin.updateUserById(authUser.id, {
      user_metadata: {
        ...metadata,
        full_name: nextName
      }
    });
  } catch (error) {
  console.warn('Supabase metadata update failed:', error.message);
  }
};

app.get('/api/users/profile', authenticateRequest, (req, res) => {
  sendProfileResponse(res, req.currentUser.profile);
});

app.get('/api/auth/profile', authenticateRequest, (req, res) => {
  sendProfileResponse(res, req.currentUser.profile);
});

app.post('/api/users/sync', authenticateRequest, (req, res) => {
  sendProfileResponse(res, req.currentUser.profile);
});

app.patch('/api/users/profile', authenticateRequest, async (req, res) => {
  try {
    const allowedFields = [
  'name',
  'zerodha_connected',
  'zerodha_access_token',
  'zerodha_public_token',
  'zerodha_user_id'
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (field in req.body) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    updates.updated_at = new Date().toISOString();

    const { data: updatedProfile, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.currentUser.profile.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    req.currentUser.profile = updatedProfile;

    if (updates.name) {
      await updateSupabaseMetadataName(req.currentUser.auth, updates.name);
    }

    sendProfileResponse(res, updatedProfile);
  } catch (error) {
  console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
  error: error.message || 'Failed to update profile'
    });
  }
});

app.put('/api/auth/profile', authenticateRequest, async (req, res) => {
  try {
    const { name } = req.body || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    const updates = {
      name: name.trim(),
      updated_at: new Date().toISOString()
    };

    const { data: updatedProfile, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.currentUser.profile.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    req.currentUser.profile = updatedProfile;
    await updateSupabaseMetadataName(req.currentUser.auth, updates.name);

    sendProfileResponse(res, updatedProfile);
  } catch (error) {
  console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
  error: error.message || 'Failed to update profile'
    });
  }
});

app.get('/api/zerodha/auth-url', authenticateRequest, (req, res) => {
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
        state
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

app.get('/api/zerodha/callback', async (req, res) => {
  try {
    const { request_token, action, status, state, error } = req.query;

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

app.post('/api/zerodha/access-token', authenticateRequest, async (req, res) => {
  try {
    const { request_token } = req.body;

    if (!request_token) {
      return res.status(400).json({
        success: false,
  error: 'Request token is required'
      });
    }

    const checksum = crypto
      .createHash('sha256')
      .update(KITE_API_KEY + request_token + KITE_API_SECRET)
      .digest('hex');

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

    if (!response.ok) {
  throw new Error(result.message || 'Failed to get access token');
    }

    const updates = {
      zerodha_access_token: result.data.access_token,
      zerodha_public_token: result.data.public_token,
      zerodha_user_id: result.data.user_id,
      zerodha_connected: true,
      updated_at: new Date().toISOString()
    };

    const { data: updatedProfile, error: updateError } = await supabase
      .from('users')
      .update(updates)
  .eq('id', req.currentUser.profile.id)
      .select()
      .single();

    if (updateError) {
  throw new Error('Failed to save Zerodha credentials');
    }

    req.currentUser.profile = updatedProfile;

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

app.get('/api/zerodha/instruments', authenticateRequest, async (req, res) => {
  try {
    const { symbol } = req.query;
    const userProfile = req.currentUser.profile;
    const csvData = await kiteApiCall(userProfile, 'https://api.kite.trade/instruments', { method: 'GET', isCSV: true });
  const lines = csvData.split('\n');
  const headers = lines[0].split(',');

    const instruments = [];

    for (let i = 1; i < lines.length && i < 1000; i++) {
      const row = lines[i].split('','');
      if (row.length >= headers.length) {
        const instrument = {};
        headers.forEach((header, index) => {
          instrument[header.trim()] = row[index]?.trim();
        });

        if (instrument.segment === 'NFO-OPT' || instrument.segment === 'BFO-OPT') {
          if (!symbol || instrument.name?.includes(symbol.toUpperCase())) {
            instruments.push(instrument);
          }
        }
      }
    }

    res.json({
      success: true,
      data: instruments.slice(0, 100)
    });
  } catch (error) {
    console.error('Instruments fetch error:', error);
    const code = error.statusCode || 500;
    res.status(code).json({
      success: false,
      error: error.message || 'Failed to fetch instruments'
    });
  }
});

app.post('/api/zerodha/option-chain', authenticateRequest, async (req, res) => {
  try {
    const { symbol, expiry } = req.body;
    const userProfile = req.currentUser.profile;

    if (!symbol || !expiry) {
      return res.status(400).json({
        success: false,
        error: 'Symbol and expiry are required'
      });
    }

    const csvData = await kiteApiCall(userProfile, 'https://api.kite.trade/instruments/NFO', { method: 'GET', isCSV: true });
  const lines = csvData.split('\n');
  const headers = lines[0].split(',');

    const optionInstruments = [];
  const targetDate = new Date(expiry).toISOString().split('T')[0];

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split('','');
      if (row.length >= headers.length) {
        const instrument = {};
        headers.forEach((header, index) => {
          instrument[header.trim()] = row[index]?.trim();
        });

        if (
          instrument.name === symbol.toUpperCase() &&
          instrument.instrument_type === 'PE' &&
          instrument.expiry === targetDate
        ) {
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

    const limitedInstruments = optionInstruments.slice(0, 50);
    const instrumentTokens = limitedInstruments.map((inst) => inst.instrument_token);

    const ltpData = await kiteApiCall(
      userProfile,
      'https://api.kite.trade/quote/ltp',
      { method: 'POST', body: { i: instrumentTokens } }
    );

    const optionChain = limitedInstruments.map((inst) => ({
      ...inst,
      ltp: ltpData.data[inst.instrument_token]?.last_price || 0
    }));

    res.json({
      success: true,
      data: optionChain
    });
  } catch (error) {
    console.error('Option chain error:', error);
    const code = error.statusCode || 500;
    res.status(code).json({
      success: false,
      error: error.message || 'Failed to fetch option chain'
    });
  }
});

app.patch('/api/users/zerodha/disconnect', authenticateRequest, async (req, res) => {
  try {
    const updates = {
      zerodha_connected: false,
      zerodha_access_token: null,
      zerodha_public_token: null,
      zerodha_user_id: null,
      updated_at: new Date().toISOString()
    };

    const { data: updatedProfile, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.currentUser.profile.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    req.currentUser.profile = updatedProfile;

    res.json({
      success: true,
      data: mapUserProfile(updatedProfile)
    });
  } catch (error) {
    console.error('Zerodha disconnection failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to disconnect from Zerodha'
    });
  }
});

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

app.get(['/api/health', '/healthz'], (req, res) => {
  res.json({
    success: true,
    message: 'Options Dekho API is running',
    timestamp: new Date().toISOString()
  });
});

// Only serve SPA for non-API GETs; for unknown API routes, always return JSON 404
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, error: 'API endpoint not found' });
});

app.get('*', (req, res) => {
  res.sendFile(__dirname + '/public/app.html');
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`Options Dekho server running on port ${PORT}`);
  console.log(`Frontend: http://localhost:${PORT}`);
  console.log(`API Base: http://localhost:${PORT}/api`);
  console.log(`Supabase URL configured: ${!!process.env.SUPABASE_URL}`);
  console.log(`Service role key configured: ${!!process.env.SUPABASE_SERVICE_ROLE_KEY}`);
});
