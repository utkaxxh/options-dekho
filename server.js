const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const KITE_API_KEY = process.env.KITE_API_KEY;
const KITE_ACCESS_TOKEN = process.env.KITE_ACCESS_TOKEN;

async function kiteApiCall(endpoint, options = {}) {
  const { method = 'GET', body = null, isCSV = false } = options;
  
  if (!KITE_API_KEY || !KITE_ACCESS_TOKEN) {
    throw new Error('Kite API credentials not configured');
  }

  const headers = {
    Authorization: `token ${KITE_API_KEY}:${KITE_ACCESS_TOKEN}`,
    'X-Kite-Version': '3'
  };

  const fetchOpts = { method, headers };
  if (body && method !== 'GET') {
    if (!isCSV) {
      headers['Content-Type'] = 'application/json';
      fetchOpts.body = JSON.stringify(body);
    }
  }

  const resp = await fetch(endpoint, fetchOpts);
  const text = await resp.text();

  if (!isCSV) {
    try {
      const parsed = JSON.parse(text);
      if (!resp.ok) {
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

  if (!resp.ok) {
    throw new Error(`API error ${resp.status}`);
  }

  return text;
}

app.post('/api/put-ltp', async (req, res) => {
  try {
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

    const csv = await kiteApiCall('https://api.kite.trade/instruments/NFO', { 
      method: 'GET', 
      isCSV: true 
    });

    const lines = csv.split('\n');
    const headers = lines[0].split(',');
    
    const idxToken = headers.findIndex(h => h.trim() === 'instrument_token');
    const idxName = headers.findIndex(h => h.trim() === 'name');
    const idxExpiry = headers.findIndex(h => h.trim() === 'expiry');
    const idxType = headers.findIndex(h => h.trim() === 'instrument_type');
    const idxStrike = headers.findIndex(h => h.trim() === 'strike');
    const idxTradingSymbol = headers.findIndex(h => h.trim() === 'tradingsymbol');
    const idxLotSize = headers.findIndex(h => h.trim() === 'lot_size');

    const matchingOptions = [];
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',');
      if (row.length <= Math.max(idxToken, idxName, idxExpiry, idxType, idxStrike)) continue;
      
      const name = (row[idxName] || '').trim();
      const exp = (row[idxExpiry] || '').trim();
      const type = (row[idxType] || '').trim();
      const rowStrike = parseFloat(row[idxStrike]);
      
      if (name === symbolUpper && exp === expiryDate && type === 'PE') {
        matchingOptions.push({
          instrument_token: (row[idxToken] || '').trim(),
          tradingsymbol: (row[idxTradingSymbol] || '').trim(),
          strike: rowStrike,
          lot_size: parseInt((row[idxLotSize] || '0').trim(), 10) || 0
        });
      }
    }

    if (matchingOptions.length === 0) {
      return res.json({
        success: false,
        error: `No PUT options found for ${symbolUpper} expiring on ${expiryDate}`
      });
    }

    matchingOptions.sort((a, b) => Math.abs(a.strike - strikePrice) - Math.abs(b.strike - strikePrice));
    const bestMatch = matchingOptions[0];

    const ltpData = await kiteApiCall('https://api.kite.trade/quote/ltp', {
      method: 'POST',
      body: { i: [bestMatch.instrument_token] }
    });

    const ltp = ltpData?.data?.[bestMatch.instrument_token]?.last_price || 0;

    res.json({
      success: true,
      data: {
        symbol: symbolUpper,
        strike: bestMatch.strike,
        expiry: expiryDate,
        ltp: ltp,
        lot_size: bestMatch.lot_size,
        tradingsymbol: bestMatch.tradingsymbol,
        total_premium: ltp * bestMatch.lot_size
      }
    });

  } catch (error) {
    console.error('Put LTP error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch PUT LTP'
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Put LTP API is running',
    timestamp: new Date().toISOString()
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
  console.log(`Kite Access Token configured: ${!!KITE_ACCESS_TOKEN}`);
});