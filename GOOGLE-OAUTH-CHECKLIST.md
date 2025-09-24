# Google OAuth Quick Fix Checklist

## ❌ Current Error:
```
redirect_uri=https://hjxftnabwreuryngarax.supabase.co/auth/v1/callback
You can't sign in to this app because it doesn't comply with Google's OAuth 2.0 policy.
```

## ✅ Solution Checklist:

### Google Cloud Console (https://console.cloud.google.com/)
- [ ] Project created/selected
- [ ] OAuth consent screen configured
- [ ] OAuth 2.0 Client ID created
- [ ] **CRITICAL**: Redirect URI added: `https://hjxftnabwreuryngarax.supabase.co/auth/v1/callback`
- [ ] Client ID copied
- [ ] Client Secret copied

### Supabase Dashboard (https://supabase.com/dashboard)
- [ ] Navigate to project: hjxftnabwreuryngarax
- [ ] Authentication → Providers → Google → Enabled
- [ ] Client ID pasted from Google Cloud Console
- [ ] Client Secret pasted from Google Cloud Console
- [ ] Settings saved

### Testing
- [ ] Clear browser cache
- [ ] Test Google Sign-In at: https://options-dekho.vercel.app/auth
- [ ] Should work without redirect URI error

## 🔗 Quick Links:
- Google Cloud Console: https://console.cloud.google.com/
- Supabase Project: https://supabase.com/dashboard/project/hjxftnabwreuryngarax
- Test URL: https://options-dekho.vercel.app/auth

## 📝 Notes:
- The redirect URI MUST be exactly: `https://hjxftnabwreuryngarax.supabase.co/auth/v1/callback`
- No trailing slash, no extra parameters
- Case sensitive
- Copy/paste to avoid typos