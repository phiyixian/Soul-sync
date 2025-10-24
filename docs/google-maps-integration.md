# Google Maps Integration Setup Guide

This guide will help you integrate the full Google Maps JavaScript API into your SoulSync app for a more interactive and feature-rich mapping experience.

## 🗺️ **Features of Real Google Maps Integration**

- ✅ **Interactive Map**: Full zoom, pan, and interaction capabilities
- ✅ **Custom Markers**: Beautiful custom markers for user and partner locations
- ✅ **Connection Lines**: Visual line connecting both locations
- ✅ **Real-time Updates**: Live map updates when locations change
- ✅ **Address Lookup**: Reverse geocoding to show addresses
- ✅ **Distance Calculation**: Real-time distance between locations
- ✅ **Map Styles**: Custom map styling for better aesthetics

## 🔑 **Step 1: Get Google Maps API Key**

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create or Select Project**: Choose your Firebase project
3. **Enable APIs**:
   - Go to "APIs & Services" > "Library"
   - Enable "Maps JavaScript API"
   - Enable "Places API" (for address lookup)
   - Enable "Geocoding API" (for reverse geocoding)

4. **Create API Key**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the API key

5. **Restrict API Key** (Recommended):
   - Click on your API key
   - Under "Application restrictions", select "HTTP referrers"
   - Add your domains:
     - `localhost:*` (for development)
     - `your-domain.com/*` (for production)
   - Under "API restrictions", select "Restrict key"
   - Choose: "Maps JavaScript API", "Places API", "Geocoding API"

## 🔧 **Step 2: Configure Environment Variables**

Add your Google Maps API key to your environment variables:

```bash
# .env.local
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

## 📦 **Step 3: Install Dependencies (Optional)**

The integration uses the Google Maps JavaScript API loaded dynamically, so no additional packages are required. However, if you want TypeScript support:

```bash
npm install --save-dev @types/google.maps
```

## 🔄 **Step 4: Replace Current LocationMap Component**

Replace the current `LocationMap` component with the new `GoogleMapsIntegration`:

```typescript
// src/app/home/page.tsx
import { GoogleMapsIntegration } from '@/components/GoogleMapsIntegration';

// Replace this line:
// <LocationMap partnerId={partnerId} partnerName={partnerName || undefined} />

// With this:
<GoogleMapsIntegration partnerId={partnerId} partnerName={partnerName || undefined} />
```

## 🎨 **Step 5: Customize Map Appearance**

You can customize the map appearance by modifying the `styles` array in the `initializeMap` function:

```typescript
const map = new window.google.maps.Map(mapRef.current, {
  zoom: 10,
  center: { lat: 0, lng: 0 },
  mapTypeId: window.google.maps.MapTypeId.ROADMAP,
  styles: [
    // Add custom styles here
    {
      featureType: "poi",
      elementType: "labels",
      stylers: [{ visibility: "off" }]
    },
    {
      featureType: "water",
      elementType: "geometry",
      stylers: [{ color: "#e9e9e9" }, { lightness: 17 }]
    }
  ]
});
```

## 🎯 **Step 6: Customize Markers**

You can customize the markers by modifying the `icon` property in the marker creation:

```typescript
// Custom marker with emoji
const myMarker = new window.google.maps.Marker({
  position: { lat: myLocation.latitude, lng: myLocation.longitude },
  map: mapInstanceRef.current,
  title: 'Your Location',
  icon: {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="14" fill="#3B82F6" stroke="white" stroke-width="3"/>
        <text x="16" y="20" text-anchor="middle" fill="white" font-size="14" font-weight="bold">👤</text>
      </svg>
    `),
    scaledSize: new window.google.maps.Size(32, 32),
    anchor: new window.google.maps.Point(16, 16)
  }
});
```

## 🚀 **Step 7: Test the Integration**

1. **Start your development server**:
   ```bash
   npm run dev
   ```

2. **Test the features**:
   - Click "Share Location" to get your current location
   - Enable "Show Partner" to see partner's location
   - Try zooming and panning the map
   - Check if markers appear correctly
   - Verify distance calculation works

## 🔍 **Troubleshooting**

### Common Issues:

1. **"Failed to load Google Maps API"**:
   - Check if your API key is correct
   - Verify API restrictions allow your domain
   - Ensure Maps JavaScript API is enabled

2. **"This page can't load Google Maps correctly"**:
   - Check API key restrictions
   - Verify billing is enabled for your Google Cloud project
   - Check browser console for specific error messages

3. **Markers not appearing**:
   - Check if location data is being loaded correctly
   - Verify the map is initialized before adding markers
   - Check browser console for JavaScript errors

4. **Map not interactive**:
   - Ensure Maps JavaScript API is enabled
   - Check if there are any JavaScript errors
   - Verify the map container has proper dimensions

### Debug Mode:

Add this to see detailed logs:

```typescript
// Add to your component
useEffect(() => {
  console.log('Map loaded:', isMapLoaded);
  console.log('My location:', myLocation);
  console.log('Partner location:', partnerLocation);
  console.log('Map instance:', mapInstanceRef.current);
}, [isMapLoaded, myLocation, partnerLocation]);
```

## 💰 **Cost Considerations**

- **Maps JavaScript API**: Free tier includes 28,000 map loads per month
- **Places API**: Free tier includes 1,000 requests per month
- **Geocoding API**: Free tier includes 40,000 requests per month

For most personal/small apps, the free tier should be sufficient.

## 🔒 **Security Best Practices**

1. **Restrict API Key**: Always restrict your API key to specific domains
2. **Monitor Usage**: Set up billing alerts in Google Cloud Console
3. **Rotate Keys**: Regularly rotate your API keys
4. **Environment Variables**: Never commit API keys to version control

## 🎉 **You're All Set!**

Your Google Maps integration is now ready! You'll have a fully interactive map with custom markers, real-time updates, and all the features of the Google Maps platform.

The new integration provides:
- Better user experience with full map interaction
- Custom markers with your app's branding
- Real-time location updates
- Professional map styling
- Distance calculations and visual connections
