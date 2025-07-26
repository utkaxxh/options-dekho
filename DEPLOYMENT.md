# Vercel Deployment Guide 🚀

This guide will help you deploy the Indian Options Premium Tracker to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Git Repository**: Push your code to GitHub, GitLab, or Bitbucket
3. **Vercel CLI** (optional): `npm i -g vercel`

## Deployment Methods

### Method 1: GitHub Integration (Recommended)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect the framework (Vite)

3. **Configure Build Settings**
   - **Build Command**: `npm run vercel-build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy your app
   - You'll get a live URL like `https://your-project.vercel.app`

### Method 2: Vercel CLI

1. **Install CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```

4. **Follow prompts**
   - Set up and deploy: Yes
   - Which scope: Select your account
   - Link to existing project: No
   - Project name: options-realtime (or your choice)
   - Directory: `./` (current directory)

## Project Structure for Vercel

```
options-realtime/
├── api/                     # Serverless API functions
│   ├── stocks.ts           # GET /api/stocks
│   ├── options.ts          # GET /api/options?symbol=RELIANCE
│   └── tsconfig.json       # TypeScript config for API
├── src/                    # React frontend
├── dist/                   # Built frontend (auto-generated)
├── vercel.json             # Vercel configuration
├── .vercelignore           # Files to ignore during deployment
└── package.json            # Dependencies and scripts
```

## Key Changes for Vercel

### 1. Serverless API Functions
- Moved from Express server to Vercel serverless functions
- API endpoints: `/api/stocks` and `/api/options`
- No WebSocket support (using polling instead)

### 2. Frontend Adaptations
- Environment-aware API calls
- Polling instead of WebSocket for real-time updates
- CORS handling in serverless functions

### 3. Build Configuration
- `vercel.json` for routing and build settings
- `vercel-build` script in package.json
- TypeScript compilation for API functions

## Environment Variables

If you need to add environment variables:

1. **Local Development**
   ```bash
   # Create .env.local
   VITE_API_BASE_URL=http://localhost:3001
   ```

2. **Vercel Dashboard**
   - Go to Project Settings → Environment Variables
   - Add your variables for Production/Preview/Development

## Custom Domain (Optional)

1. **Add Domain**
   - Go to Project Settings → Domains
   - Add your custom domain
   - Follow DNS configuration instructions

2. **SSL Certificate**
   - Automatically provided by Vercel
   - HTTPS enforced by default

## Monitoring and Logs

1. **Function Logs**
   - Go to Project Dashboard → Functions
   - View real-time logs and performance metrics

2. **Analytics**
   - Available in Vercel Pro plans
   - Track usage, performance, and errors

## Troubleshooting

### Build Failures
```bash
# Check build locally
npm run build

# Check API functions
cd api && npx tsc --noEmit
```

### API Issues
- Check function logs in Vercel dashboard
- Verify CORS headers in API responses
- Test API endpoints after deployment

### Performance
- Serverless functions have cold start delays
- Consider upgrading to Vercel Pro for better performance
- Use Edge Functions for lower latency (if needed)

## Limitations

1. **WebSocket**: Not supported in Vercel serverless functions
   - Solution: Using HTTP polling (5-second intervals)
   
2. **Function Timeout**: 10 seconds for Hobby plan, 15s for Pro
   - Current API functions are well within limits
   
3. **Cold Starts**: Functions may take longer on first request
   - Acceptable for this use case

## Next Steps

1. **Real Market Data**: Integrate with actual options data APIs
2. **Caching**: Implement Redis or Vercel KV for data caching
3. **Authentication**: Add user authentication with Vercel Auth
4. **Database**: Connect to Vercel Postgres or external DB for persistence

## Support

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Community**: [github.com/vercel/vercel/discussions](https://github.com/vercel/vercel/discussions)
- **Status**: [vercel-status.com](https://vercel-status.com)

---

Happy Deploying! 🚀
