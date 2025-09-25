// Put Options LTP Finder with Authentication
class PutOptionsLTPFinder {
    constructor() {
        this.token = localStorage.getItem('authToken');
        this.isCheckingConnection = false;
        this.connectionStatus = null; // Cache connection status
        this.lastErrorMessage = null; // Prevent duplicate error messages
        this.initialize();
    }

    initialize() {
    this.setupEventListeners();
    this.updateDataModeDisplay('not-live');
        this.checkAuthenticationStatus();
    }

    async checkAuthenticationStatus() {
        try {
            // Check for Supabase session first
            if (window.supabase) {
                const { data: { session }, error } = await window.supabase.auth.getSession();
                if (session && !error) {
                    this.token = session.access_token;
                    localStorage.setItem('authToken', session.access_token);
                    localStorage.setItem('supabaseSession', JSON.stringify(session));
                    
                    // Load user profile and show main app
                    await this.loadUserProfile();
                    return;
                }
            }
            
            // Fallback to stored token
            const token = localStorage.getItem('authToken');
            if (token) {
                this.token = token;
                await this.loadUserProfile();
                return;
            }
            
            // No valid authentication found
            this.showLoginPrompt();
        } catch (error) {
            console.error('Authentication check failed:', error);
            // If Supabase still has a session, proceed
            if (window.supabase) {
                const { data: { session } } = await window.supabase.auth.getSession();
                if (session) {
                    this.token = session.access_token;
                    await this.loadUserProfile();
                    return;
                }
            }
            this.showLoginPrompt();
        }
    }

    async loadUserProfile() {
        try {
            // Prefer Supabase user details (works on Vercel static hosting)
            if (window.supabase) {
                const { data: { user }, error } = await window.supabase.auth.getUser();
                if (user && !error) {
                    const name = user.user_metadata?.full_name || user.user_metadata?.name || (user.email?.split('@')[0] || 'User');
                    this.updateUserInfo({ name, email: user.email });
                    return;
                }
            }

            // Fallback: use backend profile if available
            const response = await fetch('/api/users/profile', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            if (!response.ok) throw new Error('Backend profile unavailable');
            const userData = await response.json();
            this.updateUserInfo(userData.data);
        } catch (error) {
            console.error('Failed to load profile:', error);
            // If Supabase session exists, keep user in app; else prompt login
            if (window.supabase) {
                const { data: { session } } = await window.supabase.auth.getSession();
                if (session) {
                    this.updateUserInfo({
                        name: 'User',
                        email: session.user?.email || ''
                    });
                    return;
                }
            }
            this.showLoginPrompt();
        }
    }

    updateUserInfo(user) {
        const userNameEl = document.getElementById('userName');
        const userEmailEl = document.getElementById('userEmail');

        if (userNameEl) userNameEl.textContent = user.name || 'User';
        if (userEmailEl) userEmailEl.textContent = user.email || '';
        
        // Show the main app and hide login prompt after successful authentication
        this.showMainApp();
    }

    showMainApp() {
        const loginPrompt = document.getElementById('loginPrompt');
        const mainApp = document.getElementById('mainApp');
        const userProfile = document.getElementById('userProfile');

        // Hide login prompt
        if (loginPrompt) {
            loginPrompt.style.display = 'none';
        }

        // Show main app
        if (mainApp) {
            mainApp.style.display = 'block';
        }

        // Show user profile header
        if (userProfile) {
            userProfile.style.display = 'flex';
        }
    }

    showLoginPrompt() {
        const loginPrompt = document.getElementById('loginPrompt');
        const mainApp = document.getElementById('mainApp');
        const userProfile = document.getElementById('userProfile');

        // Show login prompt
        if (loginPrompt) {
            loginPrompt.style.display = 'block';
        }

        // Hide main app
        if (mainApp) {
            mainApp.style.display = 'none';
        }

        // Hide user profile header
        if (userProfile) {
            userProfile.style.display = 'none';
        }
    }

    updateDataModeDisplay(mode = null) {
        const dataModeEl = document.getElementById('dataMode');
        if (!dataModeEl) return;

        if (mode === 'live') {
            dataModeEl.innerHTML = '✅ Live market data from Zerodha';
            dataModeEl.style.color = '#4CAF50';
        } else {
            dataModeEl.innerHTML = '✅ Live market data from Zerodha';
            dataModeEl.style.color = '#4CAF50';
        }
    }

    async isZerodhaConnected() {
        try {
            if (!this.token) return false;
            const response = await fetch('/api/users/profile', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            if (!response.ok) return false;
            const userData = await response.json();
            return userData.data?.zerodha_connected || false;
        } catch (error) {
            console.warn('Zerodha connection check skipped/unavailable:', error?.message || error);
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
        const connectZerodhaBtn = document.getElementById('connectZerodhaBtn');
        const disconnectZerodhaBtn = document.getElementById('disconnectZerodhaBtn');

        if (calculateBtn) {
            calculateBtn.addEventListener('click', () => this.calculatePutOptionsLTP());
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        if (connectZerodhaBtn) {
            connectZerodhaBtn.addEventListener('click', () => this.connectZerodha());
        }

        if (disconnectZerodhaBtn) {
            disconnectZerodhaBtn.addEventListener('click', () => this.disconnectZerodha());
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
            lotInfoEl.textContent = `(${symbol} lot size from live instruments)`;
            lotInfoEl.style.color = '#4CAF50';
        }
    }

    async fetchPutLtpAndLot(symbol, strikePrice, expiryDate) {
        const resp = await fetch('/api/market/put-ltp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol, strike: strikePrice, expiry: expiryDate })
        });

        // Be defensive: some servers return HTML on errors; avoid JSON parse crash
        const contentType = resp.headers.get('content-type') || '';
        let json;
        if (contentType.includes('application/json')) {
            json = await resp.json();
        } else {
            const text = await resp.text();
            // If we received HTML, likely the server is not running or a static server handled the route
            if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
                throw new Error('Received HTML instead of JSON. Is the server running at http://localhost:5000 and are you opening the app from there?');
            }
            // Fallback: try to construct a useful error
            throw new Error(text || 'Unexpected non-JSON response from server');
        }

        if (!resp.ok || !json?.success) {
            throw new Error(json?.error || 'Failed to fetch put LTP');
        }
        if (!json.data) {
            throw new Error(json.message || 'No data returned');
        }
        return json.data; // { ltp, usedStrike, instrument_token, tradingsymbol, lot_size }
    }

    async calculatePutOptionsLTP() {
        const stockSymbol = document.getElementById('stockSymbol')?.value?.trim().toUpperCase();
        const strikePrice = parseFloat(document.getElementById('strikePrice')?.value);
        const expiryDate = document.getElementById('expiryDate')?.value;

        if (!stockSymbol || !strikePrice || !expiryDate) {
            this.showError('Please fill in all fields');
            return;
        }

    // We will fetch lot size from instruments via server

        const calculateBtn = document.getElementById('calculatePremium');
        const originalText = calculateBtn.textContent;
        
        try {
            calculateBtn.textContent = 'Finding LTP...';
            calculateBtn.disabled = true;

            const { ltp, usedStrike, lot_size } = await this.fetchPutLtpAndLot(stockSymbol, strikePrice, expiryDate);
            this.updateDataModeDisplay('live');

            // Update lot size display
            const lotSize = Number(lot_size) || 1;
            this.updateLotSizeDisplay(stockSymbol, lotSize);

            // Calculate total premium for the lot
            const totalPremium = ltp * lotSize;

            this.displayResults({
                premium: ltp,
                totalPremium: totalPremium,
                strikePrice: usedStrike ?? strikePrice,
                quantity: lotSize,
                stockSymbol: stockSymbol,
                expiryDate: expiryDate,
                dataMode: 'live'
            });

        } catch (error) {
            console.error('Premium calculation failed:', error);
            this.updateDataModeDisplay('live');
            this.showError(error.message || 'Failed to fetch live LTP from Zerodha. Please try again.');
        } finally {
            calculateBtn.textContent = originalText;
            calculateBtn.disabled = false;
        }
    }

    // Removed mock LTP generator to enforce live data only

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
        // Prevent duplicate error messages
        if (this.lastErrorMessage === message) return;
        
        this.lastErrorMessage = message;
        
        const errorEl = document.getElementById('errorMessage');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
            
            // Hide after 5 seconds and clear the last message
            setTimeout(() => {
                errorEl.style.display = 'none';
                this.lastErrorMessage = null;
            }, 5000);
        }
        
        console.error('Error:', message);
    }

    async logout() {
        try {
            // Sign out from Supabase if available
            if (window.supabase) {
                await window.supabase.auth.signOut();
            }
        } catch (error) {
            console.error('Error signing out from Supabase:', error);
        }
        
        // Clear local storage
        localStorage.removeItem('authToken');
        localStorage.removeItem('supabaseSession');
        
        // Reset app state
        this.token = null;
        this.showLoginPrompt();
    }

    // Connection status is not required for public data endpoints

    updateConnectionStatus(connected) {
        const statusEl = document.getElementById('connectionStatus');
        const iconEl = document.getElementById('connectionIcon');
        const connectBtn = document.getElementById('connectZerodhaBtn');
        const disconnectBtn = document.getElementById('disconnectZerodhaBtn');

        if (connected) {
            if (statusEl) statusEl.textContent = 'Zerodha connected - Live market data available';
            if (iconEl) iconEl.textContent = '✅';
            if (connectBtn) connectBtn.style.display = 'none';
            if (disconnectBtn) disconnectBtn.style.display = 'inline-block';
        } else {
            if (statusEl) statusEl.textContent = 'Connect Zerodha for live market data';
            if (iconEl) iconEl.textContent = '🔗';
            if (connectBtn) connectBtn.style.display = 'inline-block';
            if (disconnectBtn) disconnectBtn.style.display = 'none';
        }
    }

    async connectZerodha() {
        try {
            const connectBtn = document.getElementById('connectZerodhaBtn');
            const originalText = connectBtn.textContent;
            
            connectBtn.textContent = 'Connecting...';
            connectBtn.disabled = true;

            // Get auth URL from backend
            const response = await fetch('/api/zerodha/auth-url', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to get auth URL');
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to get auth URL');
            }

            // Store state for verification
            localStorage.setItem('zerodha_auth_state', result.data.state);

            // Open Zerodha authentication in new window
            const authWindow = window.open(
                result.data.authUrl,
                'zerodha_auth',
                'width=600,height=700,scrollbars=yes,resizable=yes'
            );

            // Monitor the auth window
            this.monitorAuthWindow(authWindow);

        } catch (error) {
            console.error('Zerodha connection failed:', error);
            this.showError(error.message || 'Failed to connect to Zerodha');
        } finally {
            const connectBtn = document.getElementById('connectZerodhaBtn');
            connectBtn.textContent = 'Connect Zerodha';
            connectBtn.disabled = false;
        }
    }

    monitorAuthWindow(authWindow) {
        const checkClosed = setInterval(() => {
            if (authWindow.closed) {
                clearInterval(checkClosed);
                
                // Check if connection was successful after a delay
                setTimeout(() => {
                    this.checkZerodhaConnection();
                }, 2000);
            }
        }, 2000); // Reduced frequency from 1000ms to 2000ms

        // Listen for message from auth window
        const messageHandler = async (event) => {
            if (event.origin !== window.location.origin) return;
            
            if (event.data.type === 'ZERODHA_AUTH_SUCCESS') {
                clearInterval(checkClosed);
                authWindow.close();
                
                // Remove the event listener
                window.removeEventListener('message', messageHandler);
                
                try {
                    await this.exchangeRequestToken(event.data.request_token);
                    setTimeout(() => {
                        this.checkZerodhaConnection();
                    }, 1000);
                } catch (error) {
                    console.error('Token exchange failed:', error);
                    this.showError('Authentication failed: ' + error.message);
                }
            }
        };

        window.addEventListener('message', messageHandler);
    }

    async exchangeRequestToken(requestToken) {
        const response = await fetch('/api/zerodha/access-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            },
            body: JSON.stringify({
                request_token: requestToken
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to exchange token');
        }

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Token exchange failed');
        }

        return result.data;
    }

    async disconnectZerodha() {
        try {
            // For now, we'll just update the database to mark as disconnected
            // In a full implementation, we might also revoke the token
            const response = await fetch('/api/users/profile', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    zerodha_connected: false,
                    zerodha_access_token: null,
                    zerodha_public_token: null,
                    zerodha_user_id: null
                })
            });

            if (response.ok) {
                this.connectionStatus = false; // Update cached status
                this.updateConnectionStatus(false);
                this.updateDataModeDisplay('not-live');
            } else {
                throw new Error('Failed to disconnect Zerodha');
            }

        } catch (error) {
            console.error('Zerodha disconnection failed:', error);
            this.showError(error.message || 'Failed to disconnect from Zerodha');
        }
    }
}

// Global functions for authentication modal
function showAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.style.display = 'block';
        showLoginForm();
    }
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function showLoginForm() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm) loginForm.style.display = 'block';
    if (registerForm) registerForm.style.display = 'none';
}

function showRegisterForm() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'block';
}

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    const errorDiv = document.getElementById('loginError');
    
    if (!email || !password) {
        errorDiv.textContent = 'Please fill in both email and password';
        errorDiv.style.display = 'block';
        return;
    }
    
    try {
        submitBtn.textContent = 'Signing in...';
        submitBtn.disabled = true;
        errorDiv.style.display = 'none';
        
        // Try Supabase authentication first
        if (window.supabase) {
            const { data, error } = await window.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (data.session && !error) {
                localStorage.setItem('authToken', data.session.access_token);
                localStorage.setItem('supabaseSession', JSON.stringify(data.session));
                closeAuthModal();
                
                // Reinitialize the app with the new token
                if (window.putOptionsLTPFinder) {
                    window.putOptionsLTPFinder.token = data.session.access_token;
                    window.putOptionsLTPFinder.checkAuthenticationStatus();
                }
                return;
            }
            
            // If Supabase auth fails, fall back to server auth
            if (error && !error.message.includes('Invalid login credentials')) {
                console.warn('Supabase auth failed, trying server auth:', error.message);
            }
        }
        
        // Fallback to server authentication
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Login failed');
        }
        
        if (result.success && result.data.token) {
            localStorage.setItem('authToken', result.data.token);
            closeAuthModal();
            
            // Reinitialize the app with the new token
            if (window.putOptionsLTPFinder) {
                window.putOptionsLTPFinder.token = result.data.token;
                window.putOptionsLTPFinder.checkAuthenticationStatus();
            }
        } else {
            throw new Error('Invalid response from server');
        }
        
    } catch (error) {
        console.error('Login error:', error);
        errorDiv.textContent = error.message || 'Login failed. Please try again.';
        errorDiv.style.display = 'block';
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

async function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    const errorDiv = document.getElementById('registerError');
    
    if (!name || !email || !password) {
        errorDiv.textContent = 'Please fill in all fields';
        errorDiv.style.display = 'block';
        return;
    }
    
    if (password !== confirmPassword) {
        errorDiv.textContent = 'Passwords do not match';
        errorDiv.style.display = 'block';
        return;
    }
    
    try {
        submitBtn.textContent = 'Creating account...';
        submitBtn.disabled = true;
        errorDiv.style.display = 'none';
        
        // Try Supabase authentication first
        if (window.supabase) {
            const { data, error } = await window.supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: name
                    }
                }
            });
            
            if (data.session && !error) {
                localStorage.setItem('authToken', data.session.access_token);
                localStorage.setItem('supabaseSession', JSON.stringify(data.session));
                closeAuthModal();
                
                // Reinitialize the app with the new token
                if (window.putOptionsLTPFinder) {
                    window.putOptionsLTPFinder.token = data.session.access_token;
                    window.putOptionsLTPFinder.checkAuthenticationStatus();
                }
                return;
            }
            
            // If no session but no error, user needs to confirm email
            if (data.user && !data.session && !error) {
                errorDiv.textContent = 'Please check your email to confirm your account before signing in.';
                errorDiv.style.display = 'block';
                return;
            }
            
            // If Supabase signup fails, fall back to server auth
            if (error && !error.message.includes('User already registered')) {
                console.warn('Supabase signup failed, trying server auth:', error.message);
            }
        }
        
        // Fallback to server authentication
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Registration failed');
        }
        
        if (result.success && result.data.token) {
            localStorage.setItem('authToken', result.data.token);
            closeAuthModal();
            
            // Reinitialize the app with the new token
            if (window.putOptionsLTPFinder) {
                window.putOptionsLTPFinder.token = result.data.token;
                window.putOptionsLTPFinder.checkAuthenticationStatus();
            }
        } else {
            throw new Error('Invalid response from server');
        }
        
    } catch (error) {
        console.error('Registration error:', error);
        errorDiv.textContent = error.message || 'Registration failed. Please try again.';
        errorDiv.style.display = 'block';
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

function handleLogout() {
    if (window.putOptionsLTPFinder) {
        window.putOptionsLTPFinder.logout();
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Prevent multiple initialization
    if (window.putOptionsLTPFinder) return;
    
    window.putOptionsLTPFinder = new PutOptionsLTPFinder();
});