import { VercelRequest, VercelResponse } from '@vercel/node';
import { IndianStock } from '../src/types';

// Top 5 Indian stocks
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
    // Simulate small price changes for each request
    const updatedStocks = TOP_STOCKS.map(stock => {
      const priceChange = (Math.random() - 0.5) * 0.02; // ±1% change
      return {
        ...stock,
        currentPrice: Math.max(stock.currentPrice * (1 + priceChange), 1)
      };
    });

    res.status(200).json(updatedStocks);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
