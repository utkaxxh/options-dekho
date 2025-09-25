# Put LTP - Real-time Put Option Tracker

A full-stack web application for tracking real-time Put Option Last Traded Price (LTP) using Zerodha's Kite API.

## Features

- **User Authentication**: Secure login/signup using Supabase Auth
- **Real-time Data**: Live Put Option prices updated every 10 seconds
- **Dynamic Symbol Generation**: Automatic trading symbol construction from user input
- **Market Depth**: Display bid/ask prices with quantities
- **Auto-refresh**: Configurable automatic data updates
- **Responsive Design**: Works on desktop and mobile devices

## Technology Stack

- **Frontend**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Supabase Auth
- **API Integration**: Zerodha Kite API
- **Real-time Updates**: Client-side polling

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
```

### 4. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Get your project URL and anonymous key from the API settings
3. Update the `.env.local` file with your Supabase credentials

### 5. Kite API Setup

1. Register at [Kite Connect](https://kite.trade/docs/connect/v3/)
2. Create a new app to get API Key and API Secret
3. You'll enter these credentials in the app interface

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
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` 
   - `KITE_API_KEY`
   - `KITE_API_SECRET`
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

1. **Sign Up/Login**: Create an account or login using your email
2. **Configure Kite API**: Enter your Kite API Key and Secret
3. **Authenticate**: Complete Kite login to get request token
4. **Track Options**: Enter stock symbol, strike price, and expiry date
5. **View Real-time Data**: See live LTP, bid/ask prices, volume, and OI

## Trading Symbol Format

The app automatically generates trading symbols using this format:
- `SYMBOL + YY + MMM + STRIKE + PE`
- Example: `RELIANCE24OCT3000PE` for RELIANCE Oct 2024 3000 Put

## API Endpoints

- `POST /api/kite/token` - Generate access token from request token
- `GET /api/kite/quote` - Fetch real-time option quotes

## Important Notes

- **Market Hours**: Kite API only provides data during market hours
- **Rate Limits**: Be mindful of API rate limits when using auto-refresh
- **Token Expiry**: Access tokens expire daily and need regeneration
- **Paper Trading**: This is for informational purposes only

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.

## Disclaimer

This application is for educational and informational purposes only. It is not intended as financial advice. Always consult with qualified financial advisors before making trading decisions.