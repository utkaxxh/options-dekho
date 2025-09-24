// Options Premium Calculator JavaScript - Simplified Version

class OptionsPremiumCalculator {
    constructor() {
        this.formContainer = document.querySelector('.calculator-section');
        this.resultsSection = document.getElementById('resultsSection');
        this.kiteAPI = new KiteAPIIntegration();
        
        this.initializeEventListeners();
        this.setDefaultExpiryDate();
        this.checkKiteLoginStatus();
    }

    initializeEventListeners() {
        this.calculatePremiumBtn = document.getElementById('calculatePremium');
        this.calculatePremiumBtn.addEventListener('click', () => this.calculatePremium());
        
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
    }

    async calculatePremium() {
        if (!this.validateInputs()) {
            return;
        }

        const formData = this.getFormData();
        this.updateCalculateButton(true);

        try {
            // Get current stock price
            const ltpData = await this.kiteAPI.getLTP([`${formData.exchange || 'NSE'}:${formData.stockSymbol}`]);
            const currentPrice = ltpData[`${formData.exchange || 'NSE'}:${formData.stockSymbol}`]?.last_price || 100;
            
            // Calculate theoretical premium using Black-Scholes
            const premium = this.calculateTheoreticalPutPremium(
                currentPrice,
                formData.strikePrice,
                formData.expiryDate,
                formData.numberOfLots,
                formData.lotSize
            );

            this.displayPremiumResult(premium, formData, currentPrice);
            this.showResults();
            
        } catch (error) {
            console.error('Error calculating premium:', error);
            
            // Fallback to estimated calculation
            const estimatedPrice = this.getEstimatedPrice(formData.stockSymbol);
            const premium = this.calculateTheoreticalPutPremium(
                estimatedPrice,
                formData.strikePrice,
                formData.expiryDate,
                formData.numberOfLots,
                formData.lotSize
            );

            this.displayPremiumResult(premium, formData, estimatedPrice);
            this.showResults();
            
        } finally {
            this.updateCalculateButton(false);
        }
    }

    getFormData() {
        return {
            stockSymbol: document.getElementById('stockSymbol').value.trim().toUpperCase(),
            strikePrice: parseFloat(document.getElementById('strikePrice').value),
            lotSize: parseInt(document.getElementById('lotSize').value),
            expiryDate: new Date(document.getElementById('expiryDate').value),
            numberOfLots: parseInt(document.getElementById('numberOfLots').value),
            exchange: 'NSE' // Default to NSE
        };
    }

    calculateTheoreticalPutPremium(currentPrice, strikePrice, expiryDate, numberOfLots, lotSize) {
        const today = new Date();
        const timeToExpiry = (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 365); // in years
        
        if (timeToExpiry <= 0) {
            // Option has expired
            return {
                premiumPerShare: Math.max(0, strikePrice - currentPrice),
                totalPremium: Math.max(0, strikePrice - currentPrice) * numberOfLots * lotSize
            };
        }
        
        // Black-Scholes parameters
        const riskFreeRate = 0.06; // 6% risk-free rate
        const volatility = 0.25; // 25% implied volatility
        
        // Calculate put option premium using Black-Scholes
        const d1 = (Math.log(currentPrice / strikePrice) + (riskFreeRate + 0.5 * Math.pow(volatility, 2)) * timeToExpiry) 
                   / (volatility * Math.sqrt(timeToExpiry));
        const d2 = d1 - volatility * Math.sqrt(timeToExpiry);
        
        const putPrice = strikePrice * Math.exp(-riskFreeRate * timeToExpiry) * this.normalCDF(-d2) 
                        - currentPrice * this.normalCDF(-d1);
        
        const premiumPerShare = Math.max(0.05, putPrice); // Minimum 5 paisa
        const totalPremium = premiumPerShare * numberOfLots * lotSize;
        
        return {
            premiumPerShare,
            totalPremium,
            currentPrice,
            timeToExpiry: Math.ceil(timeToExpiry * 365) // days
        };
    }

    normalCDF(x) {
        return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
    }

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

    getEstimatedPrice(symbol) {
        const prices = {
            'NYKAA': 237.71,
            'TCS': 3062.40,
            'RELIANCE': 2847.50,
            'INFY': 1500,
            'HDFCBANK': 1600,
            'ICICIBANK': 1200,
            'SBIN': 750,
            'BHARTIARTL': 1200
        };
        return prices[symbol] || 500;
    }

    displayPremiumResult(premium, formData, currentPrice) {
        document.getElementById('totalPremium').textContent = this.formatCurrency(premium.totalPremium);
        
        const detailsText = `
            ${formData.stockSymbol} PUT @ ₹${formData.strikePrice} • Expiry: ${formData.expiryDate.toLocaleDateString()} 
            • Premium per share: ₹${premium.premiumPerShare.toFixed(2)} 
            • Total lots: ${formData.numberOfLots} (${formData.numberOfLots * formData.lotSize} shares)
            • Current Price: ₹${currentPrice.toFixed(2)}
        `;
        
        document.getElementById('premiumDetails').textContent = detailsText.replace(/\s+/g, ' ').trim();
    }

    updateCalculateButton(isLoading) {
        const btn = this.calculatePremiumBtn;
        if (isLoading) {
            btn.innerHTML = '<span class="loading"></span> Calculating...';
            btn.disabled = true;
        } else {
            btn.innerHTML = 'Calculate Premium';
            btn.disabled = false;
        }
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
        const dataModeElement = document.getElementById('dataMode');
        
        try {
            await this.kiteAPI.checkLoginStatus();
            this.showAlert('Connected to Kite API successfully! Live data enabled.', 'success');
            if (dataModeElement) {
                dataModeElement.textContent = 'Live Zerodha data active via MCP extension';
            }
        } catch (error) {
            console.log('Using simulated data mode:', error.message);
            
            const isMCPEnvironment = typeof window.vscode !== 'undefined' || 
                                   (typeof window.parent !== 'undefined' && window.parent !== window);
            
            if (isMCPEnvironment) {
                this.showAlert('MCP Environment detected. Please authenticate with Zerodha for live data.', 'warning');
                if (dataModeElement) {
                    dataModeElement.innerHTML = 'VS Code detected - <a href="#" onclick="alert(\'Please run MCP Kite login command\')">Connect to Zerodha</a>';
                }
            } else {
                this.showAlert('Demo Mode: Using realistic simulated data for demonstration.', 'success');
                if (dataModeElement) {
                    dataModeElement.textContent = 'Browser demo with simulated data - fully functional for testing';
                }
            }
        }
    }
}

// Initialize the calculator when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new OptionsPremiumCalculator();
});