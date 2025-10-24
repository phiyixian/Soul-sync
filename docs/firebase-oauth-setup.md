# 🔐 Firebase OAuth & Google Calendar API Setup Guide

## Prerequisites
- Google Cloud Console access
- Firebase project access
- Domain where your app will be hosted

## Step 1: Enable Google Calendar API

### 1.1 Go to Google Cloud Console
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: `studio-8158823289-aa6bd`

### 1.2 Enable Google Calendar API
1. Navigate to **APIs & Services** → **Library**
2. Search for "Google Calendar API"
3. Click on **Google Calendar API**
4. Click **Enable**

### 1.3 Verify API is Enabled
1. Go to **APIs & Services** → **Enabled APIs**
2. Confirm "Google Calendar API" is listed

## Step 2: Configure OAuth Consent Screen

### 2.1 Set Up OAuth Consent Screen
1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** user type (unless you have Google Workspace)
3. Click **Create**

### 2.2 Fill OAuth Consent Screen Information
```
App name: SoulSync
User support email: [your-email@domain.com]
Developer contact information: [your-email@domain.com]
```

### 2.3 Add Scopes
1. Click **Add or Remove Scopes**
2. Add these scopes:
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
3. Click **Update**

### 2.4 Add Test Users (for development)
1. Go to **Test users** section
2. Click **Add users**
3. Add your email and any test user emails
4. Click **Save**

## Step 3: Create OAuth 2.0 Credentials

### 3.1 Create Web Application Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client IDs**
3. Select **Web application**
4. Name: `SoulSync Web Client`

### 3.2 Configure Authorized Origins
Add these authorized JavaScript origins:
```
http://localhost:3000
http://localhost:9003
https://your-domain.com (when deployed)
```

### 3.3 Configure Authorized Redirect URIs
Add these redirect URIs:
```
http://localhost:3000/__/auth/handler
http://localhost:9003/__/auth/handler
https://your-domain.com/__/auth/handler (when deployed)
```

### 3.4 Save Credentials
1. Click **Create**
2. **IMPORTANT**: Copy the Client ID and Client Secret
3. Save them securely - you'll need them for Firebase configuration

## Step 4: Configure Firebase Authentication

### 4.1 Enable Google Sign-In in Firebase
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `studio-8158823289-aa6bd`
3. Go to **Authentication** → **Sign-in method**
4. Click on **Google**
5. Toggle **Enable**

### 4.2 Add OAuth Credentials to Firebase
1. In the Google sign-in configuration:
   - **Project support email**: [your-email@domain.com]
   - **Web SDK configuration**:
     - **Web client ID**: [paste your OAuth Client ID from Step 3.4]
     - **Web client secret**: [paste your OAuth Client Secret from Step 3.4]

### 4.3 Configure Authorized Domains
Add these authorized domains:
```
localhost
your-domain.com
```

## Step 5: Set Up CORS for Google Calendar API

### 5.1 Create CORS Configuration File
Create a file called `cors-calendar.json`:

```json
[
  {
    "origin": ["http://localhost:3000", "http://localhost:9003", "https://your-domain.com"],
    "method": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "maxAgeSeconds": 3600,
    "responseHeader": ["Content-Type", "Authorization", "X-Requested-With"]
  }
]
```

### 5.2 Apply CORS Configuration
Run this command in your terminal (requires Google Cloud SDK):

```bash
# Install Google Cloud SDK if not already installed
# Download from: https://cloud.google.com/sdk/docs/install

# Authenticate with Google Cloud
gcloud auth login

# Set your project
gcloud config set project studio-8158823289-aa6bd

# Apply CORS configuration to Google Calendar API
gsutil cors set cors-calendar.json gs://your-storage-bucket-name
```

**Note**: Replace `your-storage-bucket-name` with your actual Firebase Storage bucket name.

## Step 6: Update Firebase Configuration

### 6.1 Update Firebase Config
Update your `src/firebase/config.ts`:

```typescript
export const firebaseConfig = {
  "projectId": "studio-8158823289-aa6bd",
  "appId": "1:730510574963:web:c40eabd747626aa3803106",
  "apiKey": "AIzaSyABsSOezOOrYn6Mtf0TCPoDIiZnWlUexYQ",
  "authDomain": "studio-8158823289-aa6bd.firebaseapp.com",
  "storageBucket": "studio-8158823289-aa6bd.firebasestorage.app",
  "measurementId": "",
  "messagingSenderId": "730510574963"
};

// Add Google OAuth configuration
export const googleOAuthConfig = {
  clientId: "YOUR_OAUTH_CLIENT_ID_HERE", // From Step 3.4
  scopes: [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ]
};
```

### 6.2 Update Environment Variables (Optional)
Create a `.env.local` file:

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_oauth_client_id_here
GOOGLE_CLIENT_SECRET=your_oauth_client_secret_here
```

## Step 7: Test the Integration

### 7.1 Test Google Sign-In
1. Start your development server: `npm run dev`
2. Go to `/login` or `/register`
3. Click "Continue with Google"
4. Verify the OAuth flow works

### 7.2 Test Calendar Access
1. After signing in with Google, check if calendar data loads
2. Verify you can see your calendar events
3. Test partner calendar sharing

## Step 8: Production Deployment

### 8.1 Update Authorized Origins for Production
1. Go back to Google Cloud Console → **Credentials**
2. Edit your OAuth 2.0 Client ID
3. Add your production domain to **Authorized JavaScript origins**
4. Add your production domain to **Authorized redirect URIs**

### 8.2 Update Firebase Authorized Domains
1. Go to Firebase Console → **Authentication** → **Settings**
2. Add your production domain to **Authorized domains**

## Troubleshooting

### Common Issues:

1. **"This app isn't verified"**
   - This is normal for development
   - Click "Advanced" → "Go to SoulSync (unsafe)"
   - For production, you'll need to verify your app

2. **CORS errors**
   - Ensure CORS configuration is applied correctly
   - Check that your domain is in the CORS origins list
   - Verify the Google Calendar API is enabled

3. **"Access blocked"**
   - Check that your domain is in authorized origins
   - Verify OAuth consent screen is configured
   - Ensure test users are added (for development)

4. **Calendar not loading**
   - Check browser console for errors
   - Verify Google Calendar API is enabled
   - Ensure proper scopes are requested

### Debug Steps:
1. Check browser console for errors
2. Verify Firebase Authentication is working
3. Test Google Calendar API directly
4. Check network requests in browser dev tools

## Security Notes

- **Never commit OAuth secrets to version control**
- **Use environment variables for sensitive data**
- **Regularly rotate OAuth credentials**
- **Monitor API usage in Google Cloud Console**
- **Set up proper error handling for OAuth failures**

## Next Steps

After completing this setup:
1. Test the complete OAuth flow
2. Verify calendar data is loading
3. Test partner calendar sharing
4. Deploy to production with proper domain configuration
5. Monitor usage and performance

This setup will enable full Google Calendar integration with your SoulSync app! 🚀
