# Google OAuth Verification Fix Checklist

## ✅ Steps to Fix "Access Blocked" Error

### 1. OAuth Consent Screen Configuration
- [ ] Go to Google Cloud Console
- [ ] Select project: studio-8158823289-aa6bd
- [ ] Navigate to: APIs & Services → OAuth consent screen
- [ ] Verify app is in "Testing" mode
- [ ] Add test users:
  - [ ] priverco5614@gmail.com
  - [ ] Any other test emails
- [ ] Save changes

### 2. Firebase Authentication Setup
- [ ] Go to Firebase Console
- [ ] Select project: studio-8158823289-aa6bd
- [ ] Authentication → Settings → Authorized domains
- [ ] Add domains:
  - [ ] localhost
  - [ ] studio-8158823289-aa6bd.firebaseapp.com
  - [ ] studio-8158823289-aa6bd.web.app

### 3. OAuth Credentials Check
- [ ] Go to APIs & Services → Credentials
- [ ] Verify OAuth 2.0 Client ID exists
- [ ] Check Authorized JavaScript origins:
  - [ ] http://localhost:3000
  - [ ] http://localhost:9003
- [ ] Check Authorized redirect URIs:
  - [ ] http://localhost:3000/__/auth/handler
  - [ ] http://localhost:9003/__/auth/handler

### 4. Environment Variables
- [ ] Update .env.local with actual OAuth Client ID
- [ ] Replace "your_oauth_client_id_here" with real Client ID

### 5. Test Steps
- [ ] Wait 5-10 minutes after changes
- [ ] Clear browser cache
- [ ] Try Google Sign-In
- [ ] Check browser console for errors

## 🔍 Common Issues & Solutions

### Issue: "Access blocked" error
**Solution**: Add yourself as a test user in OAuth consent screen

### Issue: "Invalid client" error
**Solution**: Check OAuth Client ID in .env.local file

### Issue: "Redirect URI mismatch" error
**Solution**: Verify redirect URIs in OAuth credentials

### Issue: "Domain not authorized" error
**Solution**: Add localhost to Firebase authorized domains

## 📞 Need Help?
If you're still having issues:
1. Check Google Cloud Console for any error messages
2. Verify all URLs match exactly (including http vs https)
3. Make sure you're using the correct OAuth Client ID
4. Try incognito/private browsing mode
