# Put LTP - Real-time Put Option Tracker

A full-stack web application for tracking real-time Put Option Last Traded Price (LTP) using Zerodha's Kite API.

## Features

- Supabase Auth (email/password)
- Automated Kite authentication in a popup; parent window stays authenticated and popup closes automatically
- Real-time Put Option prices updated every 10 seconds
- Trading symbol builder (symbol + YY + MMM + STRIKE + PE)
- Market depth (best bid/ask with quantities)
- Expiry date UX: dropdown with the last Tuesday of current, next, and following months
- Resilient token lifecycle: stored in Supabase with daily expiry handling

## Technology Stack

- Frontend: Next.js 15 (App Router) + TypeScript + React 18
- Styling: Tailwind CSS
- Authentication: Supabase Auth (singleton client)
- Broker API: Zerodha Kite (OAuth v3 + Quote)
- Updates: Client-side polling

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- Zerodha Kite Connect API credentials
- Supabase account and project

### 2. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd put-ltp

# Install dependencies
npm install
```

### 3. Environment Configuration

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
KITE_API_KEY=your_kite_api_key
KITE_API_SECRET=your_kite_api_secret
```

### 4. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Get your project URL and anonymous key from the API settings
3. Update the `.env.local` file with your Supabase credentials

#### Create the Token Storage Table

In your Supabase SQL Editor, run this query to create the token storage table:

```sql
-- Create user_kite_tokens table
CREATE TABLE user_kite_tokens (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  UNIQUE(user_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE user_kite_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy so users can only access their own tokens
CREATE POLICY "Users can only access their own tokens" ON user_kite_tokens
  FOR ALL USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_user_kite_tokens_user_id ON user_kite_tokens(user_id);
CREATE INDEX idx_user_kite_tokens_expires_at ON user_kite_tokens(expires_at);
```

### 5. Kite API Setup

1. Register at [Kite Connect](https://kite.trade/docs/connect/v3/)
2. Create a new app to get API Key and API Secret
3. Set the Redirect URL to your deployment origin with path /kite-callback
   - Local: http://localhost:3000/kite-callback
   - Vercel: https://<your-domain>/kite-callback
4. Add API Key and Secret to environment variables (see above)

### 6. Run the Application

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

Visit `http://localhost:3000` to access the application.

## Deployment on Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/utkaxxh/options-dekho.git
git push -u origin main
```

### 2. Deploy on Vercel

1. Visit [vercel.com](https://vercel.com) and sign in with GitHub
2. Import your repository: `https://github.com/utkaxxh/options-dekho`
3. Configure environment variables in Vercel dashboard:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - KITE_API_KEY
   - KITE_API_SECRET
4. Deploy the application

The app will be live at your Vercel URL (e.g., `https://options-dekho.vercel.app`)

## Environment Variables

Create a `.env.local` file with the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
KITE_API_KEY=your_kite_api_key
KITE_API_SECRET=your_kite_api_secret
```

## Usage

1. Sign Up/Login: Create an account or login using your email
2. Configure Kite API: Add KITE_API_KEY and KITE_API_SECRET to environment variables
3. Authenticate: Click “Connect Kite”; a popup will handle login and close automatically
4. Track Options: Enter stock symbol, strike price, and expiry date (choose from the last-Tuesday dropdown)
5. View Real-time Data: See live LTP, bid/ask prices, and more

## Trading Symbol Format

The app automatically generates trading symbols using this format:
- SYMBOL + YY + MMM + STRIKE + PE
- Example: RELIANCE24OCT3000PE for RELIANCE Oct 2024 3000 Put

## API Endpoints

- POST /api/kite/login-url — Returns a Kite login URL using the correct origin and /kite-callback redirect
- POST /api/kite/token — Exchanges request_token for access_token and stores it (per-user) in Supabase
- GET /api/kite/token-status — Returns hasValidToken, expiringSoon, and accessToken (when valid)
- DELETE /api/kite/token-status — Deletes the stored token for the current user
- GET /api/kite/quote — Fetches real-time option quotes (validates input, has timeouts, maps errors)

## Important Notes

- Market Hours: Kite APIs are mostly useful during market hours
- Rate Limits: Be mindful of Kite API rate limits when using auto-refresh
- Token Expiry: Access tokens expire daily; the app will prompt re-auth when needed
- Redirect URL: The configured redirect in Kite developer console must exactly match your deployed /kite-callback URL (protocol + host + path)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.

## Disclaimer

This application is for educational and informational purposes only. It is not intended as financial advice. Always consult with qualified financial advisors before making trading decisions.