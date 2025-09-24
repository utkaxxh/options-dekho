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
            'IOC': 1000,
            'HINDALCO': 3700,
            'VEDL': 4800,
            'SAIL': 7200,
            'NMDC': 3300
        };
        
        this.initializeEventListeners();
        this.setDefaultExpiryDate();
        this.updateDataModeDisplay();
    }

    getLotSize(symbol) {
        return this.lotSizes[symbol] || 1; // Default to 1 if not found
    }

    updateLotSizeDisplay(symbol, lotSize) {
        const lotSizeInfo = document.getElementById('lotSizeInfo');
        if (lotSizeInfo) {
            const lotSizeValue = document.getElementById('lotSizeValue');
            const totalShares = document.getElementById('totalShares');
            
            if (lotSizeValue && totalShares) {
                lotSizeValue.textContent = lotSize;
                totalShares.textContent = lotSize;
                lotSizeInfo.style.display = 'block';
            }
        }
    }

    initializeEventListeners() {
        document.getElementById('calculatePremium')?.addEventListener('click', () => {
            this.calculatePremium();
        });
        
        document.querySelector('.btn[type="reset"]')?.addEventListener('click', () => {
            this.clearResults();
        });
        
        // Real-time calculation on input changes
        ['stockSymbol', 'strikePrice', 'expiryDate'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => {
                    // Update lot size display when stock symbol changes
                    if (id === 'stockSymbol') {
                        const symbol = element.value.trim().toUpperCase();
                        if (symbol) {
                            const lotSize = this.getLotSize(symbol);
                            this.updateLotSizeDisplay(symbol, lotSize);
                        }
                    }
                    
                    if (this.hasValidInputs()) {
                        this.debouncedCalculate();
                    }
                });
            }
        });
    }

    // Debounced calculation to avoid too many API calls
    debouncedCalculate = this.debounce(() => {
        this.calculatePremium();
    }, 500);

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    setDefaultExpiryDate() {
        const expiryDateInput = document.getElementById('expiryDate');
        if (!expiryDateInput) return;
        
        // Set to next Thursday (typical expiry day)
        const today = new Date();
        const nextThursday = new Date(today);
        const daysUntilThursday = (4 - today.getDay() + 7) % 7 || 7;
        nextThursday.setDate(today.getDate() + daysUntilThursday);
        
        expiryDateInput.value = nextThursday.toISOString().split('T')[0];
    }

    hasValidInputs() {
        const stockSymbol = document.getElementById('stockSymbol')?.value.trim();
        const strikePrice = parseFloat(document.getElementById('strikePrice')?.value || '0');
        const expiryDate = document.getElementById('expiryDate')?.value;

        return stockSymbol && strikePrice > 0 && expiryDate;
    }

    async calculatePremium() {
        if (!this.hasValidInputs()) {
            this.showError('Please fill in all required fields');
            return;
        }

        // Check authentication
        if (!window.authManager?.authToken) {
            this.showError('Please log in to calculate premiums');
            return;
        }

        const stockSymbol = document.getElementById('stockSymbol').value.trim().toUpperCase();
        const strikePrice = parseFloat(document.getElementById('strikePrice').value);
        const expiryDate = document.getElementById('expiryDate').value;
        
        // Get lot size for the stock
        const lotSize = this.getLotSize(stockSymbol);
        
        // Update lot size display
        this.updateLotSizeDisplay(stockSymbol, lotSize);

        const calculateBtn = document.getElementById('calculatePremium');
        const originalText = calculateBtn.textContent;
        
        try {
            calculateBtn.textContent = 'Finding LTP...';
            calculateBtn.disabled = true;

            // Generate mock put option LTP
            const putLTP = this.generateMockPutLTP(stockSymbol, strikePrice, expiryDate);
            this.updateDataModeDisplay('demo');

            // Calculate total premium for the lot
            const totalPremium = putLTP * lotSize;

            this.displayResults({
                premium: putLTP,
                totalPremium: totalPremium,
                strikePrice: strikePrice,
                quantity: lotSize,
                stockSymbol: stockSymbol,
                expiryDate: expiryDate
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
                maximumFractionDigits: 2
            }).format(amount);
        };

        // Calculate additional metrics
        const daysToExpiry = Math.ceil((new Date(data.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));

        totalPremiumEl.textContent = formatCurrency(data.totalPremium);
        
        premiumDetailsEl.innerHTML = `
            <div class="premium-breakdown">
                <div class="metric">
                    <span class="metric-label">Put LTP per share:</span>
                    <span class="metric-value">${formatCurrency(data.premium)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Strike price:</span>
                    <span class="metric-value">${formatCurrency(data.strikePrice)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Lot size:</span>
                    <span class="metric-value">${data.quantity} shares</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Days to expiry:</span>
                    <span class="metric-value">${daysToExpiry}</span>
                </div>
            </div>
            <div class="risk-note">
                <strong>⚠️ Important:</strong> This shows demo LTP data generated by mathematical formulas. 
                Real market LTP on Zerodha/other platforms will be different based on live trading conditions.
                Use this tool for learning and rough estimation only.
            </div>
        `;

        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    clearResults() {
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection) {
            resultsSection.style.display = 'none';
        }
    }

    updateDataModeDisplay(mode = null) {
        const dataModeEl = document.getElementById('dataMode');
        if (!dataModeEl) return;

        dataModeEl.innerHTML = '� Using demo put option LTP data';
        dataModeEl.style.color = '#FF9800';
    }

    showError(message) {
        if (window.authManager) {
            window.authManager.showError(message);
        } else {
            alert(message);
        }
    }

    showSuccess(message) {
        if (window.authManager) {
            window.authManager.showSuccess(message);
        } else {
            alert(message);
        }
    }
}

// Initialize put LTP finder when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.putLTPFinder = new PutOptionsLTPFinder();
    
    // Update data mode display when auth status changes
    document.addEventListener('authStatusChanged', () => {
        window.putLTPFinder?.updateDataModeDisplay();
    });
});

// Export for global access
window.OptionsPremiumCalculator = OptionsPremiumCalculator;