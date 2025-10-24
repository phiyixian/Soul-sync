@echo off
echo ========================================
echo Google Maps API Key Setup for SoulSync
echo ========================================
echo.
echo Please follow these steps to set up your Google Maps API key:
echo.
echo 1. Go to Google Cloud Console: https://console.cloud.google.com/
echo 2. Select your Firebase project: studio-8158823289-aa6bd
echo 3. Go to "APIs & Services" ^> "Library"
echo 4. Enable these APIs:
echo    - Maps JavaScript API
echo    - Places API  
echo    - Geocoding API
echo.
echo 5. Go to "APIs & Services" ^> "Credentials"
echo 6. Click "Create Credentials" ^> "API Key"
echo 7. Copy the API key
echo.
echo 8. Click on your API key to restrict it:
echo    - Application restrictions: HTTP referrers
echo    - Add: localhost:* (for development)
echo    - API restrictions: Restrict key
echo    - Select: Maps JavaScript API, Places API, Geocoding API
echo.
echo 9. Replace "your_google_maps_api_key_here" in .env.local with your actual API key
echo.
echo ========================================
echo.
echo Current .env.local file location: %cd%\.env.local
echo.
echo After adding your API key, restart your development server:
echo npm run dev
echo.
pause
