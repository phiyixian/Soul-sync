@echo off
REM Google Cloud SDK Setup Script for SoulSync Calendar Integration (Windows)
REM This script helps set up Google Cloud SDK and configure CORS for Google Calendar API

echo 🚀 Setting up Google Cloud SDK for SoulSync Calendar Integration...

REM Check if gcloud is installed
where gcloud >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Google Cloud SDK not found. Please install it first:
    echo    Visit: https://cloud.google.com/sdk/docs/install
    echo    Or download from: https://cloud.google.com/sdk/docs/install-sdk
    pause
    exit /b 1
)

echo ✅ Google Cloud SDK found

REM Authenticate with Google Cloud
echo 🔐 Authenticating with Google Cloud...
gcloud auth login

REM Set the project
echo 📁 Setting project to studio-8158823289-aa6bd...
gcloud config set project studio-8158823289-aa6bd

REM Check if gsutil is available
where gsutil >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ gsutil not found. Please install Google Cloud SDK components:
    echo    Run: gcloud components install gsutil
    pause
    exit /b 1
)

REM Apply CORS configuration
echo 🌐 Applying CORS configuration to Firebase Storage...
echo    This allows your app to access Google Calendar API from the browser

REM Note: You'll need to replace this with your actual Firebase Storage bucket name
set STORAGE_BUCKET=studio-8158823289-aa6bd.firebasestorage.app

if exist "cors-calendar.json" (
    echo 📄 Found cors-calendar.json, applying CORS configuration...
    gsutil cors set cors-calendar.json gs://%STORAGE_BUCKET%
    
    if %errorlevel% equ 0 (
        echo ✅ CORS configuration applied successfully!
        echo    Your app can now make requests to Google Calendar API
    ) else (
        echo ❌ Failed to apply CORS configuration
        echo    Please check your Firebase Storage bucket name and permissions
    )
) else (
    echo ❌ cors-calendar.json not found
    echo    Please make sure the CORS configuration file exists
)

echo.
echo 🎉 Setup complete! Next steps:
echo    1. Enable Google Calendar API in Google Cloud Console
echo    2. Configure OAuth consent screen
echo    3. Create OAuth 2.0 credentials
echo    4. Update Firebase Authentication settings
echo    5. Test the integration in your app
echo.
echo 📖 For detailed instructions, see: docs/firebase-oauth-setup.md
pause
