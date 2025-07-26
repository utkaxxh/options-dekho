# Indian Options Premium Tracker 📊

A real-time web application for tracking options premium data for top Indian stocks. Built with React, TypeScript, and Node.js with WebSocket support for live data updates.

![Options Premium Tracker](https://img.shields.io/badge/Status-Live-brightgreen)
![React](https://img.shields.io/badge/React-19.1.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue)
![Node.js](https://img.shields.io/badge/Node.js-20.10.0-green)

## 🚀 Features

- **Real-time Data**: Live options premium updates every 2 seconds
- **Top Indian Stocks**: Track RELIANCE, TCS, HDFCBANK, INFY, ICICIBANK
- **Put Options Focus**: Specialized for put option premium tracking
- **Greeks Calculation**: Delta, Gamma, Theta, Vega for each option
- **Interactive UI**: Sortable tables, filters, and responsive design
- **WebSocket Connection**: Real-time data streaming
- **Modern Design**: Glassmorphism UI with beautiful gradients

## 🛠️ Tech Stack

### Frontend
- **React 19** with TypeScript
- **Vite** for fast development
- **Lucide React** for icons
- **Custom CSS** with modern design patterns

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **WebSocket** for real-time communication
- **Mock Data Generation** with Black-Scholes inspired calculations

## 📦 Installation & Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start development servers**
   ```bash
   # Start both frontend and backend (local development)
   npm run start:all
   
   # Or start individually
   npm run server:dev  # Backend on port 3001
   npm run dev         # Frontend on port 5173
   ```

3. **Build for production**
   ```bash
   npm run build
   ```

## 🚀 Deployment

### Deploy to Vercel (Recommended)

This app is optimized for Vercel deployment with serverless functions.

**Quick Deploy:**
1. Push your code to GitHub
2. Connect your repository to [Vercel](https://vercel.com)
3. Deploy automatically

**Detailed Instructions:** See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment guide.

**Live Demo:** [Deploy to see live version](https://options-dekho.vercel.app) *(Deployment in progress)*

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
