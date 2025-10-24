# 📅 Google Calendar Integration Setup Guide

## Overview
SoulSync now supports Google Calendar integration, allowing you and your partner to view each other's schedules and stay connected throughout the day.

## Features
- **Google Sign-In**: Use your Google account to sign in to SoulSync
- **Calendar Sync**: Automatically sync your Google Calendar events
- **Partner Sharing**: View your partner's current and upcoming events
- **Real-time Updates**: Calendar data updates in real-time
- **Privacy Controls**: Control what calendar information is shared

## Setup Instructions

### 1. Enable Google Sign-In
1. Go to the login or registration page
2. Click "Continue with Google"
3. Grant permission for calendar access when prompted
4. Your Google Calendar will be automatically connected

### 2. Calendar Permissions
When you sign in with Google, SoulSync will request:
- **Read-only access** to your Google Calendar
- **View events** from your primary calendar
- **No write access** - SoulSync cannot modify your calendar

### 3. Partner Calendar Sharing
- Your calendar events are automatically shared with your linked partner
- You can see your partner's current and upcoming events
- Calendar data is synced in real-time

## How It Works

### For You (Calendar Owner)
- Your Google Calendar events are fetched and displayed
- Current events are highlighted with a "Now" badge
- Upcoming events are shown with timestamps
- All-day events are properly handled

### For Your Partner
- Can view your current and upcoming events
- Sees your online/offline status
- Gets real-time updates when your schedule changes
- Cannot see private event details (only titles and times)

## Privacy & Security
- **Read-only access**: SoulSync never modifies your calendar
- **Secure storage**: Calendar data is stored securely in Firebase
- **Partner-only sharing**: Only your linked partner can see your calendar
- **Revocable access**: You can revoke access anytime through Google settings

## Troubleshooting

### Calendar Not Showing
1. Make sure you signed in with Google
2. Check that you granted calendar permissions
3. Verify your Google Calendar has events
4. Try refreshing the page

### Partner Calendar Not Visible
1. Ensure your partner has also connected their Google Calendar
2. Check that you're properly linked as partners
3. Verify your partner has shared their calendar

### Permission Issues
1. Go to Google Account settings
2. Navigate to "Security" → "Third-party apps"
3. Find SoulSync and ensure calendar access is enabled
4. Re-authenticate if necessary

## Technical Details
- Uses Google Calendar API v3
- OAuth 2.0 authentication
- Real-time sync via Firebase Firestore
- Automatic token refresh
- CORS-enabled for web access

## Support
If you encounter any issues with calendar integration, please check:
1. Your internet connection
2. Google Calendar API status
3. Browser permissions
4. SoulSync app status

For additional help, contact support or check the troubleshooting section above.
