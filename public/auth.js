// Authentication JavaScript for Options Premium Calculator

class AuthManager {
    constructor() {
        this.baseURL = window.location.origin;
        this.authToken = localStorage.getItem('authToken');
        this.userInfo = this.getUserInfo();
        this.init();
    }

    init() {
        // Check authentication status on page load
        this.checkAuthStatus();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Update UI based on auth status
        this.updateUI();

        // Check Supabase session if available
        this.checkSupabaseAuth();
    }

    async checkSupabaseAuth() {
        try {
            const supabaseSession = localStorage.getItem('supabaseSession');
            if (supabaseSession) {
                const session = JSON.parse(supabaseSession);
                if (session && session.user) {
                    // User has valid Supabase session
                    if (!this.authToken) {
                        // Set user info from Supabase session
                        this.userInfo = {
                            name: session.user.user_metadata?.full_name || session.user.email,
                            email: session.user.email,
                            zerodha_connected: false // We'll check this separately
                        };
                        this.authToken = session.access_token;
                        
                        // Check if user has Zerodha connected
                        await this.checkZerodhaStatus();
                        
                        // Update UI
                        this.checkAuthStatus();
                        this.updateUI();
                    }
                }
            }

            // Check if returning from Zerodha authentication
            this.handleZerodhaReturn();
        } catch (error) {
            console.warn('Supabase auth check failed:', error);
        }
    }

    handleZerodhaReturn() {
        const urlParams = new URLSearchParams(window.location.search);
        const zerodhaReturn = localStorage.getItem('zerodhaReturn');
        
        if (zerodhaReturn === 'true' || urlParams.get('zerodha') === 'connected') {
            localStorage.removeItem('zerodhaReturn');
            
            // Clear URL parameters
            if (urlParams.get('zerodha')) {
                window.history.replaceState({}, document.title, window.location.pathname);
            }

            // Refresh Zerodha status
            setTimeout(async () => {
                await this.checkZerodhaStatus();
                this.updateUI();
                
                if (this.userInfo.zerodha_connected) {
                    this.showSuccess('✅ Zerodha connected successfully! You can now use real-time data.');
                }
            }, 1000);
        }
    }

    async checkZerodhaStatus() {
        try {
            // Check if user has Zerodha connected via backend
            const response = await fetch(`${this.baseURL}/api/user/profile`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data.zerodha_connected) {
                    this.userInfo.zerodha_connected = true;
                }
            }
        } catch (error) {
            console.warn('Could not check Zerodha status:', error);
        }
    }

    setupEventListeners() {
        // Close modal when clicking outside
        window.onclick = (event) => {
            const modal = document.getElementById('authModal');
            if (event.target === modal) {
                this.closeAuthModal();
            }
        };

        // Handle form submissions
        document.addEventListener('submit', (event) => {
            if (event.target.closest('#loginForm')) {
                this.handleLogin(event);
            } else if (event.target.closest('#registerForm')) {
                this.handleRegister(event);
            }
        });
    }

    checkAuthStatus() {
        if (this.authToken && this.userInfo) {
            this.showMainApp();
        } else {
            this.showLoginPrompt();
        }
    }

    updateUI() {
        if (this.authToken && this.userInfo) {
            // Update user profile
            document.getElementById('userName').textContent = this.userInfo.name;
            document.getElementById('userEmail').textContent = this.userInfo.email;
            
            // Update Zerodha button
            const zerodhaBtn = document.getElementById('zerodhaBtn');
            if (this.userInfo.zerodha_connected) {
                zerodhaBtn.textContent = '✅ Zerodha Connected';
                zerodhaBtn.classList.add('connected');
                zerodhaBtn.onclick = () => this.handleZerodhaDisconnect();
            } else {
                zerodhaBtn.textContent = 'Connect Zerodha';
                zerodhaBtn.classList.remove('connected');
                zerodhaBtn.onclick = () => this.handleZerodhaConnection();
            }
        }
    }

    getUserInfo() {
        const userInfo = localStorage.getItem('userInfo');
        return userInfo ? JSON.parse(userInfo) : null;
    }

    showAuthModal() {
        document.getElementById('authModal').style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    closeAuthModal() {
        document.getElementById('authModal').style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    showLoginForm() {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('registerForm').style.display = 'none';
    }

    showRegisterForm() {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'block';
    }

    showLoginPrompt() {
        document.getElementById('loginPrompt').style.display = 'block';
        document.getElementById('userProfile').style.display = 'none';
        document.getElementById('mainApp').style.display = 'none';
    }

    showMainApp() {
        document.getElementById('loginPrompt').style.display = 'none';
        document.getElementById('userProfile').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'block';
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const submitBtn = event.target.querySelector('button[type="submit"]');
        
        if (!email || !password) {
            this.showError('Please fill in all fields');
            return;
        }

        try {
            submitBtn.textContent = 'Signing in...';
            submitBtn.disabled = true;

            const response = await fetch(`${this.baseURL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Login failed');
            }

            // Store authentication data
            this.authToken = result.data.token;
            this.userInfo = result.data.user;
            
            localStorage.setItem('authToken', this.authToken);
            localStorage.setItem('userInfo', JSON.stringify(this.userInfo));

            // Show success message
            this.showSuccess('Login successful! Welcome back.');

            // Close modal and update UI
            setTimeout(() => {
                this.closeAuthModal();
                this.updateUI();
                this.showMainApp();
            }, 1000);

        } catch (error) {
            console.error('Login failed:', error);
            this.showError(error.message || 'Login failed. Please try again.');
        } finally {
            submitBtn.textContent = 'Sign In';
            submitBtn.disabled = false;
        }
    }

    async handleRegister(event) {
        event.preventDefault();
        
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const submitBtn = event.target.querySelector('button[type="submit"]');
        
        if (!name || !email || !password || !confirmPassword) {
            this.showError('Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            this.showError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            this.showError('Password must be at least 6 characters long');
            return;
        }

        try {
            submitBtn.textContent = 'Creating account...';
            submitBtn.disabled = true;

            const response = await fetch(`${this.baseURL}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, password })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Registration failed');
            }

            // Store authentication data
            this.authToken = result.data.token;
            this.userInfo = result.data.user;
            
            localStorage.setItem('authToken', this.authToken);
            localStorage.setItem('userInfo', JSON.stringify(this.userInfo));

            // Show success message
            this.showSuccess('Account created successfully! Welcome to Options Premium Calculator.');

            // Close modal and update UI
            setTimeout(() => {
                this.closeAuthModal();
                this.updateUI();
                this.showMainApp();
            }, 1000);

        } catch (error) {
            console.error('Registration failed:', error);
            this.showError(error.message || 'Registration failed. Please try again.');
        } finally {
            submitBtn.textContent = 'Create Account';
            submitBtn.disabled = false;
        }
    }

    async handleZerodhaConnection() {
        if (!this.authToken) {
            this.showError('Please log in first');
            return;
        }

        try {
            // Update button to show loading
            const zerodhaBtn = document.getElementById('zerodhaBtn');
            zerodhaBtn.textContent = '🔄 Connecting...';
            zerodhaBtn.disabled = true;

            // Get Zerodha auth URL
            const response = await fetch(`${this.baseURL}/api/zerodha/auth-url`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to get authentication URL');
            }

            // Show info message
            this.showInfo('Redirecting to Zerodha for authentication...');
            
            // Store return URL
            localStorage.setItem('zerodhaReturn', 'true');
            
            // Redirect to Zerodha
            setTimeout(() => {
                window.location.href = result.data.authUrl;
            }, 1500);

        } catch (error) {
            console.error('Zerodha connection failed:', error);
            this.showError(error.message || 'Failed to connect to Zerodha');
            
            // Reset button
            const zerodhaBtn = document.getElementById('zerodhaBtn');
            zerodhaBtn.textContent = 'Connect Zerodha';
            zerodhaBtn.disabled = false;
        }
    }

    async handleZerodhaDisconnect() {
        if (!this.authToken) {
            this.showError('Please log in first');
            return;
        }

        if (!confirm('Are you sure you want to disconnect your Zerodha account?')) {
            return;
        }

        try {
            const zerodhaBtn = document.getElementById('zerodhaBtn');
            zerodhaBtn.textContent = '🔄 Disconnecting...';
            zerodhaBtn.disabled = true;

            const response = await fetch(`${this.baseURL}/api/zerodha/disconnect`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to disconnect');
            }

            // Update user info
            this.userInfo.zerodha_connected = false;
            localStorage.setItem('userInfo', JSON.stringify(this.userInfo));

            // Update UI
            this.updateUI();
            this.showSuccess('Zerodha account disconnected successfully');

        } catch (error) {
            console.error('Zerodha disconnect failed:', error);
            this.showError(error.message || 'Failed to disconnect Zerodha');
            
            // Reset button
            this.updateUI();
        }
    }

    async handleZerodhaDisconnect() {
        if (!confirm('Are you sure you want to disconnect your Zerodha account?')) {
            return;
        }

        try {
            const response = await fetch(`${this.baseURL}/api/zerodha/disconnect`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to disconnect');
            }

            // Update user info
            this.userInfo.zerodha_connected = false;
            localStorage.setItem('userInfo', JSON.stringify(this.userInfo));

            this.showSuccess('Zerodha account disconnected successfully');
            this.updateUI();

        } catch (error) {
            console.error('Zerodha disconnect failed:', error);
            this.showError(error.message || 'Failed to disconnect Zerodha');
        }
    }

    async handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            try {
                // Clear local storage
                localStorage.removeItem('authToken');
                localStorage.removeItem('userInfo');
                localStorage.removeItem('supabaseSession');
                localStorage.removeItem('zerodhaReturn');
                
                // Reset state
                this.authToken = null;
                this.userInfo = null;
                
                // Sign out from Supabase if available
                if (typeof window.supabase !== 'undefined') {
                    await window.supabase.auth.signOut();
                }
                
                // Update UI
                this.showLoginPrompt();
                
                this.showSuccess('Logged out successfully');
            } catch (error) {
                console.warn('Logout error:', error);
                // Still proceed with logout even if Supabase signout fails
                this.showLoginPrompt();
                this.showSuccess('Logged out successfully');
            }
        }
    }

    // Utility methods for showing messages
    showError(message) {
        this.showMessage(message, 'error');
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showInfo(message) {
        this.showMessage(message, 'info');
    }

    showMessage(message, type = 'info') {
        // Remove existing messages
        const existingMessage = document.querySelector('.toast-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create message element
        const messageEl = document.createElement('div');
        messageEl.className = `toast-message ${type}`;
        messageEl.innerHTML = `
            <span class="message-text">${message}</span>
            <button class="message-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        // Add to page
        document.body.appendChild(messageEl);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (messageEl.parentElement) {
                messageEl.remove();
            }
        }, 5000);
    }

    // Method to make authenticated API calls
    async makeAuthenticatedRequest(url, options = {}) {
        if (!this.authToken) {
            throw new Error('Authentication required');
        }

        const defaultOptions = {
            headers: {
                'Authorization': `Bearer ${this.authToken}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        const response = await fetch(url, { ...options, ...defaultOptions });
        
        if (response.status === 401) {
            // Token expired, logout user
            this.handleLogout();
            throw new Error('Session expired. Please log in again.');
        }

        return response;
    }
}

// Initialize authentication manager
const authManager = new AuthManager();

// Export functions for global access (for onclick handlers)
window.showAuthModal = () => authManager.showAuthModal();
window.closeAuthModal = () => authManager.closeAuthModal();
window.showLoginForm = () => authManager.showLoginForm();
window.showRegisterForm = () => authManager.showRegisterForm();
window.handleLogin = (event) => authManager.handleLogin(event);
window.handleRegister = (event) => authManager.handleRegister(event);
window.handleZerodhaConnection = () => authManager.handleZerodhaConnection();
window.handleLogout = () => authManager.handleLogout();

// Export auth manager for use in other scripts
window.authManager = authManager;