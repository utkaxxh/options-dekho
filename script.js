// Options Premium Calculator JavaScript

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
            { id: 'quantity', message: 'Quantity must be greater than 0' },
            { id: 'expiryDate', message: 'Expiry date is required' }
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

    async calculatePremium() {
        if (!this.validateInputs()) {
            return;
        }

        const formData = this.getFormData();
        this.updateCalculateButton(true);

        try {
            // Get current stock price from API
            const ltpData = await this.kiteAPI.getLTP([`${formData.exchange || 'NSE'}:${formData.stockSymbol}`]);
            const currentPrice = ltpData[`${formData.exchange || 'NSE'}:${formData.stockSymbol}`]?.last_price;
            
            if (!currentPrice) {
                throw new Error('Could not fetch current price');
            }
            
            // Calculate theoretical premium using Black-Scholes
            const premium = this.calculateTheoreticalPutPremium(
                currentPrice,
                formData.strikePrice,
                formData.expiryDate,
                formData.quantity
            );

            this.displayPremiumResult(premium, formData, currentPrice);
            this.showResults();
            
        } catch (error) {
            console.error('Error fetching real-time data:', error);
            this.showAlert('Could not fetch real-time data. Please check the stock symbol or try again.', 'error');
            
        } finally {
            this.updateCalculateButton(false);
        }
    }

    getFormData() {
        return {
            stockSymbol: document.getElementById('stockSymbol').value.trim().toUpperCase(),
            strikePrice: parseFloat(document.getElementById('strikePrice').value),
            quantity: parseInt(document.getElementById('quantity').value),
            expiryDate: new Date(document.getElementById('expiryDate').value),
            exchange: 'NSE' // Default to NSE
        };
    }

    calculateTheoreticalPutPremium(currentPrice, strikePrice, expiryDate, quantity) {
        const today = new Date();
        const timeToExpiry = (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 365); // in years
        
        if (timeToExpiry <= 0) {
            // Option has expired
            return {
                premiumPerShare: Math.max(0, strikePrice - currentPrice),
                totalPremium: Math.max(0, strikePrice - currentPrice) * quantity
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
        const totalPremium = premiumPerShare * quantity;
        
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

    displayPremiumResult(premium, formData, currentPrice) {
        document.getElementById('totalPremium').textContent = this.formatCurrency(premium.totalPremium);
        
        const detailsText = `
            ${formData.stockSymbol} PUT @ ₹${formData.strikePrice} • Expiry: ${formData.expiryDate.toLocaleDateString()} 
            • Premium per share: ₹${premium.premiumPerShare.toFixed(2)} 
            • Quantity: ${formData.quantity} shares
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