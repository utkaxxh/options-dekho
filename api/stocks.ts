import { VercelRequest, VercelResponse } from '@vercel/node';
import { IndianStock } from '../src/types';

// Extended list of popular Indian stocks
const INDIAN_STOCKS: IndianStock[] = [
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', currentPrice: 2450.75 },
  { symbol: 'TCS', name: 'Tata Consultancy Services', currentPrice: 3890.50 },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', currentPrice: 1680.25 },
  { symbol: 'INFY', name: 'Infosys Ltd', currentPrice: 1756.80 },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', currentPrice: 1245.60 },
  { symbol: 'SBIN', name: 'State Bank of India', currentPrice: 750.25 },
  { symbol: 'AIRTEL', name: 'Bharti Airtel Ltd', currentPrice: 950.75 },
  { symbol: 'ITC', name: 'ITC Ltd', currentPrice: 425.30 },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', currentPrice: 1850.45 },
  { symbol: 'LT', name: 'Larsen & Toubro Ltd', currentPrice: 3525.80 },
  { symbol: 'WIPRO', name: 'Wipro Ltd', currentPrice: 445.60 },
  { symbol: 'MARUTI', name: 'Maruti Suzuki India Ltd', currentPrice: 10850.75 },
  { symbol: 'ASIANPAINT', name: 'Asian Paints Ltd', currentPrice: 2750.25 },
  { symbol: 'NTPC', name: 'NTPC Ltd', currentPrice: 285.40 },
  { symbol: 'ONGC', name: 'Oil & Natural Gas Corporation', currentPrice: 195.75 }
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
    const { search, limit } = req.query;

    try {
      let stocks = INDIAN_STOCKS;

      // Search functionality
      if (search && typeof search === 'string') {
        const searchTerm = search.toUpperCase();
        stocks = stocks.filter(stock => 
          stock.symbol.includes(searchTerm) || 
          stock.name.toUpperCase().includes(searchTerm)
        );
      }

      // Limit results (default to top 5 if no search)
      const defaultLimit = search ? 15 : 5;
      const limitNum = limit && typeof limit === 'string' ? parseInt(limit) : defaultLimit;
      
      if (!isNaN(limitNum)) {
        stocks = stocks.slice(0, limitNum);
      }

      // Simulate small price changes for each request
      const updatedStocks = stocks.map(stock => {
        const priceChange = (Math.random() - 0.5) * 0.02; // ±1% change
        return {
          ...stock,
          currentPrice: Math.max(stock.currentPrice * (1 + priceChange), 1)
        };
      });

      res.status(200).json({
        status: 'success',
        data: updatedStocks,
        total: updatedStocks.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error fetching stocks:', error);
      res.status(500).json({ 
        status: 'error',
        message: 'Failed to fetch stock data',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
