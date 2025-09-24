// Enhanced Options Premium Calculator with Authentication
class OptionsPremiumCalculator {
    constructor() {
        this.riskFreeRate = 0.05; // 5% annual risk-free rate
        this.volatility = 0.25;   // 25% annual volatility (default)
        
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
            calculateBtn.textContent = 'Calculating...';
            calculateBtn.disabled = true;

            // Try to get real-time data from Zerodha first
            let currentPrice = null;
            
            try {
                const instruments = [`NSE:${stockSymbol}`];
                const ltpResponse = await window.authManager.makeAuthenticatedRequest('/api/zerodha/ltp', {
                    method: 'POST',
                    body: JSON.stringify({ instruments })
                });

                if (ltpResponse.ok) {
                    const ltpData = await ltpResponse.json();
                    if (ltpData.success && ltpData.data[`NSE:${stockSymbol}`]) {
                        currentPrice = ltpData.data[`NSE:${stockSymbol}`].last_price;
                        this.updateDataModeDisplay('real-time');
                    }
                }
            } catch (error) {
                console.log('Real-time data not available, using mock data:', error);
            }

            // Fallback to mock data if real-time data is not available
            if (currentPrice === null) {
                currentPrice = this.generateMockPrice(stockSymbol, strikePrice);
                this.updateDataModeDisplay('demo');
            }

            // Calculate premium using Black-Scholes model
            const premium = this.calculateBlackScholesPut(
                currentPrice,
                strikePrice,
                this.getTimeToExpiry(expiryDate),
                this.riskFreeRate,
                this.volatility
            );

            const totalPremium = premium * lotSize;

            this.displayResults({
                premium: premium,
                totalPremium: totalPremium,
                currentPrice: currentPrice,
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

    generateMockPrice(symbol, strikePrice) {
        // Generate realistic mock prices based on strike price
        const basePrice = strikePrice * (0.95 + Math.random() * 0.1); // ±5% of strike
        
        // Add some symbol-specific variation
        const symbolHash = symbol.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
        const variation = (symbolHash % 100) / 1000; // 0-0.099
        
        return Math.round(basePrice * (1 + variation) * 100) / 100;
    }

    calculateBlackScholesPut(S, K, T, r, sigma) {
        if (T <= 0) return Math.max(K - S, 0); // Intrinsic value for expired option
        
        const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
        const d2 = d1 - sigma * Math.sqrt(T);
        
        const putPrice = K * Math.exp(-r * T) * this.normCDF(-d2) - S * this.normCDF(-d1);
        
        return Math.max(putPrice, 0.01); // Minimum premium of 1 paisa
    }

    // Normal Cumulative Distribution Function
    normCDF(x) {
        // Approximation of the normal CDF
        const a1 =  0.254829592;
        const a2 = -0.284496736;
        const a3 =  1.421413741;
        const a4 = -1.453152027;
        const a5 =  1.061405429;
        const p  =  0.3275911;

        const sign = x < 0 ? -1 : 1;
        x = Math.abs(x) / Math.sqrt(2.0);

        const t = 1.0 / (1.0 + p * x);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

        return 0.5 * (1.0 + sign * y);
    }

    getTimeToExpiry(expiryDateString) {
        const expiryDate = new Date(expiryDateString);
        const today = new Date();
        
        // Set expiry time to market close (3:30 PM IST)
        expiryDate.setHours(15, 30, 0, 0);
        
        const timeDiffMs = expiryDate.getTime() - today.getTime();
        const timeDiffYears = timeDiffMs / (1000 * 60 * 60 * 24 * 365.25);
        
        return Math.max(timeDiffYears, 0.001); // Minimum 0.1% of a year
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
        const moneyness = ((data.currentPrice - data.strikePrice) / data.strikePrice * 100).toFixed(2);
        const breakeven = data.strikePrice - data.premium;

        totalPremiumEl.textContent = formatCurrency(data.totalPremium);
        
        premiumDetailsEl.innerHTML = `
            <div class="premium-breakdown">
                <div class="metric">
                    <span class="metric-label">Premium per share:</span>
                    <span class="metric-value">${formatCurrency(data.premium)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Current price:</span>
                    <span class="metric-value">${formatCurrency(data.currentPrice)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Strike price:</span>
                    <span class="metric-value">${formatCurrency(data.strikePrice)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Breakeven:</span>
                    <span class="metric-value">${formatCurrency(breakeven)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Days to expiry:</span>
                    <span class="metric-value">${daysToExpiry}</span>
                </div>
                <div class="metric ${moneyness >= 0 ? 'positive' : 'negative'}">
                    <span class="metric-label">Moneyness:</span>
                    <span class="metric-value">${moneyness}%</span>
                </div>
            </div>
            <div class="risk-note">
                <strong>⚠️ Risk Note:</strong> This is the premium you will earn if the option expires worthless. 
                If the stock price falls below ₹${breakeven.toFixed(2)} at expiry, you may face losses.
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

        if (mode === 'real-time') {
            dataModeEl.innerHTML = '🟢 Using real-time Zerodha data';
            dataModeEl.style.color = '#4CAF50';
        } else if (mode === 'demo') {
            dataModeEl.innerHTML = '🟡 Using demo data (Connect Zerodha for real-time prices)';
            dataModeEl.style.color = '#FF9800';
        } else {
            // Check authentication and Zerodha connection status
            const userInfo = window.authManager?.userInfo;
            if (userInfo?.zerodha_connected) {
                dataModeEl.innerHTML = '🟢 Real-time data available';
                dataModeEl.style.color = '#4CAF50';
            } else {
                dataModeEl.innerHTML = '🔗 Connect Zerodha for real-time data';
                dataModeEl.style.color = '#2196F3';
            }
        }
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

// Initialize calculator when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.optionsCalculator = new OptionsPremiumCalculator();
    
    // Update data mode display when auth status changes
    document.addEventListener('authStatusChanged', () => {
        window.optionsCalculator?.updateDataModeDisplay();
    });
});

// Export for global access
window.OptionsPremiumCalculator = OptionsPremiumCalculator;