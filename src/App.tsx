import { useState, useEffect } from 'react';
import { RefreshCw, Clock, BarChart3, Search, X } from 'lucide-react';
import StockCard from './components/StockCard';
import OptionsTable from './components/OptionsTable';
import type { IndianStock, OptionsData } from './types';
import './App.css';

function App() {
  const [stocks, setStocks] = useState<IndianStock[]>([]);
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [optionsData, setOptionsData] = useState<Record<string, OptionsData>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);

  // API base URL - will use relative paths for Vercel deployment
  const API_BASE = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001';

  // Fetch stocks data with optional search
  const fetchStocks = async (search?: string) => {
    try {
      setIsSearching(!!search);
      const searchParam = search ? `?search=${encodeURIComponent(search)}` : '';
      const response = await fetch(`${API_BASE}/api/stocks${searchParam}`);
      const result = await response.json();
      
      // Handle both old format (array) and new format (object with data property)
      const stockData = Array.isArray(result) ? result : result.data || [];
      
      setStocks(stockData);
      if (stockData.length > 0 && !selectedStock) {
        setSelectedStock(stockData[0].symbol);
      }
      setIsConnected(true);
    } catch (err) {
      console.error('Failed to fetch stocks:', err);
      setIsConnected(false);
    } finally {
      setIsSearching(false);
    }
  };

  // Fetch initial stocks data
  useEffect(() => {
    fetchStocks();
  }, [API_BASE]);

  // Fetch options data for selected stock
  useEffect(() => {
    if (!selectedStock) return;

    const fetchOptionsData = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/options?symbol=${selectedStock}`);
        const data = await response.json();
        setOptionsData(prev => ({
          ...prev,
          [selectedStock]: data
        }));
        setLastUpdate(new Date().toLocaleTimeString());
        setIsConnected(true);
      } catch (err) {
        console.error('Failed to fetch options data:', err);
        setIsConnected(false);
      }
    };

    fetchOptionsData();
    
    // Poll for updates every 5 seconds (instead of WebSocket for Vercel compatibility)
    const interval = setInterval(fetchOptionsData, 5000);
    
    return () => clearInterval(interval);
  }, [selectedStock, API_BASE]);

  // Fetch updated stock prices periodically
  useEffect(() => {
    const fetchStockUpdates = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/stocks`);
        const result = await response.json();
        
        // Handle both old format (array) and new format (object with data property)
        const stockData = Array.isArray(result) ? result : result.data || [];
        
        setStocks(stockData);
        setIsConnected(true);
      } catch (err) {
        console.error('Failed to fetch stock updates:', err);
        setIsConnected(false);
      }
    };

    const interval = setInterval(fetchStockUpdates, 10000); // Update stock prices every 10 seconds
    
    return () => clearInterval(interval);
  }, [API_BASE]);

  const selectedStockData = selectedStock ? optionsData[selectedStock] : null;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="title-section">
            <BarChart3 className="app-icon" />
            <h1>Indian Options Premium Tracker</h1>
          </div>
          <div className="status-section">
            <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
              <div className="status-dot"></div>
              {isConnected ? 'Live Data' : 'Disconnected'}
            </div>
            {lastUpdate && (
              <div className="last-update">
                <Clock size={16} />
                {lastUpdate}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="app-main">
        <section className="stocks-section">
          <div className="section-header-with-search">
            <h2>{searchTerm ? `Search Results` : 'Top 5 Indian Stocks'}</h2>
            <div className="search-container">
              <div className="search-input-wrapper">
                <Search className="search-icon" size={20} />
                <input
                  type="text"
                  placeholder="Search stocks (e.g., RELIANCE, TCS, HDFC)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      fetchStocks(searchTerm);
                    }
                  }}
                  className="search-input"
                />
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      fetchStocks();
                    }}
                    className="clear-search"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <button
                onClick={() => fetchStocks(searchTerm)}
                disabled={isSearching}
                className="search-button"
              >
                {isSearching ? <RefreshCw className="spinning" size={16} /> : 'Search'}
              </button>
            </div>
          </div>
          <div className="stocks-grid">
            {stocks.map((stock) => (
              <StockCard
                key={stock.symbol}
                stock={stock}
                isSelected={selectedStock === stock.symbol}
                onClick={() => setSelectedStock(stock.symbol)}
                optionsCount={optionsData[stock.symbol]?.puts?.length || 0}
              />
            ))}
          </div>
        </section>

        {selectedStockData && (
          <section className="options-section">
            <div className="section-header">
              <h2>Put Options for {selectedStock}</h2>
              <div className="current-price">
                <span>Current Price: </span>
                <span className="price">₹{selectedStockData.currentPrice.toFixed(2)}</span>
              </div>
            </div>
            <OptionsTable optionsData={selectedStockData} />
          </section>
        )}

        {!selectedStockData && selectedStock && (
          <section className="loading-section">
            <RefreshCw className="spinning" size={32} />
            <p>Loading options data for {selectedStock}...</p>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
