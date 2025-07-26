import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { generateMockOptionsData, IndianStock, OptionsData } from './mockData';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

// Store active connections
const activeConnections = new Set<any>();

// Top 5 Indian stocks
const TOP_STOCKS: IndianStock[] = [
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', currentPrice: 2450.75 },
  { symbol: 'TCS', name: 'Tata Consultancy Services', currentPrice: 3890.50 },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', currentPrice: 1680.25 },
  { symbol: 'INFY', name: 'Infosys Ltd', currentPrice: 1756.80 },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', currentPrice: 1245.60 }
];

// API Routes
app.get('/api/stocks', (req, res) => {
  res.json(TOP_STOCKS);
});

app.get('/api/options/:symbol', (req, res) => {
  const { symbol } = req.params;
  const stock = TOP_STOCKS.find(s => s.symbol === symbol);
  
  if (!stock) {
    return res.status(404).json({ error: 'Stock not found' });
  }
  
  const optionsData = generateMockOptionsData(stock);
  res.json(optionsData);
});

// WebSocket connection for real-time updates
wss.on('connection', (ws) => {
  console.log('Client connected');
  activeConnections.add(ws);
  
  // Send initial data
  const initialData = TOP_STOCKS.map(stock => ({
    symbol: stock.symbol,
    options: generateMockOptionsData(stock)
  }));
  
  ws.send(JSON.stringify({
    type: 'initial',
    data: initialData
  }));
  
  ws.on('close', () => {
    console.log('Client disconnected');
    activeConnections.delete(ws);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    activeConnections.delete(ws);
  });
});

// Broadcast real-time updates every 2 seconds
setInterval(() => {
  if (activeConnections.size > 0) {
    const updates = TOP_STOCKS.map(stock => {
      // Simulate price changes (-2% to +2%)
      const priceChange = (Math.random() - 0.5) * 0.04;
      stock.currentPrice = Math.max(stock.currentPrice * (1 + priceChange), 1);
      
      return {
        symbol: stock.symbol,
        currentPrice: stock.currentPrice,
        options: generateMockOptionsData(stock)
      };
    });
    
    const message = JSON.stringify({
      type: 'update',
      data: updates,
      timestamp: new Date().toISOString()
    });
    
    activeConnections.forEach(ws => {
      if (ws.readyState === 1) { // WebSocket.OPEN
        ws.send(message);
      }
    });
  }
}, 2000);

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Options Premium Server running on port ${PORT}`);
  console.log(`📊 Tracking ${TOP_STOCKS.length} Indian stocks`);
  console.log(`🔄 Real-time updates every 2 seconds`);
});
