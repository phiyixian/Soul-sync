# Google Maps Troubleshooting Guide

## 🗺️ **Map Not Showing Markers - Debug Steps**

### **Step 1: Check API Key**
1. Open `.env.local` file
2. Replace `your_google_maps_api_key_here` with your actual Google Maps API key
3. Restart the development server: `npm run dev`

### **Step 2: Check Browser Console**
1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for these debug messages:
   - `🗺️ GoogleMapsIntegration: Map instance created successfully`
   - `🗺️ GoogleMapsIntegration: My location data: {...}`
   - `🗺️ GoogleMapsIntegration: Creating my marker at: ...`

### **Step 3: Common Issues & Solutions**

**Issue: "Failed to load Google Maps API"**
- **Solution**: Check your API key in `.env.local`
- **Solution**: Ensure Maps JavaScript API is enabled in Google Cloud Console

**Issue: "Map instance not available"**
- **Solution**: Wait for Google Maps to load completely
- **Solution**: Check if there are any JavaScript errors

**Issue: "No valid location data for centering"**
- **Solution**: Click "Share Location" button to get your current location
- **Solution**: Check if location permission is granted

**Issue: Map loads but no markers**
- **Solution**: Check if `myLocation` data is received in console
- **Solution**: Ensure location data has valid latitude/longitude

### **Step 4: Test Location Sharing**
1. Click "Share Location" button
2. Allow location access when prompted
3. Check console for: `🗺️ GoogleMapsIntegration: My location set successfully`
4. Map should center on your location with a blue "U" marker

### **Step 5: Test Partner Location**
1. If you have a partner linked, click "Show Partner" button
2. Check console for partner location data
3. Map should show both markers with a purple line connecting them

### **Step 6: Manual API Key Setup**
If you don't have a Google Maps API key yet:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: `studio-8158823289-aa6bd`
3. Go to "APIs & Services" → "Library"
4. Enable these APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
5. Go to "APIs & Services" → "Credentials"
6. Click "Create Credentials" → "API Key"
7. Copy the API key
8. Replace `your_google_maps_api_key_here` in `.env.local`
9. Restart the development server

### **Step 7: Check Network Tab**
1. Open Developer Tools → Network tab
2. Look for requests to `maps.googleapis.com`
3. Check if they return 200 status (success) or 403/400 (error)

### **Expected Console Output:**
```
🗺️ GoogleMapsIntegration: Map instance created successfully
🗺️ GoogleMapsIntegration: My location snapshot received true
🗺️ GoogleMapsIntegration: My location data: {latitude: 40.7128, longitude: -74.0060, ...}
🗺️ GoogleMapsIntegration: Processing valid location data
🗺️ GoogleMapsIntegration: My location set successfully
🗺️ GoogleMapsIntegration: updateMapView called
🗺️ GoogleMapsIntegration: Centering on my location
🗺️ GoogleMapsIntegration: Creating my marker at: 40.7128 -74.0060
🗺️ GoogleMapsIntegration: My marker created and added
🗺️ GoogleMapsIntegration: Total markers: 1
```

### **Still Not Working?**
1. Try opening in incognito/private window
2. Check if location services are enabled in your browser
3. Try a different browser (Chrome, Firefox, Edge)
4. Check if your API key has proper restrictions set up
