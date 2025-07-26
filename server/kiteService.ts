const { KiteConnect } = require('kiteconnect');
import { KITE_CONFIG, validateKiteConfig } from './config';

export interface StockInstrument {
  instrument_token: number;
  exchange_token: number;
  tradingsymbol: string;
  name: string;
  last_price: number;
  expiry: string;
  strike: number;
  tick_size: number;
  lot_size: number;
  instrument_type: string;
  segment: string;
  exchange: string;
}

export interface OptionChainData {
  instrument_token: number;
  tradingsymbol: string;
  strike: number;
  expiry: string;
  last_price: number;
  volume: number;
  oi: number;
  bid: number;
  ask: number;
  change: number;
  option_type: 'CE' | 'PE';
}

export interface KiteMarketData {
  instrument_token: number;
  last_price: number;
  volume: number;
  buy_quantity: number;
  sell_quantity: number;
  ohlc: {
    open: number;
    high: number;
    low: number;
    close: number;
  };
  change: number;
  last_trade_time: string;
  oi?: number;
  oi_day_high?: number;
  oi_day_low?: number;
}

export class KiteService {
  private kite: any;
  private accessToken: string | null = null;
  private instruments: StockInstrument[] = [];

  constructor(apiKey?: string) {
    const config = validateKiteConfig();
    if (!config.isValid) {
      throw new Error(`Missing Kite API configuration: ${config.missing.join(', ')}`);
    }

    this.kite = new KiteConnect({
      api_key: apiKey || KITE_CONFIG.API_KEY,
      debug: false
    });
  }

  // Step 1: Get login URL for authentication
  getLoginURL(): string {
    return `${KITE_CONFIG.LOGIN_URL}?api_key=${KITE_CONFIG.API_KEY}&v=3`;
  }

  // Step 2: Generate session after user login
  async generateSession(requestToken: string, apiSecret?: string): Promise<any> {
    try {
      const secret = apiSecret || KITE_CONFIG.API_SECRET;
      const response = await this.kite.generateSession(requestToken, secret);
      this.accessToken = response.access_token;
      this.kite.setAccessToken(this.accessToken);
      return response;
    } catch (error) {
      console.error('Error generating session:', error);
      throw error;
    }
  }

  // Set access token if you already have one
  setAccessToken(token: string): void {
    this.accessToken = token;
    this.kite.setAccessToken(token);
  }

  // Get user profile
  async getProfile(): Promise<any> {
    try {
      return await this.kite.getProfile();
    } catch (error) {
      console.error('Error getting profile:', error);
      throw error;
    }
  }

  // Download and cache instruments
  async loadInstruments(): Promise<void> {
    try {
      const instruments = await this.kite.getInstruments(['NSE', 'NFO']);
      this.instruments = instruments;
      console.log(`Loaded ${instruments.length} instruments`);
    } catch (error) {
      console.error('Error loading instruments:', error);
      throw error;
    }
  }

  // Search for stocks by symbol or name
  searchStocks(query: string, limit: number = 10): StockInstrument[] {
    const searchTerm = query.toUpperCase();
    return this.instruments
      .filter(instrument => 
        instrument.segment === 'NSE' && 
        instrument.instrument_type === 'EQ' &&
        (instrument.tradingsymbol.includes(searchTerm) || 
         instrument.name.toUpperCase().includes(searchTerm))
      )
      .slice(0, limit);
  }

  // Get real-time quotes for multiple instruments
  async getQuotes(instruments: string[]): Promise<{ [key: string]: KiteMarketData }> {
    try {
      return await this.kite.getQuote(instruments);
    } catch (error) {
      console.error('Error getting quotes:', error);
      throw error;
    }
  }

  // Get LTP (Last Traded Price) for instruments
  async getLTP(instruments: string[]): Promise<{ [key: string]: { last_price: number } }> {
    try {
      return await this.kite.getLTP(instruments);
    } catch (error) {
      console.error('Error getting LTP:', error);
      throw error;
    }
  }

  // Get option chain for a stock
  async getOptionChain(symbol: string, expiry?: string): Promise<OptionChainData[]> {
    try {
      const stockInstrument = this.instruments.find(
        inst => inst.tradingsymbol === symbol && inst.segment === 'NSE' && inst.instrument_type === 'EQ'
      );

      if (!stockInstrument) {
        throw new Error(`Stock ${symbol} not found`);
      }

      // Get options instruments for this stock
      const optionsInstruments = this.instruments.filter(inst => 
        inst.name === stockInstrument.name && 
        inst.segment === 'NFO' && 
        (inst.instrument_type === 'PE' || inst.instrument_type === 'CE') &&
        (!expiry || inst.expiry === expiry)
      );

      // Get quotes for all options
      const instrumentTokens = optionsInstruments.map(inst => `NFO:${inst.tradingsymbol}`);
      
      if (instrumentTokens.length === 0) {
        return [];
      }

      const quotes = await this.getQuotes(instrumentTokens);

      // Combine instrument data with quotes
      const optionChain: OptionChainData[] = optionsInstruments.map(inst => {
        const quote = quotes[`NFO:${inst.tradingsymbol}`];
        return {
          instrument_token: inst.instrument_token,
          tradingsymbol: inst.tradingsymbol,
          strike: inst.strike,
          expiry: inst.expiry,
          last_price: quote?.last_price || 0,
          volume: quote?.volume || 0,
          oi: quote?.oi || 0,
          bid: quote?.ohlc?.low || 0,
          ask: quote?.ohlc?.high || 0,
          change: quote?.change || 0,
          option_type: inst.instrument_type as 'CE' | 'PE'
        };
      });

      return optionChain.filter(option => option.option_type === 'PE'); // Return only PUT options
    } catch (error) {
      console.error('Error getting option chain:', error);
      throw error;
    }
  }

  // Get historical data
  async getHistoricalData(
    instrumentToken: number,
    interval: string,
    fromDate: string,
    toDate: string
  ): Promise<any[]> {
    try {
      return await this.kite.getHistoricalData(instrumentToken, interval, fromDate, toDate);
    } catch (error) {
      console.error('Error getting historical data:', error);
      throw error;
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.accessToken !== null;
  }

  // Get popular Indian stocks
  getPopularStocks(): StockInstrument[] {
    const popularSymbols = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'SBIN', 'AIRTEL', 'ITC', 'KOTAKBANK', 'LT'];
    
    return popularSymbols
      .map(symbol => this.instruments.find(
        inst => inst.tradingsymbol === symbol && inst.segment === 'NSE' && inst.instrument_type === 'EQ'
      ))
      .filter(Boolean) as StockInstrument[];
  }
}

// Singleton instance
let kiteService: KiteService | null = null;

export function getKiteService(apiKey?: string): KiteService {
  if (!kiteService && apiKey) {
    kiteService = new KiteService(apiKey);
  }
  
  if (!kiteService) {
    throw new Error('Kite service not initialized. Please provide API key.');
  }
  
  return kiteService;
}
