export interface IndianStock {
  symbol: string;
  name: string;
  currentPrice: number;
}

export interface OptionContract {
  strike: number;
  premium: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  timeToExpiry: number; // days
}

export interface OptionsData {
  symbol: string;
  currentPrice: number;
  puts: OptionContract[];
  lastUpdated: string;
}

// Black-Scholes inspired premium calculation for PUT options
function calculatePutPremium(
  stockPrice: number, 
  strike: number, 
  timeToExpiry: number, 
  riskFreeRate: number = 0.06,
  volatility: number = 0.25
): OptionContract {
  const t = timeToExpiry / 365; // Convert days to years
  const d1 = (Math.log(stockPrice / strike) + (riskFreeRate + 0.5 * volatility * volatility) * t) / (volatility * Math.sqrt(t));
  const d2 = d1 - volatility * Math.sqrt(t);
  
  // Simplified normal CDF approximation
  const normalCDF = (x: number) => 0.5 * (1 + Math.sign(x) * Math.sqrt(1 - Math.exp(-2 * x * x / Math.PI)));
  
  // Put option value using Black-Scholes
  const putValue = strike * Math.exp(-riskFreeRate * t) * normalCDF(-d2) - stockPrice * normalCDF(-d1);
  
  // Calculate Greeks (simplified)
  const delta = normalCDF(d1) - 1; // Put delta is negative
  const gamma = Math.exp(-d1 * d1 / 2) / (stockPrice * volatility * Math.sqrt(2 * Math.PI * t));
  const theta = -(stockPrice * Math.exp(-d1 * d1 / 2) * volatility) / (2 * Math.sqrt(2 * Math.PI * t)) - riskFreeRate * strike * Math.exp(-riskFreeRate * t) * normalCDF(-d2);
  const vega = stockPrice * Math.sqrt(t) * Math.exp(-d1 * d1 / 2) / Math.sqrt(2 * Math.PI);
  
  // Add some randomness for realistic simulation
  const randomFactor = 0.9 + Math.random() * 0.2; // ±10% variation
  
  return {
    strike,
    premium: Math.max(putValue * randomFactor, 0.05), // Minimum premium of 0.05
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

export function generateMockOptionsData(stock: IndianStock): OptionsData {
  const { symbol, currentPrice } = stock;
  const puts: OptionContract[] = [];
  
  // Generate strikes around current price (±20%)
  const minStrike = Math.floor(currentPrice * 0.8);
  const maxStrike = Math.ceil(currentPrice * 1.2);
  const strikeInterval = Math.max(Math.round((maxStrike - minStrike) / 20), 5);
  
  // Different expiry dates
  const expiries = [7, 14, 30, 60, 90]; // Days to expiry
  
  for (let strike = minStrike; strike <= maxStrike; strike += strikeInterval) {
    // Round strike to nearest 5 or 10
    const roundedStrike = Math.round(strike / 10) * 10;
    
    // For each strike, create options for different expiries
    expiries.forEach(expiry => {
      const volatility = 0.15 + Math.random() * 0.3; // 15% to 45% IV
      const option = calculatePutPremium(currentPrice, roundedStrike, expiry, 0.06, volatility);
      puts.push(option);
    });
  }
  
  // Sort by strike price
  puts.sort((a, b) => a.strike - b.strike);
  
  return {
    symbol,
    currentPrice: Math.round(currentPrice * 100) / 100,
    puts,
    lastUpdated: new Date().toISOString()
  };
}
