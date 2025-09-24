# Google OAuth Troubleshooting Guide

## 🔍 Since you already have the redirect URI configured, let's check other common issues:

## 1. **Verify Google Cloud Console Settings**

### Check OAuth 2.0 Client ID:
- Go to: https://console.cloud.google.com/apis/credentials
- Find your OAuth 2.0 Client ID
- Click the pencil icon to edit
- **Verify these settings:**
  - Application type: **Web application** ✅
  - Authorized redirect URIs contains: `https://hjxftnabwreuryngarax.supabase.co/auth/v1/callback` ✅
  - No extra spaces or characters ✅
  - Status: **Enabled** ✅

### Check OAuth Consent Screen:
- Go to: https://console.cloud.google.com/apis/credentials/consent
- **Verify:**
  - Publishing status: Can be "Testing" for now ✅
  - User type: Usually "External" ✅
  - Authorized domains: Add `supabase.co` and `vercel.app` ✅

## 2. **Common Issues & Solutions**

### Issue A: Wrong Client ID/Secret in Supabase
**Check:** Does the Client ID in Supabase match exactly with Google Cloud Console?

### Issue B: Project Mismatch
**Check:** Are you using the correct Google Cloud project? Sometimes people have multiple projects.

### Issue C: API Not Enabled
**Check:** 
- Go to: https://console.cloud.google.com/apis/library
- Search for "Google+ API" or "People API"
- Make sure it's **ENABLED**

### Issue D: Quota/Billing Issues
**Check:** 
- Go to: https://console.cloud.google.com/apis/dashboard
- Check if there are any quota exceeded errors

### Issue E: Cache/Cookies
**Try:**
- Clear all browser data for supabase.co domain
- Try incognito/private browsing mode
- Try different browser

## 3. **Step-by-Step Verification**

### Verify Supabase Configuration:
1. Go to: https://supabase.com/dashboard/project/hjxftnabwreuryngarax
2. **Authentication** → **Providers**
3. Find **Google** provider
4. **Check:**
   - Enabled: ✅
   - Client ID: [matches Google Cloud Console]
   - Client Secret: [matches Google Cloud Console]

### Verify Site URL:
1. **Authentication** → **Settings**
2. **Site URL**: Should be `https://options-dekho.vercel.app`
3. **Additional Redirect URLs**: Should include your domains

## 4. **Testing Steps**

### Test 1: Direct Supabase Test
- Go to Supabase Auth UI (if available) and test Google login directly

### Test 2: Check Network Tab
- Open browser dev tools → Network tab
- Try Google login
- Look for failed requests or error responses

### Test 3: Check Console Logs
- Open browser dev tools → Console tab
- Try Google login
- Look for JavaScript errors

## 5. **Possible Solutions**

### Solution A: Regenerate Credentials
1. Delete current OAuth 2.0 Client ID in Google Cloud Console
2. Create new OAuth 2.0 Client ID
3. Update Supabase with new credentials

### Solution B: Check Project Billing
- Make sure Google Cloud project has billing enabled (required for OAuth)

### Solution C: Wait for Propagation
- Google Cloud changes can take 5-10 minutes to propagate

### Solution D: Add More Redirect URIs
Try adding these additional redirect URIs:
```
https://hjxftnabwreuryngarax.supabase.co/auth/v1/callback
http://localhost:5000/auth/callback
https://options-dekho.vercel.app/auth/callback
```

## 6. **Debug Information to Check**

Please check and share:
- [ ] Google Cloud Console project name/ID
- [ ] OAuth 2.0 Client ID (just the ID, not secret)
- [ ] Exact error message from browser console
- [ ] Network tab errors during login attempt
- [ ] OAuth consent screen status (Testing/Published)

## 7. **Alternative Temporary Solution**

If Google OAuth continues to fail, you can:
- Use email/password authentication (which works)
- Set up Google OAuth later
- Focus on the core premium calculator functionality first