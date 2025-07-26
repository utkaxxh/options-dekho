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
