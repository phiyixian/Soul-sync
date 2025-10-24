export const firebaseConfig = {
  "projectId": "studio-8158823289-aa6bd",
  "appId": "1:730510574963:web:c40eabd747626aa3803106",
  "apiKey": "AIzaSyABsSOezOOrYn6Mtf0TCPoDIiZnWlUexYQ",
  "authDomain": "studio-8158823289-aa6bd.firebaseapp.com",
  "storageBucket": "studio-8158823289-aa6bd.firebasestorage.app",
  "measurementId": "",
  "messagingSenderId": "730510574963"
};

// Google OAuth configuration for Calendar integration
export const googleOAuthConfig = {
  clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "YOUR_OAUTH_CLIENT_ID_HERE",
  scopes: [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ],
  redirectUri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
};
