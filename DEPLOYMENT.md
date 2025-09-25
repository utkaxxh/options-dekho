# Put LTP Finder - Deployment

## Vercel Deployment

This app is configured to deploy on Vercel with minimal setup.

### Environment Variables Required:

Set these in your Vercel dashboard:

1. `KITE_API_KEY` - Your Zerodha Kite API key
2. `KITE_ACCESS_TOKEN` - Your daily access token (needs daily refresh)

### Auto Deployment:

- Push to `main` branch automatically deploys
- Vercel will run the Node.js server
- API endpoints available at your Vercel URL

### Manual Token Refresh:

Since Kite access tokens expire daily, you'll need to:
1. Generate new access token daily
2. Update `KITE_ACCESS_TOKEN` in Vercel environment variables
3. Redeploy or wait for next deployment

### Local Development:

```bash
npm install
npm start
# Visit http://localhost:5000
```