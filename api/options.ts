import { VercelRequest, VercelResponse } from '@vercel/node';

// Copy the types and mock data generation logic
interface IndianStock {
  symbol: string;
  name: string;
  currentPrice: number;
}

interface OptionContract {
  strike: number;
  premium: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  timeToExpiry: number;
}

interface OptionsData {
  symbol: string;
  currentPrice: number;
  puts: OptionContract[];
  lastUpdated: string;
}

// Simplified Black-Scholes calculation for serverless
function calculatePutPremium(
  stockPrice: number, 
  strike: number, 
  timeToExpiry: number, 
  riskFreeRate: number = 0.06,
  volatility: number = 0.25
): OptionContract {
  const t = timeToExpiry / 365;
  const d1 = (Math.log(stockPrice / strike) + (riskFreeRate + 0.5 * volatility * volatility) * t) / (volatility * Math.sqrt(t));
  const d2 = d1 - volatility * Math.sqrt(t);
  
  const normalCDF = (x: number) => 0.5 * (1 + Math.sign(x) * Math.sqrt(1 - Math.exp(-2 * x * x / Math.PI)));
  
  const putValue = strike * Math.exp(-riskFreeRate * t) * normalCDF(-d2) - stockPrice * normalCDF(-d1);
  
  const delta = normalCDF(d1) - 1;
  const gamma = Math.exp(-d1 * d1 / 2) / (stockPrice * volatility * Math.sqrt(2 * Math.PI * t));
  const theta = -(stockPrice * Math.exp(-d1 * d1 / 2) * volatility) / (2 * Math.sqrt(2 * Math.PI * t)) - riskFreeRate * strike * Math.exp(-riskFreeRate * t) * normalCDF(-d2);
  const vega = stockPrice * Math.sqrt(t) * Math.exp(-d1 * d1 / 2) / Math.sqrt(2 * Math.PI);
  
  const randomFactor = 0.9 + Math.random() * 0.2;
  
  return {
    strike,
    premium: Math.max(putValue * randomFactor, 0.05),
    volume: Math.floor(Math.random() * 10000) + 100,
    openInterest: Math.floor(Math.random() * 50000) + 500,
    impliedVolatility: volatility + (Math.random() - 0.5) * 0.1,
    delta: Math.round(delta * 100) / 100,
    gamma: Math.round(gamma * 10000) / 10000,
    theta: Math.round(theta * 100) / 100,
    vega: Math.round(vega * 100) / 100,
    timeToExpiry
  };
}

function generateMockOptionsData(stock: IndianStock): OptionsData {
  const { symbol, currentPrice } = stock;
  const puts: OptionContract[] = [];
  
  const minStrike = Math.floor(currentPrice * 0.8);
  const maxStrike = Math.ceil(currentPrice * 1.2);
  const strikeInterval = Math.max(Math.round((maxStrike - minStrike) / 20), 5);
  
  const expiries = [7, 14, 30, 60, 90];
  
  for (let strike = minStrike; strike <= maxStrike; strike += strikeInterval) {
    const roundedStrike = Math.round(strike / 10) * 10;
    
    expiries.forEach(expiry => {
      const volatility = 0.15 + Math.random() * 0.3;
      const option = calculatePutPremium(currentPrice, roundedStrike, expiry, 0.06, volatility);
      puts.push(option);
    });
  }
  
  puts.sort((a, b) => a.strike - b.strike);
  
  return {
    symbol,
    currentPrice: Math.round(currentPrice * 100) / 100,
    puts,
    lastUpdated: new Date().toISOString()
  };
}

const TOP_STOCKS: IndianStock[] = [
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', currentPrice: 2450.75 },
  { symbol: 'TCS', name: 'Tata Consultancy Services', currentPrice: 3890.50 },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', currentPrice: 1680.25 },
  { symbol: 'INFY', name: 'Infosys Ltd', currentPrice: 1756.80 },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', currentPrice: 1245.60 }
];

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    const { symbol } = req.query;
    
    if (!symbol || typeof symbol !== 'string') {
      res.status(400).json({ error: 'Symbol parameter is required' });
      return;
    }

    const stock = TOP_STOCKS.find(s => s.symbol === symbol.toUpperCase());
    
    if (!stock) {
      res.status(404).json({ error: 'Stock not found' });
      return;
    }
    
    // Simulate small price change
    const priceChange = (Math.random() - 0.5) * 0.02;
    const updatedStock = {
      ...stock,
      currentPrice: Math.max(stock.currentPrice * (1 + priceChange), 1)
    };
    
    const optionsData = generateMockOptionsData(updatedStock);
    res.status(200).json(optionsData);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
