import { TrendingUp, TrendingDown } from 'lucide-react';
import type { IndianStock } from '../types';

interface StockCardProps {
  stock: IndianStock;
  isSelected: boolean;
  onClick: () => void;
  optionsCount: number;
}

const StockCard = ({ stock, isSelected, onClick, optionsCount }: StockCardProps) => {
  const priceChange = (Math.random() - 0.5) * 2; // Mock price change for display
  const isPositive = priceChange >= 0;
  
  return (
    <div 
      className={`stock-card ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <div className="stock-header">
        <div className="stock-symbol">{stock.symbol}</div>
        <div className={`price-change ${isPositive ? 'positive' : 'negative'}`}>
          {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          {Math.abs(priceChange).toFixed(2)}%
        </div>
      </div>
      
      <div className="stock-name">{stock.name}</div>
      
      <div className="stock-price">
        <span className="currency">₹</span>
        <span className="amount">{stock.currentPrice.toFixed(2)}</span>
      </div>
      
      <div className="options-info">
        <span>{optionsCount} Put Options Available</span>
      </div>
    </div>
  );
};

export default StockCard;
