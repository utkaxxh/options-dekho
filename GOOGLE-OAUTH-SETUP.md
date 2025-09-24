# Google OAuth Setup Guide

## 🚀 Step 1: Google Cloud Console

1. **Create OAuth Credentials:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth 2.0 Client IDs**
   - Application type: **Web application**
   - Name: `Options Dekho App`

2. **Configure Authorized Redirect URIs:**
   Add these exact URLs:
   ```
   https://hjxftnabwreuryngarax.supabase.co/auth/v1/callback
   http://localhost:5000/auth/callback
   https://options-dekho.vercel.app/auth/callback
   ```

3. **Save Credentials:**
   - Copy the **Client ID** 
   - Copy the **Client Secret**

## 🔐 Step 2: Supabase Configuration

1. **Go to Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard
   - Select your project: `hjxftnabwreuryngarax`

2. **Enable Google Provider:**
   - Go to **Authentication** → **Providers**
   - Find **Google** and click **Enable**
   - Paste your **Client ID** from Google Cloud Console
   - Paste your **Client Secret** from Google Cloud Console
   - Click **Save**

3. **Configure Site URL:**
   - Go to **Authentication** → **Settings**
   - Set **Site URL** to: `https://options-dekho.vercel.app`
   - Add **Additional Redirect URLs**:
     ```
     http://localhost:5000
     https://options-dekho.vercel.app
     ```

## ✅ Step 3: Test the Integration

1. **Local Testing:**
   - Run your app locally: `node server-simple.js`
   - Visit: http://localhost:5000/auth
   - Try Google Sign-In

2. **Production Testing:**
   - Visit your Vercel app: https://options-dekho.vercel.app/auth
   - Try Google Sign-In

## 🐛 Common Issues:

### "Redirect URI mismatch"
- Ensure exact URLs are added to Google Cloud Console
- Check for trailing slashes - they matter!

### "App not verified"
- For development, you can continue with unverified app
- For production, submit app for verification

### "Access blocked"
- Make sure OAuth consent screen is configured
- Add test users if app is in testing mode

## 📋 Checklist:

- [ ] Google Cloud project created
- [ ] OAuth 2.0 credentials configured
- [ ] Redirect URIs added to Google Cloud Console
- [ ] Google provider enabled in Supabase
- [ ] Client ID and Secret added to Supabase
- [ ] Site URL configured in Supabase
- [ ] Additional redirect URLs added
- [ ] Local testing completed
- [ ] Production testing completed

## 🔗 Useful Links:

- [Supabase Google OAuth Guide](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth 2.0 Setup](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)