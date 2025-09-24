# Google OAuth Setup Guide - EXACT STEPS

## � CRITICAL: Your Exact Error Fix

**Error**: `redirect_uri=https://hjxftnabwreuryngarax.supabase.co/auth/v1/callback`

**Solution**: Add this EXACT URL to Google Cloud Console

## �🚀 Step 1: Google Cloud Console (MANDATORY)

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/

2. **Create/Select Project:**
   - Create new project: "Options Dekho" 
   - Or select existing project

3. **Enable APIs:**
   - **APIs & Services** → **Library**
   - Search "Google+ API" → **Enable**

4. **OAuth Consent Screen** (if first time):
   - **APIs & Services** → **OAuth consent screen**
   - User Type: **External**
   - App name: "Options Dekho"
   - User support email: [your-email]
   - Developer contact: [your-email]
   - **Save and Continue** through all steps

5. **Create OAuth 2.0 Client:**
   - **APIs & Services** → **Credentials**
   - **+ Create Credentials** → **OAuth 2.0 Client IDs**
   - Application type: **Web application**
   - Name: "Options Dekho Web Client"

6. **CRITICAL: Add Authorized Redirect URI:**
   ```
   https://hjxftnabwreuryngarax.supabase.co/auth/v1/callback
   ```
   ⚠️ **MUST BE EXACT** - copy/paste this URL

7. **Save & Copy:**
   - **Client ID**: `1234567890-xxxxxxxx.apps.googleusercontent.com`
   - **Client Secret**: `GOCSPX-xxxxxxxx`

## 🔐 Step 2: Supabase Configuration

1. **Supabase Dashboard:**
   - https://supabase.com/dashboard/project/hjxftnabwreuryngarax

2. **Enable Google Provider:**
   - **Authentication** → **Providers**
   - Find **Google** → **Enable**
   - **Client ID**: [paste from Google Cloud Console]
   - **Client Secret**: [paste from Google Cloud Console]
   - **Save**

3. **Site URL Configuration:**
   - **Authentication** → **Settings**
   - **Site URL**: `https://options-dekho.vercel.app`
   - **Additional Redirect URLs**:
     ```
     http://localhost:5000
     https://options-dekho.vercel.app
     ```

## ✅ Testing Steps

1. **Clear browser cache/cookies**
2. **Visit**: https://options-dekho.vercel.app/auth
3. **Click Google Sign-In**
4. **Should work without redirect URI error**

## 🐛 Still Getting Errors?

### "redirect_uri_mismatch"
- Double-check the EXACT URL in Google Cloud Console
- URL must be: `https://hjxftnabwreuryngarax.supabase.co/auth/v1/callback`

### "invalid_client"
- Check Client ID/Secret in Supabase matches Google Cloud Console
- Regenerate credentials if needed

### "app not verified"
- Click "Continue" for development
- Submit for verification for production use

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