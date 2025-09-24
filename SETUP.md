# Options Premium Calculator with Zerodha API

A web application to calculate options premium for PUT options using real-time Zerodha/Kite API data.

## 🚀 Setup Instructions

### 1. Get Zerodha API Credentials

1. Go to [https://kite.trade](https://kite.trade)
2. Create a Kite Connect app
3. Note down your **API Key** and **API Secret**

### 2. Configure Environment Variables

1. Copy the `.env` file and add your credentials:
```bash
KITE_API_KEY=your_actual_api_key_here
KITE_API_SECRET=your_actual_api_secret_here
PORT=5000
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Application

```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

The application will be available at: **http://localhost:5000**

## 📱 How to Use

1. **Open the app** - It will show an authentication modal
2. **Click "Login with Zerodha"** - Opens Zerodha login page
3. **Login** with your Zerodha credentials
4. **Copy the request token** from the redirect URL
5. **Paste and complete authentication**
6. **Calculate premiums** with live data!

## 🔧 Architecture

### Backend (Node.js + Express)
- **Secure API credential handling**
- **Session management**
- **Proxy to Zerodha API**
- **CORS enabled for frontend**

### Frontend (Vanilla JS)
- **Clean, responsive UI**
- **Real-time premium calculations**
- **Fallback to demo mode**
- **Session persistence**

## 🛡️ Security Features

- ✅ **API secrets stored server-side only**
- ✅ **Session-based authentication**
- ✅ **No credentials in frontend code**
- ✅ **Environment variable configuration**
- ✅ **Secure token exchange flow**

## 📊 Features

- **Real-time stock prices** via Zerodha API
- **Black-Scholes option pricing** model
- **Simplified UI** (quantity-based, not lot-based)
- **Multiple fallback modes** (API → MCP → Simulation)
- **Responsive design** for all devices
- **Session persistence** across page refreshes

## 🔗 API Endpoints

- `GET /api/kite/login-url` - Get Zerodha login URL
- `POST /api/kite/access-token` - Exchange request token
- `GET /api/kite/profile` - Get user profile
- `POST /api/kite/ltp` - Get last traded prices
- `POST /api/kite/quotes` - Get market quotes
- `POST /api/kite/logout` - Logout user

## 🌍 Deployment

### Local Development
```bash
npm run dev
```

### Production (PM2)
```bash
npm install -g pm2
pm2 start server.js --name "options-calculator"
```

### Environment Variables for Production
```bash
export KITE_API_KEY="your_key"
export KITE_API_SECRET="your_secret"
export PORT=5000
```

## 🎯 Next Steps

1. **Enter your credentials** in the `.env` file
2. **Run the application** with `npm start`
3. **Authenticate** with Zerodha when first using
4. **Start calculating** real options premiums!

## 📞 Support

If you need help setting up:
1. Check that your `.env` file has the correct credentials
2. Ensure your Kite Connect app is active
3. Verify the redirect URL in your Kite app settings
4. Check browser console for any errors

---

**Note:** This application requires valid Zerodha API credentials to fetch live data. Demo mode is available for testing without credentials.