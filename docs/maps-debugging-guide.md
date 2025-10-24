# Google Maps API Troubleshooting Guide

## 🔍 **Enhanced Debugging Added**

The app now has comprehensive debugging that will show you exactly what's happening with the Google Maps API loading process.

### **Console Debug Messages to Look For:**

**1. API Key Validation:**
```
🗺️ GoogleMapsIntegration: API Key: AIzaSyC2UJLvSsvVWz62dtgoV7D5ksxZC0FSvnc
🗺️ GoogleMapsIntegration: Full API key length: 39
```

**2. Script Loading Process:**
```
🗺️ GoogleMapsLoader: Starting script loading process
🗺️ GoogleMapsLoader: Created callback name: googleMapsCallback_1234567890_abc123
🗺️ GoogleMapsLoader: Script URL: https://maps.googleapis.com/maps/api/js?key=AIzaSyC2UJLvSsvVWz62dtgoV7D5ksxZC0FSvnc&libraries=places&callback=googleMapsCallback_1234567890_abc123
🗺️ GoogleMapsLoader: Adding script to document head
🗺️ GoogleMapsLoader: Script loaded successfully
🗺️ GoogleMapsLoader: Callback executed - Google Maps loaded
```

**3. Map Initialization:**
```
🗺️ GoogleMapsIntegration: Google Maps API loaded successfully
🗺️ GoogleMapsIntegration: window.google available: true
🗺️ GoogleMapsIntegration: window.google.maps available: true
🗺️ GoogleMapsIntegration: Map instance created successfully
```

## 🚨 **Common Issues & Solutions**

### **Issue 1: API Key Restrictions**
**Symptoms:** Script loads but map doesn't initialize
**Solution:** Check API key restrictions in Google Cloud Console
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Click on your API key
3. Under "Application restrictions", make sure it's set to "None" or includes your domain
4. Under "API restrictions", ensure "Maps JavaScript API" is enabled

### **Issue 2: Billing Not Enabled**
**Symptoms:** API loads but returns quota errors
**Solution:** Enable billing in Google Cloud Console
1. Go to Google Cloud Console → Billing
2. Link a billing account to your project
3. Google Maps requires billing even for free tier usage

### **Issue 3: Domain Restrictions**
**Symptoms:** Works in some browsers but not others
**Solution:** Add localhost to allowed domains
1. In API key restrictions, add:
   - `localhost:9002`
   - `127.0.0.1:9002`
   - `10.167.41.34:9002` (your network IP)

### **Issue 4: CORS Issues**
**Symptoms:** Network errors in browser console
**Solution:** Check browser console for CORS errors
1. Open Developer Tools → Network tab
2. Look for failed requests to `maps.googleapis.com`
3. Check if requests return 403 or CORS errors

### **Issue 5: Script Loading Errors**
**Symptoms:** Script fails to load
**Solution:** Check the exact error message
1. Look for `🗺️ GoogleMapsLoader: Script loading error:` in console
2. Check the failed script URL
3. Verify the API key is correct in the URL

## 🔧 **Step-by-Step Debugging**

### **Step 1: Check Console Output**
1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Refresh the page
4. Look for the debug messages starting with `🗺️`

### **Step 2: Check Network Tab**
1. Go to Network tab in Developer Tools
2. Refresh the page
3. Look for requests to `maps.googleapis.com`
4. Check if they return 200 (success) or error codes

### **Step 3: Test API Key Directly**
1. Open a new browser tab
2. Go to: `https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&callback=testCallback`
3. Replace `YOUR_API_KEY` with your actual API key
4. Check if it loads without errors

### **Step 4: Check API Quotas**
1. Go to Google Cloud Console → APIs & Services → Quotas
2. Look for "Maps JavaScript API" quotas
3. Check if you've exceeded any limits

## 🎯 **Expected Success Flow**

When everything works correctly, you should see this sequence:

1. **API Key Validation:** ✅ Valid API key detected
2. **Script Loading:** ✅ Google Maps script loads successfully
3. **API Initialization:** ✅ Google Maps API becomes available
4. **Map Creation:** ✅ Map instance is created
5. **Location Sharing:** ✅ Location data is received and processed
6. **Marker Creation:** ✅ Markers are added to the map

## 🚀 **Quick Fixes to Try**

### **Fix 1: Clear Browser Cache**
1. Press `Ctrl + Shift + R` (hard refresh)
2. Or open incognito/private window

### **Fix 2: Check API Key Format**
- API key should be 39 characters long
- Should start with `AIzaSy`
- No spaces or special characters

### **Fix 3: Restart Development Server**
```bash
# Stop server (Ctrl+C)
npm run dev
```

### **Fix 4: Check Environment Variables**
1. Verify `.env.local` file exists
2. Check that `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set correctly
3. Restart the development server after changes

## 📞 **Still Not Working?**

If you're still having issues, please share:
1. **Console output** - Copy all the `🗺️` debug messages
2. **Network errors** - Any failed requests in Network tab
3. **Browser** - Which browser and version you're using
4. **Error messages** - Any specific error messages you see

This will help identify the exact issue! 🗺️✨🔍
