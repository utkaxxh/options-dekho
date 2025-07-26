// Configuration for Kite Connect API
export const KITE_CONFIG = {
  // API Key from Zerodha Kite Connect app
  API_KEY: process.env.KITE_API_KEY || '',
  
  // API Secret from Zerodha Kite Connect app
  API_SECRET: process.env.KITE_API_SECRET || '',
  
  // Redirect URL for authentication (set in your Kite app settings)
  REDIRECT_URL: process.env.KITE_REDIRECT_URL || 'http://localhost:3000/auth/callback',
  
  // Base URLs
  BASE_URL: 'https://api.kite.trade',
  LOGIN_URL: 'https://kite.zerodha.com/connect/login',
  
  // Instrument segments
  SEGMENTS: {
    NSE: 'NSE',
    BSE: 'BSE',
    NFO: 'NFO', // NSE F&O
    BFO: 'BFO', // BSE F&O
    CDS: 'CDS', // Currency Derivatives
    MCX: 'MCX'  // Commodity
  },
  
  // Option types
  OPTION_TYPES: {
    CE: 'CE', // Call European
    PE: 'PE'  // Put European
  }
};

// Environment check
export const isDevelopment = process.env.NODE_ENV !== 'production';
export const isProduction = process.env.NODE_ENV === 'production';

// Validate required environment variables
export function validateKiteConfig(): { isValid: boolean; missing: string[] } {
  const required = ['KITE_API_KEY', 'KITE_API_SECRET'];
  const missing: string[] = [];
  
  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }
  
  return {
    isValid: missing.length === 0,
    missing
  };
}

// Default stock symbols for Indian market
export const DEFAULT_STOCKS = [
  'RELIANCE',
  'TCS',
  'HDFCBANK',
  'INFY',
  'ICICIBANK'
];

export default KITE_CONFIG;
