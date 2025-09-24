# Options Premium Calculator - Setup Instructions

## Complete User Authentication System with Supabase Integration

Your Options Premium Calculator now has a complete user authentication system with secure Zerodha API integration! Here's what has been implemented:

### 🎯 What's New

#### 1. **User Authentication System**
- User registration and login with email/password
- JWT-based authentication with secure sessions
- Password hashing with bcryptjs
- User profile management

#### 2. **Zerodha Integration**
- Secure API credential handling (server-side only)
- OAuth-style authentication flow
- Encrypted token storage in database
- Automatic token refresh mechanism

#### 3. **Database Schema** 
- Complete user management system
- Secure credential storage
- Future-ready for advanced features (strategies, trade tracking)

#### 4. **Enhanced Security**
- Environment variables for sensitive data
- Row-level security policies
- JWT secret management
- CORS protection

### 🚀 Setup Instructions

#### Step 1: Set up Supabase
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once your project is ready, go to Settings → API
3. Copy your Project URL and API Keys

#### Step 2: Configure Database Schema
1. In your Supabase dashboard, go to SQL Editor
2. Copy and paste the contents of `supabase-schema.sql`
3. Click "Run" to create all the necessary tables and functions

#### Step 3: Update Environment Variables
Replace the placeholder values in your `.env` file:

```env
# Your existing Zerodha credentials (already configured)
KITE_API_KEY=9zu9u8k79p08wt6c
KITE_API_SECRET=your_actual_kite_api_secret

# Add these new Supabase configurations:
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Generate a random JWT secret (keep this secure):
JWT_SECRET=your_random_jwt_secret_here_make_it_long_and_random

# Optional: Set your app URL
APP_URL=http://localhost:5000
```

#### Step 4: Generate JWT Secret
Run this command to generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### Step 5: Start the Server
```bash
node server-auth.js
```

### 🎉 Features Overview

#### **For Users:**
1. **Create Account** - Simple registration with email and password
2. **Login/Logout** - Secure session management
3. **Connect Zerodha** - One-click Zerodha account integration
4. **Real-time Data** - Live option premium calculations
5. **Secure Storage** - All API tokens encrypted and stored safely

#### **For Developers:**
1. **JWT Authentication** - Industry-standard token-based auth
2. **RESTful API** - Clean API endpoints for all operations
3. **Database Integration** - PostgreSQL with row-level security
4. **Environment Config** - Secure credential management
5. **Error Handling** - Comprehensive error messages and logging

### 📱 User Flow

1. **First Visit**: User sees welcome screen with login/register options
2. **Registration**: User creates account with email/password
3. **Login**: User signs in and sees main calculator interface
4. **Connect Zerodha**: User clicks "Connect Zerodha" → redirected to Zerodha → returns with connected account
5. **Calculate Premiums**: User can now calculate premiums with real-time data
6. **Session Management**: User stays logged in across browser sessions

### 🔐 Security Features

- ✅ **Server-side API Secret**: Zerodha credentials never exposed to frontend
- ✅ **Encrypted Storage**: Access tokens encrypted before database storage
- ✅ **JWT Sessions**: Secure, stateless authentication
- ✅ **CORS Protection**: API endpoints protected from cross-origin attacks
- ✅ **Row-level Security**: Users can only access their own data
- ✅ **Password Hashing**: Bcrypt with salt for password security

### 🗂️ File Structure

```
options-premium-calculator/
├── server-auth.js           # Main authentication server
├── supabase-schema.sql      # Database schema
├── .env                     # Environment variables
├── package.json             # Dependencies
└── public/                  # Frontend files
    ├── index.html           # Main page with auth
    ├── auth.js              # Authentication logic
    ├── script.js            # Options calculator
    ├── styles.css           # Styling with auth UI
    ├── zerodha-callback.html # Zerodha auth callback
    └── auth-error.html      # Error handling page
```

### 🎯 Next Steps

Once you've completed the setup:

1. **Test Registration**: Create a new user account
2. **Test Login**: Sign in with your credentials  
3. **Connect Zerodha**: Link your Zerodha account for real data
4. **Calculate Premiums**: Use the calculator with live market data

### 🆘 Troubleshooting

- **Supabase Errors**: Check your Supabase URL and API keys in .env
- **JWT Errors**: Ensure JWT_SECRET is set and secure
- **Database Errors**: Verify schema was created successfully
- **Zerodha Errors**: Check KITE_API_SECRET is correct

The system is production-ready with proper security, error handling, and user experience! 🚀