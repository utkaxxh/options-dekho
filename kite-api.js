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
            // Generate realistic stock prices based on symbol
            const stockPrice = this.getRealisticStockPrice(query.toUpperCase());
            
            return [
                {
                    instrument_token: 258561,
                    exchange_token: 1010,
                    tradingsymbol: query.toUpperCase(),
                    name: `${query.toUpperCase()} LTD`,
                    last_price: stockPrice,
                    expiry: "",
                    strike: 0.0,
                    tick_size: 0.05,
                    lot_size: this.getRealisticLotSize(query.toUpperCase()),
                    instrument_type: "EQ",
                    segment: "NSE",
                    exchange: "NSE"
                }
            ];
        } catch (error) {
            throw new Error('Failed to search instruments: ' + error.message);
        }
    }

    // Get realistic stock price based on symbol
    getRealisticStockPrice(symbol) {
        const stockPrices = {
            'RELIANCE': 2450 + (Math.random() - 0.5) * 100,
            'TCS': 3200 + (Math.random() - 0.5) * 200,
            'INFY': 1450 + (Math.random() - 0.5) * 100,
            'WIPRO': 420 + (Math.random() - 0.5) * 40,
            'HDFC': 1580 + (Math.random() - 0.5) * 80,
            'HDFCBANK': 1620 + (Math.random() - 0.5) * 100,
            'ICICIBANK': 950 + (Math.random() - 0.5) * 100,
            'SBIN': 580 + (Math.random() - 0.5) * 60,
            'ITC': 460 + (Math.random() - 0.5) * 40,
            'LT': 3200 + (Math.random() - 0.5) * 200,
            'HCLTECH': 1180 + (Math.random() - 0.5) * 80,
            'TATASTEEL': 140 + (Math.random() - 0.5) * 20,
            'BHARTIARTL': 920 + (Math.random() - 0.5) * 80,
            'MARUTI': 10500 + (Math.random() - 0.5) * 500,
            'ASIANPAINT': 3200 + (Math.random() - 0.5) * 200,
            'TITAN': 3100 + (Math.random() - 0.5) * 200,
            'ULTRACEMCO': 9800 + (Math.random() - 0.5) * 500,
            'NESTLEIND': 2400 + (Math.random() - 0.5) * 200,
            'KOTAKBANK': 1750 + (Math.random() - 0.5) * 100,
            'AXISBANK': 1080 + (Math.random() - 0.5) * 80
        };
        
        // Return known price or generate based on price range
        if (stockPrices[symbol]) {
            return Math.round(stockPrices[symbol] * 100) / 100;
        }
        
        // For unknown symbols, generate based on first letter for consistency
        const firstChar = symbol.charAt(0);
        const basePrice = (firstChar.charCodeAt(0) - 65) * 200 + 300; // 300-5500 range
        return Math.round((basePrice + (Math.random() - 0.5) * basePrice * 0.2) * 100) / 100;
    }

    // Get realistic lot size based on symbol
    getRealisticLotSize(symbol) {
        const lotSizes = {
            'RELIANCE': 250,
            'TCS': 150,
            'INFY': 300,
            'WIPRO': 1200,
            'HDFC': 300,
            'HDFCBANK': 300,
            'ICICIBANK': 500,
            'SBIN': 750,
            'ITC': 1600,
            'LT': 150,
            'HCLTECH': 400,
            'TATASTEEL': 3500,
            'BHARTIARTL': 600,
            'MARUTI': 50,
            'ASIANPAINT': 150,
            'TITAN': 150,
            'ULTRACEMCO': 50,
            'NESTLEIND': 200,
            'KOTAKBANK': 250,
            'AXISBANK': 450
        };
        
        return lotSizes[symbol] || 500; // Default lot size
    }

    // Get quotes for instruments
    async getQuotes(instruments) {
        try {
            // This would use the mcp_kite_get_quotes function
            const quotes = {};
            instruments.forEach(instrument => {
                const symbol = instrument.split(':')[1] || instrument;
                const currentPrice = this.getRealisticStockPrice(symbol);
                const variation = currentPrice * 0.02; // 2% variation
                
                quotes[instrument] = {
                    instrument_token: 258561,
                    timestamp: new Date().toISOString(),
                    last_price: currentPrice,
                    last_quantity: 1,
                    last_trade_time: new Date().toISOString(),
                    average_price: currentPrice * 0.995,
                    volume: Math.floor(Math.random() * 10000000),
                    buy_quantity: Math.floor(Math.random() * 1000),
                    sell_quantity: Math.floor(Math.random() * 1000),
                    ohlc: {
                        open: currentPrice - variation + Math.random() * variation,
                        high: currentPrice + Math.random() * variation,
                        low: currentPrice - Math.random() * variation,
                        close: currentPrice
                    },
                    net_change: (Math.random() - 0.5) * variation,
                    oi: 0,
                    oi_day_high: 0,
                    oi_day_low: 0,
                    depth: {
                        buy: [
                            { price: currentPrice - 1, quantity: Math.floor(Math.random() * 500), orders: Math.floor(Math.random() * 10) },
                            { price: currentPrice - 2, quantity: Math.floor(Math.random() * 500), orders: Math.floor(Math.random() * 10) }
                        ],
                        sell: [
                            { price: currentPrice + 1, quantity: Math.floor(Math.random() * 500), orders: Math.floor(Math.random() * 10) },
                            { price: currentPrice + 2, quantity: Math.floor(Math.random() * 500), orders: Math.floor(Math.random() * 10) }
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
                const symbol = instrument.split(':')[1] || instrument;
                const currentPrice = this.getRealisticStockPrice(symbol);
                
                ltpData[instrument] = {
                    instrument_token: 258561,
                    last_price: currentPrice
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
            
            // Add some randomness to make it more realistic
            const callVariation = callPrice * 0.1 * (Math.random() - 0.5);
            const putVariation = putPrice * 0.1 * (Math.random() - 0.5);
            
            options.push({
                strike: strike,
                call: {
                    last_price: Math.max(0.05, callPrice + callVariation),
                    bid: Math.max(0.05, callPrice + callVariation - Math.random() * 5),
                    ask: callPrice + callVariation + Math.random() * 5,
                    volume: Math.floor(Math.random() * 50000),
                    oi: Math.floor(Math.random() * 200000),
                    change: (Math.random() - 0.5) * callPrice * 0.2
                },
                put: {
                    last_price: Math.max(0.05, putPrice + putVariation),
                    bid: Math.max(0.05, putPrice + putVariation - Math.random() * 5),
                    ask: putPrice + putVariation + Math.random() * 5,
                    volume: Math.floor(Math.random() * 50000),
                    oi: Math.floor(Math.random() * 200000),
                    change: (Math.random() - 0.5) * putPrice * 0.2
                }
            });
        });
        
        return options;
    }

    // Generate strike prices around current price
    generateStrikes(currentPrice) {
        const strikes = [];
        
        // Determine strike interval based on stock price
        let interval;
        if (currentPrice < 100) {
            interval = 5;       // For very low priced stocks
        } else if (currentPrice < 500) {
            interval = 10;      // For low priced stocks (like TATASTEEL, ITC)
        } else if (currentPrice < 1000) {
            interval = 25;      // For medium priced stocks
        } else if (currentPrice < 2000) {
            interval = 50;      // For higher priced stocks
        } else if (currentPrice < 5000) {
            interval = 100;     // For very high priced stocks
        } else {
            interval = 250;     // For ultra high priced stocks (like MARUTI)
        }
        
        // Round current price to nearest interval for base strike
        const baseStrike = Math.round(currentPrice / interval) * interval;
        
        // Generate strikes around the base price (typically ±10 strikes)
        for (let i = -10; i <= 10; i++) {
            const strike = baseStrike + (i * interval);
            if (strike > 0) {  // Only positive strikes
                strikes.push(strike);
            }
        }
        
        return strikes;
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