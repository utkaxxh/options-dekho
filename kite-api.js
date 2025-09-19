// Kite API Integration for Options Premium Calculator

class KiteAPIIntegration {
    constructor() {
        this.isLoggedIn = false;
        this.accessToken = null;
        this.requestToken = null;
        this.apiKey = 'kitemcp'; // Your Kite API key
        this.baseURL = 'https://api.kite.trade';
    }

    // Check if user is logged in to Kite
    async checkLoginStatus() {
        try {
            // This would call the MCP Kite login status check
            const response = await this.makeKiteAPICall('get_profile');
            this.isLoggedIn = true;
            return response;
        } catch (error) {
            this.isLoggedIn = false;
            throw new Error('Please log in to Kite first');
        }
    }

    // Generic method to make Kite API calls through MCP
    async makeKiteAPICall(endpoint, params = {}) {
        // This is a wrapper around the MCP Kite tools
        // In a real implementation, you would use the actual MCP function calls
        switch (endpoint) {
            case 'get_profile':
                return await this.getProfile();
            case 'search_instruments':
                return await this.searchInstruments(params.query);
            case 'get_quotes':
                return await this.getQuotes(params.instruments);
            case 'get_ltp':
                return await this.getLTP(params.instruments);
            default:
                throw new Error(`Unknown endpoint: ${endpoint}`);
        }
    }

    // Get user profile
    async getProfile() {
        // This would use the mcp_kite_get_profile function
        try {
            // Simulated response - replace with actual MCP call
            return {
                user_id: "XX1234",
                user_name: "User Name",
                email: "user@example.com",
                products: ["CNC", "NRML", "MIS"],
                order_types: ["MARKET", "LIMIT", "SL", "SL-M"],
                exchanges: ["NSE", "BSE", "NFO", "BFO"]
            };
        } catch (error) {
            throw new Error('Failed to get profile: ' + error.message);
        }
    }

    // Search for instruments
    async searchInstruments(query) {
        try {
            // This would use the mcp_kite_search_instruments function
            // Simulated response - replace with actual MCP call
            return [
                {
                    instrument_token: 258561,
                    exchange_token: 1010,
                    tradingsymbol: query.toUpperCase(),
                    name: `${query.toUpperCase()} LTD`,
                    last_price: 2500.0,
                    expiry: "",
                    strike: 0.0,
                    tick_size: 0.05,
                    lot_size: 1,
                    instrument_type: "EQ",
                    segment: "NSE",
                    exchange: "NSE"
                }
            ];
        } catch (error) {
            throw new Error('Failed to search instruments: ' + error.message);
        }
    }

    // Get quotes for instruments
    async getQuotes(instruments) {
        try {
            // This would use the mcp_kite_get_quotes function
            const quotes = {};
            instruments.forEach(instrument => {
                quotes[instrument] = {
                    instrument_token: 258561,
                    timestamp: new Date().toISOString(),
                    last_price: 2500.0 + (Math.random() - 0.5) * 100,
                    last_quantity: 1,
                    last_trade_time: new Date().toISOString(),
                    average_price: 2485.75,
                    volume: 1000000,
                    buy_quantity: 500,
                    sell_quantity: 750,
                    ohlc: {
                        open: 2480.0,
                        high: 2520.0,
                        low: 2470.0,
                        close: 2500.0
                    },
                    net_change: 20.0,
                    oi: 0,
                    oi_day_high: 0,
                    oi_day_low: 0,
                    depth: {
                        buy: [
                            { price: 2499.0, quantity: 100, orders: 5 },
                            { price: 2498.0, quantity: 200, orders: 8 }
                        ],
                        sell: [
                            { price: 2501.0, quantity: 150, orders: 6 },
                            { price: 2502.0, quantity: 180, orders: 7 }
                        ]
                    }
                };
            });
            return quotes;
        } catch (error) {
            throw new Error('Failed to get quotes: ' + error.message);
        }
    }

    // Get Last Traded Price
    async getLTP(instruments) {
        try {
            // This would use the mcp_kite_get_ltp function
            const ltpData = {};
            instruments.forEach(instrument => {
                ltpData[instrument] = {
                    instrument_token: 258561,
                    last_price: 2500.0 + (Math.random() - 0.5) * 50
                };
            });
            return ltpData;
        } catch (error) {
            throw new Error('Failed to get LTP: ' + error.message);
        }
    }

    // Get options chain for a symbol
    async getOptionsChain(symbol, expiry = null) {
        try {
            // First, search for the underlying instrument
            const instruments = await this.searchInstruments(symbol);
            if (instruments.length === 0) {
                throw new Error(`No instrument found for symbol: ${symbol}`);
            }

            const underlying = instruments[0];
            const currentPrice = underlying.last_price;

            // Generate options chain around current price
            const optionsChain = this.generateOptionsChain(symbol, currentPrice, expiry);
            
            return {
                symbol: symbol,
                underlying_price: currentPrice,
                expiry: expiry || this.getNextExpiry(),
                options: optionsChain
            };
        } catch (error) {
            throw new Error('Failed to get options chain: ' + error.message);
        }
    }

    // Generate mock options chain (replace with real API data)
    generateOptionsChain(symbol, currentPrice, expiry) {
        const options = [];
        const strikes = this.generateStrikes(currentPrice);
        
        strikes.forEach(strike => {
            // Generate call and put data for each strike
            const timeToExpiry = this.calculateTimeToExpiry(expiry || this.getNextExpiry());
            const volatility = 0.25; // Assumed 25% volatility
            const riskFreeRate = 0.06; // 6% risk-free rate
            
            // Calculate theoretical prices using Black-Scholes
            const callPrice = this.calculateCallPrice(currentPrice, strike, timeToExpiry, riskFreeRate, volatility);
            const putPrice = this.calculatePutPrice(currentPrice, strike, timeToExpiry, riskFreeRate, volatility);
            
            options.push({
                strike: strike,
                call: {
                    last_price: callPrice + (Math.random() - 0.5) * 10,
                    bid: callPrice - 2,
                    ask: callPrice + 2,
                    volume: Math.floor(Math.random() * 10000),
                    oi: Math.floor(Math.random() * 50000),
                    change: (Math.random() - 0.5) * 20
                },
                put: {
                    last_price: putPrice + (Math.random() - 0.5) * 10,
                    bid: putPrice - 2,
                    ask: putPrice + 2,
                    volume: Math.floor(Math.random() * 10000),
                    oi: Math.floor(Math.random() * 50000),
                    change: (Math.random() - 0.5) * 20
                }
            });
        });
        
        return options;
    }

    // Generate strike prices around current price
    generateStrikes(currentPrice) {
        const strikes = [];
        const baseStrike = Math.round(currentPrice / 50) * 50; // Round to nearest 50
        
        for (let i = -10; i <= 10; i++) {
            strikes.push(baseStrike + (i * 50));
        }
        
        return strikes.filter(strike => strike > 0);
    }

    // Get next Thursday expiry
    getNextExpiry() {
        const today = new Date();
        const nextThursday = new Date(today);
        const daysUntilThursday = (4 - today.getDay() + 7) % 7;
        nextThursday.setDate(today.getDate() + (daysUntilThursday || 7));
        return nextThursday.toISOString().split('T')[0];
    }

    // Calculate time to expiry in years
    calculateTimeToExpiry(expiryDate) {
        const today = new Date();
        const expiry = new Date(expiryDate);
        const timeDiff = expiry.getTime() - today.getTime();
        return timeDiff / (1000 * 60 * 60 * 24 * 365);
    }

    // Black-Scholes call option pricing
    calculateCallPrice(S, K, T, r, sigma) {
        if (T <= 0) return Math.max(0, S - K);
        
        const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
        const d2 = d1 - sigma * Math.sqrt(T);
        
        return S * this.normalCDF(d1) - K * Math.exp(-r * T) * this.normalCDF(d2);
    }

    // Black-Scholes put option pricing
    calculatePutPrice(S, K, T, r, sigma) {
        if (T <= 0) return Math.max(0, K - S);
        
        const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
        const d2 = d1 - sigma * Math.sqrt(T);
        
        return K * Math.exp(-r * T) * this.normalCDF(-d2) - S * this.normalCDF(-d1);
    }

    // Standard normal cumulative distribution function
    normalCDF(x) {
        return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
    }

    // Error function approximation
    erf(x) {
        const a1 =  0.254829592;
        const a2 = -0.284496736;
        const a3 =  1.421413741;
        const a4 = -1.453152027;
        const a5 =  1.061405429;
        const p  =  0.3275911;
        
        const sign = x >= 0 ? 1 : -1;
        x = Math.abs(x);
        
        const t = 1.0 / (1.0 + p * x);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
        
        return sign * y;
    }

    // Format instrument name for API calls
    formatInstrumentName(exchange, symbol) {
        return `${exchange}:${symbol}`;
    }

    // Get lot size for a symbol
    async getLotSize(symbol) {
        try {
            const instruments = await this.searchInstruments(symbol);
            if (instruments.length > 0) {
                return instruments[0].lot_size || 1;
            }
            return 1;
        } catch (error) {
            console.error('Error getting lot size:', error);
            return 1;
        }
    }

    // Calculate margin required for selling puts
    async calculateMarginRequired(symbol, strikePrice, quantity, premium) {
        try {
            // Simplified margin calculation
            // In reality, you would call the Kite margins API
            const spanMargin = strikePrice * quantity * 0.15; // 15% of strike value
            const exposureMargin = strikePrice * quantity * 0.05; // 5% exposure
            const premiumReceived = premium * quantity;
            
            return Math.max(0, spanMargin + exposureMargin - premiumReceived);
        } catch (error) {
            console.error('Error calculating margin:', error);
            return 0;
        }
    }
}

// Export for use in main application
window.KiteAPIIntegration = KiteAPIIntegration;