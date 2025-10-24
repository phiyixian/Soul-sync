#!/bin/bash

# Google Cloud SDK Setup Script for SoulSync Calendar Integration
# This script helps set up Google Cloud SDK and configure CORS for Google Calendar API

echo "🚀 Setting up Google Cloud SDK for SoulSync Calendar Integration..."

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud SDK not found. Please install it first:"
    echo "   Visit: https://cloud.google.com/sdk/docs/install"
    echo "   Or use: curl https://sdk.cloud.google.com | bash"
    exit 1
fi

echo "✅ Google Cloud SDK found"

# Authenticate with Google Cloud
echo "🔐 Authenticating with Google Cloud..."
gcloud auth login

# Set the project
echo "📁 Setting project to studio-8158823289-aa6bd..."
gcloud config set project studio-8158823289-aa6bd

# Check if gsutil is available
if ! command -v gsutil &> /dev/null; then
    echo "❌ gsutil not found. Please install Google Cloud SDK components:"
    echo "   Run: gcloud components install gsutil"
    exit 1
fi

# Apply CORS configuration
echo "🌐 Applying CORS configuration to Firebase Storage..."
echo "   This allows your app to access Google Calendar API from the browser"

# Note: You'll need to replace this with your actual Firebase Storage bucket name
STORAGE_BUCKET="studio-8158823289-aa6bd.firebasestorage.app"

if [ -f "cors-calendar.json" ]; then
    echo "📄 Found cors-calendar.json, applying CORS configuration..."
    gsutil cors set cors-calendar.json gs://$STORAGE_BUCKET
    
    if [ $? -eq 0 ]; then
        echo "✅ CORS configuration applied successfully!"
        echo "   Your app can now make requests to Google Calendar API"
    else
        echo "❌ Failed to apply CORS configuration"
        echo "   Please check your Firebase Storage bucket name and permissions"
    fi
else
    echo "❌ cors-calendar.json not found"
    echo "   Please make sure the CORS configuration file exists"
fi

echo ""
echo "🎉 Setup complete! Next steps:"
echo "   1. Enable Google Calendar API in Google Cloud Console"
echo "   2. Configure OAuth consent screen"
echo "   3. Create OAuth 2.0 credentials"
echo "   4. Update Firebase Authentication settings"
echo "   5. Test the integration in your app"
echo ""
echo "📖 For detailed instructions, see: docs/firebase-oauth-setup.md"
