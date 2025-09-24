// Options Premium Calculator JavaScript

class OptionsPremiumCalculator {
    constructor() {
        this.formContainer = document.querySelector('.calculator-section');
        this.resultsSection = document.getElementById('resultsSection');
        this.liveDataSection = document.getElementById('liveDataSection');
        this.fetchLiveDataBtn = document.getElementById('fetchLiveData');
        this.toggleAutoRefreshBtn = document.getElementById('toggleAutoRefresh');
        this.liveControls = document.getElementById('liveControls');
        this.refreshIntervalSelect = document.getElementById('refreshInterval');
        this.liveStatus = document.getElementById('liveStatus');
        this.lastUpdated = document.getElementById('lastUpdated');
        this.kiteAPI = new KiteAPIIntegration();
        
        // Auto-refresh properties
        this.autoRefreshInterval = null;
        this.isAutoRefreshing = false;
        this.currentStockSymbol = null;
        this.lastPremiumData = {};
        
        this.initializeEventListeners();
        this.setDefaultExpiryDate();
        this.checkKiteLoginStatus();
    }

    initializeEventListeners() {
        this.fetchLiveDataBtn.addEventListener('click', () => this.fetchLiveData());
        this.toggleAutoRefreshBtn.addEventListener('click', () => this.toggleAutoRefresh());
        this.refreshIntervalSelect.addEventListener('change', () => this.updateRefreshInterval());
        
        // Auto-populate lot size when stock symbol changes
        const stockSymbolInput = document.getElementById('stockSymbol');
        stockSymbolInput.addEventListener('blur', async () => {
            const symbol = stockSymbolInput.value.trim().toUpperCase();
            if (symbol) {
                try {
                    const lotSize = await this.kiteAPI.getLotSize(symbol);
                    document.getElementById('lotSize').value = lotSize;
                } catch (error) {
                    console.warn('Could not fetch lot size for', symbol, error.message);
                }
            }
        });
        
        // Auto-calculate when relevant inputs change
        const inputs = this.formContainer.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                if (this.lastPremiumData.options && this.validateInputs()) {
                    this.calculatePremiumFromLiveData();
                }
            });
        });

        // Reset functionality
        const clearBtn = this.formContainer.querySelector('button[type="reset"]');
        clearBtn.addEventListener('click', () => this.handleFormReset());
    }

    setDefaultExpiryDate() {
        const expiryInput = document.getElementById('expiryDate');
        const today = new Date();
        const nextThursday = this.getNextThursday(today);
        expiryInput.value = nextThursday.toISOString().split('T')[0];
        expiryInput.min = today.toISOString().split('T')[0];
    }

    getNextThursday(date) {
        const result = new Date(date);
        const daysUntilThursday = (4 - result.getDay() + 7) % 7;
        if (daysUntilThursday === 0 && result.getDay() === 4) {
            result.setDate(result.getDate() + 7);
        } else {
            result.setDate(result.getDate() + daysUntilThursday);
        }
        return result;
    }

    handleFormSubmit(e) {
        // This method is no longer needed since we removed the form submit
        // Keeping for compatibility but will not be called
        e.preventDefault();
    }

    validateInputs() {
        let isValid = true;
        this.clearErrors();

        const requiredFields = [
            { id: 'stockSymbol', message: 'Stock symbol is required' },
            { id: 'strikePrice', message: 'Strike price must be greater than 0' },
            { id: 'lotSize', message: 'Lot size must be greater than 0' },
            { id: 'expiryDate', message: 'Expiry date is required' },
            { id: 'numberOfLots', message: 'Number of lots must be at least 1' }
        ];

        requiredFields.forEach(field => {
            const input = document.getElementById(field.id);
            const value = input.value.trim();

            if (!value || (field.id !== 'stockSymbol' && parseFloat(value) <= 0)) {
                this.showError(field.id, field.message);
                isValid = false;
            }
        });

        // Validate expiry date is not in the past
        const expiryDate = new Date(document.getElementById('expiryDate').value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (expiryDate < today) {
            this.showError('expiryDate', 'Expiry date cannot be in the past');
            isValid = false;
        }

        return isValid;
    }

    handleFormReset() {
        this.hideResults();
        this.setDefaultExpiryDate();
        this.clearErrors();
        
        // Stop auto-refresh when form is reset
        if (this.isAutoRefreshing) {
            this.stopAutoRefresh();
        }
        
        this.currentStockSymbol = null;
        this.lastPremiumData = {};
    }

    validateForm() {
        // Redirect to the new validation method for backward compatibility
        return this.validateInputs();
    }

    validateAndCalculate() {
        // This method is updated to work with live data
        if (this.lastPremiumData.options && this.validateInputs()) {
            this.calculatePremiumFromLiveData();
            this.showResults();
        }
    }

    calculatePremiumFromLiveData() {
        if (!this.lastPremiumData.options) {
            this.showAlert('Please fetch live data first', 'warning');
            return;
        }

        const formData = this.getFormData();
        
        // Find the matching strike price in live data
        const matchingOption = this.lastPremiumData.options.find(option => 
            Math.abs(option.strike - formData.strikePrice) < 0.01
        );

        if (!matchingOption) {
            this.showAlert(`Strike price ${formData.strikePrice} not found in live data. Please select from the options chain.`, 'warning');
            return;
        }

        // Use the live premium data for calculations
        const premiumPerShare = matchingOption.put.last_price;
        const calculations = this.performCalculations({
            ...formData,
            premiumPerShare: premiumPerShare
        });
        
        this.updateResultsDisplay(calculations);
        this.showResults();
    }

    calculatePremium() {
        // Redirect to the new method for backward compatibility
        this.calculatePremiumFromLiveData();
    }

    getFormData() {
        return {
            stockSymbol: document.getElementById('stockSymbol').value.trim().toUpperCase(),
            strikePrice: parseFloat(document.getElementById('strikePrice').value),
            lotSize: parseInt(document.getElementById('lotSize').value),
            expiryDate: new Date(document.getElementById('expiryDate').value),
            numberOfLots: parseInt(document.getElementById('numberOfLots').value)
        };
    }

    performCalculations(data) {
        const totalShares = data.lotSize * data.numberOfLots;
        const totalPremium = totalShares * data.premiumPerShare;
        const daysToExpiry = this.calculateDaysToExpiry(data.expiryDate);
        const dailyPremium = daysToExpiry > 0 ? totalPremium / daysToExpiry : 0;
        
        // Estimate margin required (approximately 15-20% of strike value for puts)
        const marginRate = 0.18; // 18% approximate margin
        const marginRequired = totalShares * data.strikePrice * marginRate;
        
        const returnOnMargin = marginRequired > 0 ? (totalPremium / marginRequired) * 100 : 0;
        const breakeven = data.strikePrice - data.premiumPerShare;
        
        return {
            totalShares,
            totalPremium,
            daysToExpiry,
            dailyPremium,
            marginRequired,
            returnOnMargin,
            maxProfit: totalPremium,
            breakeven,
            riskLevel: this.calculateRiskLevel(data.strikePrice, data.premiumPerShare)
        };
    }

    calculateDaysToExpiry(expiryDate) {
        const today = new Date();
        const timeDiff = expiryDate.getTime() - today.getTime();
        return Math.ceil(timeDiff / (1000 * 3600 * 24));
    }

    calculateRiskLevel(strikePrice, premium) {
        const premiumPercentage = (premium / strikePrice) * 100;
        if (premiumPercentage > 5) return 'Low';
        if (premiumPercentage > 2) return 'Medium';
        return 'High';
    }

    updateResultsDisplay(calculations) {
        document.getElementById('totalPremium').textContent = this.formatCurrency(calculations.totalPremium);
        document.getElementById('totalShares').textContent = calculations.totalShares.toLocaleString();
        document.getElementById('daysToExpiry').textContent = calculations.daysToExpiry;
        document.getElementById('dailyPremium').textContent = this.formatCurrency(calculations.dailyPremium);
        document.getElementById('marginRequired').textContent = this.formatCurrency(calculations.marginRequired);
        document.getElementById('returnOnMargin').textContent = calculations.returnOnMargin.toFixed(2) + '%';
        document.getElementById('maxProfit').textContent = this.formatCurrency(calculations.maxProfit);
        document.getElementById('maxLoss').textContent = 'Unlimited';
        document.getElementById('breakeven').textContent = this.formatCurrency(calculations.breakeven);
        document.getElementById('riskLevel').textContent = calculations.riskLevel;
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(amount);
    }

    showResults() {
        this.resultsSection.style.display = 'block';
        this.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    hideResults() {
        this.resultsSection.style.display = 'none';
        this.liveDataSection.style.display = 'none';
        this.liveControls.style.display = 'none';
    }

    showError(fieldId, message) {
        const field = document.getElementById(fieldId);
        field.classList.add('error');
        
        let errorElement = field.parentNode.querySelector('.error');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'error';
            field.parentNode.appendChild(errorElement);
        }
        errorElement.textContent = message;
    }

    clearErrors() {
        const errorElements = this.formContainer.querySelectorAll('.error');
        errorElements.forEach(element => element.remove());
        
        const errorInputs = this.formContainer.querySelectorAll('input.error');
        errorInputs.forEach(input => input.classList.remove('error'));
    }

    showAlert(message, type = 'success') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;
        
        const container = document.querySelector('.container');
        container.insertBefore(alertDiv, container.firstChild);
        
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }

    async checkKiteLoginStatus() {
        try {
            await this.kiteAPI.checkLoginStatus();
            this.showAlert('Connected to Kite API successfully! Live data enabled.', 'success');
        } catch (error) {
            console.log('Kite API not connected, using demo mode:', error.message);
            this.showAlert('Demo Mode: Using simulated data. For live data, use within VS Code with MCP Kite extension.', 'warning');
        }
    }

    async fetchLiveData() {
        const stockSymbol = document.getElementById('stockSymbol').value.trim().toUpperCase();
        
        if (!stockSymbol) {
            this.showAlert('Please enter a stock symbol first', 'warning');
            return;
        }

        this.currentStockSymbol = stockSymbol;
        this.updateFetchButton(true);

        try {
            // Use the integrated Kite API
            const optionsData = await this.kiteAPI.getOptionsChain(stockSymbol);
            this.displayOptionsChain(optionsData);
            this.liveDataSection.style.display = 'block';
            this.liveControls.style.display = 'flex';
            this.updateLastRefreshedTime();
            
            // Automatically calculate premium if form is valid
            if (this.validateInputs()) {
                this.calculatePremiumFromLiveData();
            }
            
            this.showAlert('Options data loaded successfully! Click on any strike price to calculate premium.', 'success');
            
            // Store the data for comparison in auto-refresh
            this.lastPremiumData = optionsData;
        } catch (error) {
            console.error('Error fetching live data:', error);
            this.showAlert('Using simulated data for demonstration. For live data, use within VS Code with MCP extension.', 'warning');
        } finally {
            this.updateFetchButton(false);
        }
    }

    toggleAutoRefresh() {
        if (this.isAutoRefreshing) {
            this.stopAutoRefresh();
        } else {
            this.startAutoRefresh();
        }
    }

    startAutoRefresh() {
        if (!this.currentStockSymbol) {
            this.showAlert('Please fetch live data first before starting auto-refresh', 'warning');
            return;
        }

        this.isAutoRefreshing = true;
        this.toggleAutoRefreshBtn.textContent = 'Stop Auto Refresh';
        this.toggleAutoRefreshBtn.classList.add('active');
        this.liveStatus.classList.add('live');
        this.liveStatus.classList.remove('stopped');
        
        const intervalSeconds = parseInt(this.refreshIntervalSelect.value);
        this.autoRefreshInterval = setInterval(() => {
            this.performBackgroundUpdate();
        }, intervalSeconds * 1000);
        
        this.showAlert(`Auto-refresh started (every ${intervalSeconds} seconds)`, 'success');
    }

    stopAutoRefresh() {
        this.isAutoRefreshing = false;
        this.toggleAutoRefreshBtn.textContent = 'Start Auto Refresh';
        this.toggleAutoRefreshBtn.classList.remove('active');
        this.liveStatus.classList.remove('live');
        this.liveStatus.classList.add('stopped');
        
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
        
        this.showAlert('Auto-refresh stopped', 'success');
    }

    updateRefreshInterval() {
        if (this.isAutoRefreshing) {
            // Restart with new interval
            this.stopAutoRefresh();
            setTimeout(() => this.startAutoRefresh(), 100);
        }
    }

    async performBackgroundUpdate() {
        if (!this.currentStockSymbol || !this.isAutoRefreshing) return;

        try {
            this.liveStatus.classList.add('updating');
            this.liveStatus.classList.remove('live');
            
            // Fetch new data
            const newData = await this.kiteAPI.getOptionsChain(this.currentStockSymbol);
            
            // Compare with previous data and highlight changes
            this.updateOptionsChainWithHighlights(newData);
            this.updateLastRefreshedTime();
            
            // Update calculations if form is filled
            if (this.validateInputs()) {
                this.calculatePremiumFromLiveData();
            }
            
            this.lastPremiumData = newData;
        } catch (error) {
            console.error('Background update failed:', error);
            // Don't show alert for background failures to avoid spamming
        } finally {
            this.liveStatus.classList.remove('updating');
            this.liveStatus.classList.add('live');
        }
    }

    updateOptionsChainWithHighlights(newData) {
        const optionsChainDiv = document.getElementById('optionsChain');
        const rows = optionsChainDiv.querySelectorAll('tbody tr');
        
        // Update the current price
        const currentPriceDiv = optionsChainDiv.querySelector('.alert-success');
        if (currentPriceDiv) {
            const oldPrice = this.lastPremiumData.underlying_price || 0;
            const newPrice = newData.underlying_price;
            
            currentPriceDiv.innerHTML = `Current Price of ${newData.symbol}: ${this.formatCurrency(newPrice)}`;
            
            if (newPrice !== oldPrice) {
                currentPriceDiv.classList.add('value-updated');
                setTimeout(() => currentPriceDiv.classList.remove('value-updated'), 1000);
            }
        }
        
        // Update table rows with new data
        newData.options.forEach((newOption, index) => {
            if (rows[index]) {
                const row = rows[index];
                const cells = row.children;
                
                const oldOption = this.lastPremiumData.options && this.lastPremiumData.options[index];
                
                // Update call OI
                cells[0].textContent = newOption.call.oi.toLocaleString();
                if (oldOption && newOption.call.oi !== oldOption.call.oi) {
                    cells[0].classList.add('value-updated');
                    setTimeout(() => cells[0].classList.remove('value-updated'), 1000);
                }
                
                // Update call premium
                cells[1].textContent = this.formatCurrency(newOption.call.last_price);
                if (oldOption && newOption.call.last_price !== oldOption.call.last_price) {
                    cells[1].classList.add('value-updated');
                    setTimeout(() => cells[1].classList.remove('value-updated'), 1000);
                }
                
                // Update put premium
                cells[3].textContent = this.formatCurrency(newOption.put.last_price);
                if (oldOption && newOption.put.last_price !== oldOption.put.last_price) {
                    cells[3].classList.add('value-updated');
                    setTimeout(() => cells[3].classList.remove('value-updated'), 1000);
                }
                
                // Update put OI
                cells[4].textContent = newOption.put.oi.toLocaleString();
                if (oldOption && newOption.put.oi !== oldOption.put.oi) {
                    cells[4].classList.add('value-updated');
                    setTimeout(() => cells[4].classList.remove('value-updated'), 1000);
                }
                
                // Update click handler with new data
                row.onclick = () => {
                    document.getElementById('strikePrice').value = newOption.strike;
                    this.calculatePremiumFromLiveData();
                    this.showAlert(`Selected strike ${this.formatCurrency(newOption.strike)} with premium ${this.formatCurrency(newOption.put.last_price)}`, 'success');
                };
            }
        });
    }

    updateFetchButton(isLoading) {
        if (isLoading) {
            this.fetchLiveDataBtn.innerHTML = '<span class="loading"></span> Fetching...';
            this.fetchLiveDataBtn.disabled = true;
        } else {
            this.fetchLiveDataBtn.innerHTML = 'Fetch Live Data';
            this.fetchLiveDataBtn.disabled = false;
        }
    }

    updateLastRefreshedTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString();
        this.lastUpdated.textContent = `Last updated: ${timeString}`;
    }

    displayOptionsChain(data) {
        const optionsChainDiv = document.getElementById('optionsChain');
        
        const table = `
            <div class="alert alert-success">
                Current Price of ${data.symbol}: ${this.formatCurrency(data.underlying_price)}
            </div>
            <table class="options-table">
                <thead>
                    <tr>
                        <th>Call OI</th>
                        <th>Call Premium</th>
                        <th>Strike Price</th>
                        <th>Put Premium</th>
                        <th>Put OI</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.options.map(option => `
                        <tr onclick="this.selectStrike(${option.strike}, ${option.put.last_price})" style="cursor: pointer;">
                            <td>${option.call.oi.toLocaleString()}</td>
                            <td>${this.formatCurrency(option.call.last_price)}</td>
                            <td style="font-weight: bold; background-color: #f8f9fa;">${this.formatCurrency(option.strike)}</td>
                            <td>${this.formatCurrency(option.put.last_price)}</td>
                            <td>${option.put.oi.toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <p style="margin-top: 15px; text-align: center; color: #666;">
                Click on any row to auto-fill the strike price and put premium
            </p>
        `;
        
        optionsChainDiv.innerHTML = table;
        
        // Add click handlers to table rows
        const rows = optionsChainDiv.querySelectorAll('tbody tr');
        rows.forEach((row, index) => {
            row.addEventListener('click', () => {
                const option = data.options[index];
                document.getElementById('strikePrice').value = option.strike;
                
                // Auto-calculate if other fields are filled
                if (this.validateInputs()) {
                    this.calculatePremiumFromLiveData();
                }
                
                this.showAlert(`Selected strike ${this.formatCurrency(option.strike)} with premium ${this.formatCurrency(option.put.last_price)}`, 'success');
            });
        });
    }
}

// Initialize the calculator when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new OptionsPremiumCalculator();
});

// Utility functions for common calculations
const OptionsUtils = {
    // Black-Scholes approximation for put option pricing
    calculateTheoreticalPutPrice(S, K, T, r, sigma) {
        // S = Current stock price
        // K = Strike price
        // T = Time to expiration (in years)
        // r = Risk-free rate
        // sigma = Volatility
        
        const d1 = (Math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * Math.sqrt(T));
        const d2 = d1 - sigma * Math.sqrt(T);
        
        const putPrice = K * Math.exp(-r * T) * this.normalCDF(-d2) - S * this.normalCDF(-d1);
        return Math.max(0, putPrice);
    },
    
    // Normal cumulative distribution function
    normalCDF(x) {
        return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
    },
    
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
    },
    
    // Calculate implied volatility (simplified)
    calculateImpliedVolatility(marketPrice, S, K, T, r) {
        let sigma = 0.2; // Initial guess
        let iterations = 0;
        const maxIterations = 100;
        const tolerance = 0.0001;
        
        while (iterations < maxIterations) {
            const price = this.calculateTheoreticalPutPrice(S, K, T, r, sigma);
            const diff = price - marketPrice;
            
            if (Math.abs(diff) < tolerance) break;
            
            // Vega (sensitivity to volatility)
            const vega = S * Math.sqrt(T) * this.normalCDF((Math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * Math.sqrt(T)));
            
            if (vega === 0) break;
            
            sigma = sigma - diff / vega;
            iterations++;
        }
        
        return Math.max(0, sigma);
    }
};