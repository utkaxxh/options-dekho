# Options Premium Calculator

A comprehensive web application for calculating premium earned from selling put options in the Indian stock market, with integration to Zerodha Kite API for real-time data.

## Features

### Core Functionality
- **Premium Calculation**: Calculate total premium earned from selling put options
- **Risk Analysis**: Display maximum profit, loss, and breakeven points
- **Margin Requirements**: Estimate margin required for the strategy
- **Return Analysis**: Calculate return on margin and daily premium
- **Real-time Data**: Fetch live options chain data from Zerodha Kite API

### User Interface
- Clean, responsive design with gradient backgrounds
- Real-time form validation
- Interactive options chain with clickable rows
- Professional card-based results display
- Mobile-friendly responsive layout

### Technical Features
- **Black-Scholes Integration**: Theoretical option pricing calculations
- **API Integration**: Zerodha Kite API for live market data
- **Form Validation**: Comprehensive input validation
- **Error Handling**: Graceful error handling with user notifications
- **Auto-fill**: Click options chain rows to auto-populate form

## Files Structure

```
options-premium-calculator/
├── index.html          # Main HTML structure
├── styles.css          # CSS styling and responsive design
├── script.js           # Core JavaScript functionality
├── kite-api.js        # Zerodha Kite API integration
└── README.md          # This documentation file
```

## Usage

1. **Open the Application**: Open `index.html` in a web browser
2. **Enter Stock Details**:
   - Stock Symbol (e.g., RELIANCE, TCS)
   - Strike Price for the put option
   - Lot Size of the stock
   - Expiry Date (defaults to next Thursday)
   - Premium per Share
   - Number of Lots to sell

3. **Calculate Premium**: Click "Calculate Premium" to see results
4. **Fetch Live Data**: Click "Fetch Live Data" to get real-time options chain
5. **Interactive Selection**: Click any row in the options chain to auto-fill strike and premium

## Results Display

The calculator shows:
- **Total Premium Earned**: Complete premium received
- **Total Shares**: Number of shares covered
- **Days to Expiry**: Time remaining until expiration
- **Daily Premium**: Premium earned per day
- **Margin Required**: Estimated margin for the position
- **Return on Margin**: Percentage return on invested margin
- **Strategy Details**: Max profit, max loss, breakeven point, risk level

## API Integration

### Zerodha Kite API Features
- Real-time options chain data
- Current market prices
- Strike price and premium data
- Open Interest information
- Theoretical pricing using Black-Scholes model

### Setup for Live Data
1. Ensure you have a Zerodha Kite API account
2. The application will prompt for login when fetching live data
3. Follow the authentication flow to connect your account

## Technical Implementation

### JavaScript Classes
- `OptionsPremiumCalculator`: Main application logic
- `KiteAPIIntegration`: API connectivity and data fetching
- `OptionsUtils`: Utility functions for option pricing calculations

### Key Calculations
- Premium calculation: `Lot Size × Number of Lots × Premium per Share`
- Margin estimation: Approximately 18% of strike value
- Return on margin: `(Total Premium / Margin Required) × 100`
- Breakeven: `Strike Price - Premium per Share`

### Validation Rules
- All fields are required and must be positive numbers
- Expiry date cannot be in the past
- Stock symbol must be provided for live data fetching

## Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile responsive design
- ES6+ JavaScript features

## Future Enhancements
- Historical data analysis
- Portfolio-level calculations
- Risk management tools
- Advanced option strategies
- Performance tracking
- Export functionality

## Security Notes
- API keys should be properly secured in production
- User authentication should be implemented for live trading
- All API calls should be properly validated

## Getting Started

1. Download or clone all files to a local directory
2. Open `index.html` in a web browser
3. Start by entering sample data or connect to Kite API for live data
4. Explore the different features and calculations

## Support

For issues or questions:
- Check browser console for any JavaScript errors
- Ensure all files are in the same directory
- Verify internet connection for live data features
- Check Zerodha Kite API documentation for authentication issues