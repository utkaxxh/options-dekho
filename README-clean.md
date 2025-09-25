# Put LTP Finder

A simple web application to get real-time Last Traded Price (LTP) for PUT options using the Zerodha Kite API.

## Features

- **Real-time Data**: Get live PUT option prices from Zerodha Kite API
- **Simple Interface**: Enter symbol, strike price, and expiry to get instant results
- **Lot Size Calculation**: Automatically calculates total premium for 1 lot
- **No Authentication Required**: Direct API access using environment tokens

## What it does

This app allows you to:
1. Enter any stock symbol (e.g., NIFTY, BANKNIFTY, RELIANCE)
2. Specify a strike price and expiry date
3. Get the real-time PUT option LTP and lot size
4. Calculate the total premium required for 1 lot

## Setup

1. **Environment Configuration**
   ```bash
   # Add to .env file
   KITE_API_KEY=your_kite_api_key
   KITE_ACCESS_TOKEN=your_daily_access_token
   PORT=5000
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start Server**
   ```bash
   npm start
   ```

4. **Open Browser**
   Navigate to `http://localhost:5000`

## API Endpoints

- `POST /api/put-ltp` - Get PUT option LTP
  ```json
  {
    "symbol": "NIFTY",
    "strike": 24000,
    "expiry": "2025-09-26"
  }
  ```

- `GET /api/health` - Health check

## Requirements

- Node.js 16+ 
- Valid Zerodha Kite API credentials
- Daily access token refresh (manual)

## Note

This is a read-only application that only fetches market data. No trading functionality is included.