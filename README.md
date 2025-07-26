# Options Dekho - Real-Time Indian Options Premium Tracker 📊

A modern web application for tracking real-time premium data for Indian stock options, with a focus on put options pricing across different strike prices. Features stock search, live data updates, and Zerodha Kite API integration.

![Options Premium Tracker](https://img.shields.io/badge/Status-Live-brightgreen)
![React](https://img.shields.io/badge/React-19.1.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue)
![Node.js](https://img.shields.io/badge/Node.js-20.10.0-green)
![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)

## 🚀 Features

- **Real-time Stock Data**: Live prices for 15+ popular Indian stocks
- **Stock Search**: Search and filter stocks (RELIANCE, TCS, HDFC, INFY, etc.)
- **Options Premium Tracking**: View put options data with strike prices
- **Live Updates**: Real-time data updates every 5-10 seconds
- **Zerodha Kite API**: Built-in support for real market data
- **Greeks Calculation**: Delta, Gamma, Theta, Vega for each option
- **Modern UI**: Glassmorphism design with responsive layout
- **Vercel Deployment**: Production-ready serverless architecture

## 🛠️ Tech Stack

### Frontend
- **React 19** with TypeScript
- **Vite** for fast development
- **Lucide React** for icons
- **Custom CSS** with glassmorphism design

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **Vercel Serverless Functions** for production
- **Zerodha Kite Connect SDK** for real market data
- **Mock Data Generation** with Black-Scholes calculations

## 🌐 Live Demo

**Production**: [https://options-dekho.vercel.app](https://options-dekho.vercel.app)
**Repository**: [https://github.com/utkaxxh/options-dekho](https://github.com/utkaxxh/options-dekho)

## 📦 Installation & Development

### Prerequisites
- Node.js v20.10.0 or higher
- npm or yarn
- Git

### Local Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/utkaxxh/options-dekho.git
   cd options-dekho
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup (Optional - for real Kite API data)**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Zerodha Kite Connect credentials:
   ```env
   KITE_API_KEY=your_api_key_here
   KITE_API_SECRET=your_api_secret_here
   KITE_REDIRECT_URL=http://localhost:3000/auth/callback
   ```

4. **Start development server**
   ```bash
   npm run dev         # Frontend on port 5173
   ```
   
   For local backend development:
   ```bash
   npm run server:dev  # Backend on port 3001
   npm run start:all   # Both frontend and backend
   ```

   ```

5. **Open in browser**
   - Frontend: http://localhost:5173
   - The app will use mock data by default

## 🔑 Zerodha Kite API Setup (Optional)

To use real market data instead of mock data:

1. **Create a Kite Connect App**
   - Visit [Kite Connect Developer Console](https://developers.kite.trade/)
   - Create a new app and get your API Key and Secret
   - Set redirect URL to `http://localhost:3000/auth/callback` for development

2. **Configure Environment Variables**
   - Copy `.env.example` to `.env`
   - Add your Kite API credentials

3. **Authentication Flow**
   - The app includes authentication routes at `/api/auth`
   - Visit `/api/auth?action=login` to get the Kite login URL
   - Complete authentication on Zerodha's website
   - The callback will handle the session setup

## 🏗️ Project Structure

```
options-realtime/
├── src/                    # React frontend source
│   ├── components/         # React components
│   ├── types.ts           # TypeScript type definitions
│   ├── App.tsx            # Main app component
│   └── App.css            # Styling
├── api/                   # Vercel serverless functions
│   ├── stocks.ts          # Stock data API
│   ├── options.ts         # Options data API
│   └── auth.ts            # Kite authentication
├── server/                # Server utilities and services
│   ├── kiteService.ts     # Kite Connect integration
│   ├── config.ts          # Configuration management
│   └── mockData.ts        # Mock data generation
├── public/                # Static assets
└── dist/                  # Build output
```

## 🚀 Deployment

### Deploy to Vercel (Recommended)

This app is optimized for Vercel deployment with serverless functions.

**Quick Deploy:**
1. Fork/Clone the repository
2. Connect your repository to [Vercel](https://vercel.com)
3. Add environment variables (if using Kite API):
   - `KITE_API_KEY`
   - `KITE_API_SECRET`
   - `KITE_REDIRECT_URL`
4. Deploy automatically

**Live Demo:** [https://options-dekho.vercel.app](https://options-dekho.vercel.app)

## 📱 Usage

### Stock Search & Selection
1. **Browse Stocks**: View top 5 Indian stocks by default
2. **Search Functionality**: Use the search bar to find specific stocks
   - Search by symbol (e.g., "RELIANCE", "TCS")
   - Search by company name (e.g., "Tata Consultancy", "HDFC Bank")
   - Real-time filtering as you type
3. **Stock Selection**: Click on any stock card to view its options data

### Options Analysis
1. **Live Data**: Stock prices update every 10 seconds
2. **Options Display**: View put options for selected stock
3. **Strike Price Analysis**: Compare premiums across different strikes
4. **Sorting & Filtering**: Sort by strike price, premium, volume, etc.
5. **Greeks Information**: View Delta, Gamma, Theta, Vega for each option

### Data Sources
- **Default Mode**: Uses mock data with realistic price fluctuations
- **Kite API Mode**: Real market data from Zerodha (requires authentication)

## 🔧 Configuration

### Customizing Stock List
Edit `INDIAN_STOCKS` array in `api/stocks.ts`:
```typescript
const INDIAN_STOCKS: IndianStock[] = [
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', currentPrice: 2450.75 },
  { symbol: 'TCS', name: 'Tata Consultancy Services', currentPrice: 3890.50 },
  // Add more stocks...
];
```

### Update Intervals
Modify polling intervals in `src/App.tsx`:
```typescript
const interval = setInterval(fetchOptionsData, 5000); // 5 seconds
```

### Key Features for Production:
- ✅ Serverless API functions
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Real-time updates via polling
- ✅ Mobile responsive design

## 🎯 Usage

1. **View Stock Overview**: See the top 5 Indian stocks with real-time price updates
2. **Select a Stock**: Click on any stock card to view its options data
3. **Explore Options**: Browse put options with strike prices, premiums, and Greeks
4. **Filter by Expiry**: Use the dropdown to filter options by expiration date
5. **Sort Data**: Click column headers to sort by different metrics

## 📊 Data Structure

### Stock Information
- Symbol (RELIANCE, TCS, etc.)
- Company name
- Current stock price
- Real-time price changes

### Options Data
- **Strike Price**: Exercise price of the option
- **Premium**: Current option premium in ₹
- **Volume**: Trading volume
- **Open Interest**: Total open contracts
- **Implied Volatility**: Market's view of future volatility
- **Greeks**: Delta, Gamma, Theta, Vega
- **Time to Expiry**: Days until option expiration

## 🔧 API Endpoints

### Serverless Functions (Vercel)
- `GET /api/stocks` - Fetch all tracked stocks with live prices
- `GET /api/options?symbol=RELIANCE` - Get options data for a specific stock

### Local Development
- `GET http://localhost:3001/api/stocks` - REST API
- `ws://localhost:3001` - WebSocket for real-time updates

**Note:** Production deployment uses HTTP polling instead of WebSockets for Vercel compatibility.

## ⚠️ Disclaimer

This application uses simulated data for demonstration purposes. It is not intended for actual trading decisions. Always consult with financial professionals and use real market data for investment decisions.

---

Built with ❤️ for the Indian options trading community

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
