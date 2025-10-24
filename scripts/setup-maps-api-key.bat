@echo off
echo ========================================
echo Google Maps API Key Setup
echo ========================================
echo.
echo The map is not showing because the Google Maps API key is not configured.
echo.
echo To fix this, you need to:
echo.
echo 1. Get a Google Maps API key:
echo    - Go to: https://console.cloud.google.com/
echo    - Select project: studio-8158823289-aa6bd
echo    - Go to "APIs & Services" ^> "Library"
echo    - Enable "Maps JavaScript API"
echo    - Go to "APIs & Services" ^> "Credentials"
echo    - Click "Create Credentials" ^> "API Key"
echo    - Copy the API key
echo.
echo 2. Create .env.local file in your project root:
echo    - Create a file named ".env.local"
echo    - Add this line: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
echo    - Replace "your_actual_api_key_here" with your real API key
echo.
echo 3. Restart the development server:
echo    - Stop the current server (Ctrl+C)
echo    - Run: npm run dev
echo.
echo ========================================
echo.
echo Example .env.local file content:
echo NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
echo.
echo ========================================
pause
