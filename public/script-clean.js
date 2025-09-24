// Put Options LTP Finder with Authentication
class PutOptionsLTPFinder {
    constructor() {
        // Lot sizes for popular stocks (shares per lot)
        this.lotSizes = {
            'RELIANCE': 505,
            'TCS': 1125,
            'INFY': 600,
            'HDFCBANK': 550,
            'ICICIBANK': 1375,
            'KOTAKBANK': 400,
            'HINDUNILVR': 300,
            'SBIN': 3000,
            'BHARTIARTL': 1700,
            'ITC': 1600,
            'LT': 600,
            'AXISBANK': 1200,
            'ASIANPAINT': 300,
            'MARUTI': 300,
            'SUNPHARMA': 700,
            'TITAN': 1200,
            'ULTRACEMCO': 200,
            'NESTLEIND': 100,
            'POWERGRID': 2100,
            'NTPC': 2500,
            'ONGC': 3700,
            'COALINDIA': 4600,
            'TATAMOTORS': 2500,
            'TATASTEEL': 1100,
            'WIPRO': 1200,
            'HCLTECH': 250,
            'TECHM': 400,
            'JSWSTEEL': 800,
            'INDUSINDBK': 1800,
            'ADANIGREEN': 2400,
            'ADANIPORTS': 1200,
            'BAJFINANCE': 125,
            'BAJAJFINSV': 400,
            'DRREDDY': 125,
            'CIPLA': 800,
            'DIVISLAB': 200,
            'EICHERMOT': 400,
            'HEROMOTOCO': 700,
            'GRASIM': 600,
            'JSWENERGY': 5000,
            'BPCL': 1100,
            'HINDALCO': 2800,
            'APOLLOHOSP': 400,
            'GODREJCP': 1000,
            'BRITANNIA': 300,
            'DABUR': 1800,
            'MARICO': 2000,
            'PIDILITIND': 450,
            'UPL': 1400
        };

        this.token = localStorage.getItem('authToken');
        this.initialize();
    }

    initialize() {
        this.setupEventListeners();
        this.updateDataModeDisplay('demo');
        this.checkAuthenticationStatus();
    }

    checkAuthenticationStatus() {
        if (!this.token) {
            window.location.href = '/login.html';
            return;
        }

        // Load user profile
        this.loadUserProfile();
    }

    async loadUserProfile() {
        try {
            const response = await fetch('/api/users/profile', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                throw new Error('Authentication failed');
            }

            const userData = await response.json();
            this.updateUserInfo(userData.data);

        } catch (error) {
            console.error('Failed to load profile:', error);
            localStorage.removeItem('authToken');
            window.location.href = '/login.html';
        }
    }

    updateUserInfo(user) {
        const userNameEl = document.getElementById('userName');
        const userEmailEl = document.getElementById('userEmail');

        if (userNameEl) userNameEl.textContent = user.name || 'User';
        if (userEmailEl) userEmailEl.textContent = user.email || '';
    }

    updateDataModeDisplay(mode = null) {
        const dataModeEl = document.getElementById('dataMode');
        if (!dataModeEl) return;

        if (mode === 'live') {
            dataModeEl.innerHTML = '✅ Live market data from Zerodha';
            dataModeEl.style.color = '#4CAF50';
        } else {
            dataModeEl.innerHTML = '⚠️ Demo LTP data - Not real market prices';
            dataModeEl.style.color = '#FF5722';
        }
    }

    async isZerodhaConnected() {
        try {
            const response = await fetch('/api/users/profile', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) return false;

            const userData = await response.json();
            return userData.data?.zerodha_connected || false;
        } catch (error) {
            console.error('Failed to check Zerodha connection:', error);
            return false;
        }
    }

    async fetchRealPutLTP(symbol, strikePrice, expiryDate) {
        try {
            const response = await fetch('/api/zerodha/option-chain', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    symbol: symbol,
                    expiry: expiryDate
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to fetch option data');
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'API request failed');
            }

            // Find exact strike price match
            const exactMatch = result.data.find(option => 
                Math.abs(option.strike - strikePrice) < 0.01
            );

            if (exactMatch && exactMatch.ltp > 0) {
                return exactMatch.ltp;
            }

            // If exact match not found, find closest strike
            const sortedOptions = result.data
                .filter(option => option.ltp > 0)
                .sort((a, b) => Math.abs(a.strike - strikePrice) - Math.abs(b.strike - strikePrice));

            if (sortedOptions.length > 0) {
                console.warn(`Exact strike ${strikePrice} not found, using closest: ${sortedOptions[0].strike}`);
                return sortedOptions[0].ltp;
            }

            throw new Error(`No put options found for ${symbol} strike ${strikePrice}`);

        } catch (error) {
            console.error('Failed to fetch real LTP:', error);
            throw error;
        }
    }

    setupEventListeners() {
        const calculateBtn = document.getElementById('calculatePremium');
        const logoutBtn = document.getElementById('logoutBtn');

        if (calculateBtn) {
            calculateBtn.addEventListener('click', () => this.calculatePutOptionsLTP());
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // Auto-calculate lot size when stock symbol changes
        const stockInput = document.getElementById('stockSymbol');
        if (stockInput) {
            stockInput.addEventListener('input', () => {
                const symbol = stockInput.value.toUpperCase();
                const lotSize = this.lotSizes[symbol] || 1;
                this.updateLotSizeDisplay(symbol, lotSize);
            });
        }
    }

    updateLotSizeDisplay(symbol, lotSize) {
        const lotSizeEl = document.getElementById('lotSize');
        const lotInfoEl = document.getElementById('lotInfo');
        
        if (lotSizeEl) {
            lotSizeEl.textContent = lotSize.toLocaleString();
        }
        
        if (lotInfoEl) {
            if (this.lotSizes[symbol]) {
                lotInfoEl.textContent = `(${symbol} lot size)`;
                lotInfoEl.style.color = '#4CAF50';
            } else {
                lotInfoEl.textContent = '(default - verify actual lot size)';
                lotInfoEl.style.color = '#FF5722';
            }
        }
    }

    async calculatePutOptionsLTP() {
        const stockSymbol = document.getElementById('stockSymbol')?.value?.trim().toUpperCase();
        const strikePrice = parseFloat(document.getElementById('strikePrice')?.value);
        const expiryDate = document.getElementById('expiryDate')?.value;

        if (!stockSymbol || !strikePrice || !expiryDate) {
            this.showError('Please fill in all fields');
            return;
        }

        const lotSize = this.lotSizes[stockSymbol] || 1;

        // Update lot size display
        this.updateLotSizeDisplay(stockSymbol, lotSize);

        const calculateBtn = document.getElementById('calculatePremium');
        const originalText = calculateBtn.textContent;
        
        try {
            calculateBtn.textContent = 'Finding LTP...';
            calculateBtn.disabled = true;

            let putLTP;
            let dataMode = 'demo';

            // Check if Zerodha is connected and try to get real data
            const zerodhaConnected = await this.isZerodhaConnected();
            
            if (zerodhaConnected) {
                try {
                    putLTP = await this.fetchRealPutLTP(stockSymbol, strikePrice, expiryDate);
                    dataMode = 'live';
                    console.log('Using real Zerodha LTP data:', putLTP);
                } catch (zerodhaError) {
                    console.warn('Zerodha data failed, falling back to demo:', zerodhaError.message);
                    putLTP = this.generateMockPutLTP(stockSymbol, strikePrice, expiryDate);
                }
            } else {
                // Generate mock put option LTP
                putLTP = this.generateMockPutLTP(stockSymbol, strikePrice, expiryDate);
            }

            this.updateDataModeDisplay(dataMode);

            // Calculate total premium for the lot
            const totalPremium = putLTP * lotSize;

            this.displayResults({
                premium: putLTP,
                totalPremium: totalPremium,
                strikePrice: strikePrice,
                quantity: lotSize,
                stockSymbol: stockSymbol,
                expiryDate: expiryDate,
                dataMode: dataMode
            });

        } catch (error) {
            console.error('Premium calculation failed:', error);
            this.showError(error.message || 'Failed to calculate premium. Please try again.');
        } finally {
            calculateBtn.textContent = originalText;
            calculateBtn.disabled = false;
        }
    }

    generateMockPutLTP(symbol, strikePrice, expiryDate) {
        // Create a deterministic seed based on symbol, strike price, and expiry date
        const seedString = `${symbol}-${strikePrice}-${expiryDate}`;
        const seed = this.stringToSeed(seedString);
        
        // Generate deterministic random number using the seed
        const pseudoRandom = this.seededRandom(seed);
        
        // Generate realistic put option LTP based on strike price
        // Put LTP is typically 1-5% of strike price for ATM/OTM options
        const baseLTP = strikePrice * (0.01 + pseudoRandom * 0.04); // 1-5% of strike
        
        // Add some symbol-specific variation
        const symbolHash = symbol.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
        const variation = (symbolHash % 50) / 1000; // 0-0.049
        
        // Round to nearest 0.05 (typical option price tick)
        const ltp = baseLTP * (1 + variation);
        return Math.round(ltp * 20) / 20; // Round to nearest 0.05
    }

    // Convert string to numeric seed
    stringToSeed(str) {
        let seed = 0;
        for (let i = 0; i < str.length; i++) {
            seed = ((seed << 5) - seed + str.charCodeAt(i)) & 0xffffffff;
        }
        return Math.abs(seed);
    }

    // Generate seeded random number (0-1)
    seededRandom(seed) {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    displayResults(data) {
        const resultsSection = document.getElementById('resultsSection');
        const totalPremiumEl = document.getElementById('totalPremium');
        const premiumDetailsEl = document.getElementById('premiumDetails');

        if (!resultsSection || !totalPremiumEl || !premiumDetailsEl) return;

        // Format currency
        const formatCurrency = (amount) => {
            return new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(amount);
        };

        // Update total premium
        totalPremiumEl.textContent = formatCurrency(data.totalPremium);

        // Create detailed breakdown
        premiumDetailsEl.innerHTML = `
            <div class="premium-breakdown">
                <div class="breakdown-row">
                    <span class="label">Stock Symbol:</span>
                    <span class="value">${data.stockSymbol}</span>
                </div>
                <div class="breakdown-row">
                    <span class="label">Strike Price:</span>
                    <span class="value">${formatCurrency(data.strikePrice)}</span>
                </div>
                <div class="breakdown-row">
                    <span class="label">Expiry Date:</span>
                    <span class="value">${new Date(data.expiryDate).toLocaleDateString('en-IN')}</span>
                </div>
                <div class="breakdown-row">
                    <span class="label">Put Option LTP:</span>
                    <span class="value">${formatCurrency(data.premium)}</span>
                </div>
                <div class="breakdown-row">
                    <span class="label">Lot Size:</span>
                    <span class="value">${data.quantity.toLocaleString()} shares</span>
                </div>
                <div class="breakdown-row total-row">
                    <span class="label">Total Premium Required:</span>
                    <span class="value">${formatCurrency(data.totalPremium)}</span>
                </div>
                ${data.dataMode === 'demo' ? `
                <div class="demo-warning">
                    <strong>⚠️ Demo Data:</strong> This is simulated LTP data. For actual trading, connect your Zerodha account for live market prices.
                </div>
                ` : `
                <div class="live-data-info">
                    <strong>✅ Live Data:</strong> Real-time LTP from Zerodha market data.
                </div>
                `}
            </div>
        `;

        // Show results section
        resultsSection.style.display = 'block';
        
        // Smooth scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    showError(message) {
        const errorEl = document.getElementById('errorMessage');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
            
            // Hide after 5 seconds
            setTimeout(() => {
                errorEl.style.display = 'none';
            }, 5000);
        }
        
        console.error('Error:', message);
    }

    logout() {
        localStorage.removeItem('authToken');
        window.location.href = '/login.html';
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.putOptionsLTPFinder = new PutOptionsLTPFinder();
});