'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Navigation, Send, RefreshCw, Eye, EyeOff, Ruler } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirebase } from '@/firebase';
import { doc, updateDoc, onSnapshot, addDoc, collection, serverTimestamp, setDoc } from 'firebase/firestore';
import { loadGoogleMaps } from '@/lib/google-maps-loader';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
  address?: string;
}

interface GoogleMapsIntegrationProps {
  partnerId?: string;
  partnerName?: string;
}

// Calculate distance between two points using Haversine formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
};

// Declare Google Maps types
declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

export function GoogleMapsIntegration({ partnerId, partnerName }: GoogleMapsIntegrationProps) {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  const [myLocation, setMyLocation] = useState<LocationData | null>(null);
  const [partnerLocation, setPartnerLocation] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocationShared, setIsLocationShared] = useState(false);
  const [showPartnerLocation, setShowPartnerLocation] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Google Maps API Key - Replace with your actual API key
  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY_HERE';

  console.log('🗺️ GoogleMapsIntegration: API Key:', GOOGLE_MAPS_API_KEY);
  console.log('🗺️ GoogleMapsIntegration: Environment variables:', {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
    ALL_ENV_VARS: Object.keys(process.env).filter(key => key.includes('GOOGLE') || key.includes('MAPS'))
  });

  // Monitor map container mounting
  useEffect(() => {
    console.log('🗺️ GoogleMapsIntegration: Component mounted, mapRef.current:', mapRef.current);
    if (mapRef.current) {
      console.log('🗺️ GoogleMapsIntegration: Map container div is available');
      console.log('🗺️ GoogleMapsIntegration: Map container dimensions:', {
        width: mapRef.current.offsetWidth,
        height: mapRef.current.offsetHeight,
        clientWidth: mapRef.current.clientWidth,
        clientHeight: mapRef.current.clientHeight
      });
    }
  }, [isMapLoaded]);

  // Load Google Maps API using the centralized loader
  useEffect(() => {
    const loadMaps = async () => {
      console.log('🗺️ GoogleMapsIntegration: Starting to load Google Maps API');
      
      // Check if API key is valid
      if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_API_KEY_HERE' || GOOGLE_MAPS_API_KEY === 'your_google_maps_api_key_here') {
        console.error('🗺️ GoogleMapsIntegration: Invalid API key:', GOOGLE_MAPS_API_KEY);
        setMapError('Google Maps API key not configured');
        toast({
          title: "Map Error",
          description: "Google Maps API key not configured. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local",
          variant: "destructive",
        });
        return;
      }

      // Set a timeout to detect if Google Maps fails to load
      const timeoutId = setTimeout(() => {
        if (!isMapLoaded) {
          console.error('🗺️ GoogleMapsIntegration: Google Maps failed to load within 10 seconds');
          setMapError('Google Maps failed to load - check API key restrictions');
          toast({
            title: "Map Error",
            description: "Google Maps failed to load. Please check your API key restrictions in Google Cloud Console.",
            variant: "destructive",
          });
        }
      }, 10000);

      try {
        console.log('🗺️ GoogleMapsIntegration: Loading Google Maps with API key:', GOOGLE_MAPS_API_KEY.substring(0, 10) + '...');
        console.log('🗺️ GoogleMapsIntegration: Full API key length:', GOOGLE_MAPS_API_KEY.length);
        
        await loadGoogleMaps(GOOGLE_MAPS_API_KEY, ['places'], () => {
          clearTimeout(timeoutId); // Clear timeout since maps loaded successfully
          console.log('🗺️ GoogleMapsIntegration: Google Maps API loaded successfully');
          console.log('🗺️ GoogleMapsIntegration: window.google available:', !!window.google);
          console.log('🗺️ GoogleMapsIntegration: window.google.maps available:', !!(window.google && window.google.maps));
          console.log('🗺️ GoogleMapsIntegration: window.google.maps.Map available:', !!(window.google && window.google.maps && window.google.maps.Map));
          setIsMapLoaded(true);
          
          // Add a small delay to ensure the map container is ready
          setTimeout(() => {
            console.log('🗺️ GoogleMapsIntegration: Calling initializeMap after delay');
            initializeMap();
          }, 100);
        });
      } catch (error) {
        clearTimeout(timeoutId); // Clear timeout since we caught an error
        console.error('🗺️ GoogleMapsIntegration: Error loading Google Maps:', error);
        console.error('🗺️ GoogleMapsIntegration: Error details:', {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          name: error instanceof Error ? error.name : 'Unknown'
        });
        setMapError('Failed to load Google Maps API');
        toast({
          title: "Map Error",
          description: `Failed to load Google Maps: ${error instanceof Error ? error.message : String(error)}`,
          variant: "destructive",
        });
      }
    };

    loadMaps();
  }, [GOOGLE_MAPS_API_KEY, toast]);

  // Cleanup effect for map instance
  useEffect(() => {
    return () => {
      // Clean up markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      
      // Clear map instance reference
      mapInstanceRef.current = null;
    };
  }, []);

  // Initialize the map
  const initializeMap = () => {
    console.log('🗺️ GoogleMapsIntegration: initializeMap called');
    console.log('🗺️ GoogleMapsIntegration: mapRef.current:', mapRef.current);
    console.log('🗺️ GoogleMapsIntegration: window.google:', window.google);
    console.log('🗺️ GoogleMapsIntegration: window.google.maps:', window.google?.maps);
    
    if (!mapRef.current || !window.google) {
      console.warn('🗺️ GoogleMapsIntegration: Cannot initialize map - missing ref or Google Maps');
      console.log('🗺️ GoogleMapsIntegration: mapRef.current:', mapRef.current);
      console.log('🗺️ GoogleMapsIntegration: window.google:', window.google);
      return;
    }

    try {
      console.log('🗺️ GoogleMapsIntegration: Creating Google Maps instance');
      const map = new window.google.maps.Map(mapRef.current, {
        zoom: 10,
        center: { lat: 0, lng: 0 }, // Will be updated when location data is available
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          }
        ]
      });

      mapInstanceRef.current = map;
      console.log('🗺️ GoogleMapsIntegration: Map instance created successfully:', map);
      console.log('🗺️ GoogleMapsIntegration: Map container element:', mapRef.current);
      
      // Update map when location data changes
      updateMapView();
      
    } catch (error) {
      console.error('🗺️ GoogleMapsIntegration: Error initializing map:', error);
      setMapError('Failed to initialize map');
    }
  };

  // Update map view and markers
  const updateMapView = () => {
    console.log('🗺️ GoogleMapsIntegration: updateMapView called');
    console.log('🗺️ GoogleMapsIntegration: mapInstanceRef.current:', mapInstanceRef.current);
    console.log('🗺️ GoogleMapsIntegration: myLocation:', myLocation);
    console.log('🗺️ GoogleMapsIntegration: partnerLocation:', partnerLocation);
    console.log('🗺️ GoogleMapsIntegration: showPartnerLocation:', showPartnerLocation);
    
    if (!mapInstanceRef.current) {
      console.warn('🗺️ GoogleMapsIntegration: Map instance not available');
      return;
    }

    // Clear existing markers
    console.log('🗺️ GoogleMapsIntegration: Clearing existing markers:', markersRef.current.length);
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    let centerLat = 0;
    let centerLng = 0;
    let zoom = 10;

    // Determine map center and zoom
    if (myLocation && partnerLocation && showPartnerLocation) {
      centerLat = (myLocation.latitude + partnerLocation.latitude) / 2;
      centerLng = (myLocation.longitude + partnerLocation.longitude) / 2;
      zoom = 8;
      console.log('🗺️ GoogleMapsIntegration: Centering on both locations');
    } else if (myLocation) {
      centerLat = myLocation.latitude;
      centerLng = myLocation.longitude;
      console.log('🗺️ GoogleMapsIntegration: Centering on my location');
    } else if (partnerLocation && showPartnerLocation) {
      centerLat = partnerLocation.latitude;
      centerLng = partnerLocation.longitude;
      console.log('🗺️ GoogleMapsIntegration: Centering on partner location');
    } else {
      console.warn('🗺️ GoogleMapsIntegration: No valid location data for centering');
      return;
    }

    console.log('🗺️ GoogleMapsIntegration: Setting map center to:', centerLat, centerLng, 'zoom:', zoom);
    // Update map center
    mapInstanceRef.current.setCenter({ lat: centerLat, lng: centerLng });
    mapInstanceRef.current.setZoom(zoom);

    // Add markers
    if (myLocation) {
      console.log('🗺️ GoogleMapsIntegration: Creating my marker at:', myLocation.latitude, myLocation.longitude);
      const myMarker = new window.google.maps.Marker({
        position: { lat: myLocation.latitude, lng: myLocation.longitude },
        map: mapInstanceRef.current,
        title: 'Your Location',
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" fill="#3B82F6" stroke="white" stroke-width="2"/>
              <text x="12" y="16" text-anchor="middle" fill="white" font-size="12" font-weight="bold">U</text>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(24, 24),
          anchor: new window.google.maps.Point(12, 12)
        }
      });
      markersRef.current.push(myMarker);
      console.log('🗺️ GoogleMapsIntegration: My marker created and added');
    }

    if (partnerLocation && showPartnerLocation) {
      console.log('🗺️ GoogleMapsIntegration: Creating partner marker at:', partnerLocation.latitude, partnerLocation.longitude);
      const partnerMarker = new window.google.maps.Marker({
        position: { lat: partnerLocation.latitude, lng: partnerLocation.longitude },
        map: mapInstanceRef.current,
        title: `${partnerName || 'Partner'}'s Location`,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" fill="#EF4444" stroke="white" stroke-width="2"/>
              <text x="12" y="16" text-anchor="middle" fill="white" font-size="12" font-weight="bold">P</text>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(24, 24),
          anchor: new window.google.maps.Point(12, 12)
        }
      });
      markersRef.current.push(partnerMarker);
      console.log('🗺️ GoogleMapsIntegration: Partner marker created and added');
    }

    // Add line between locations if both are visible
    if (myLocation && partnerLocation && showPartnerLocation) {
      console.log('🗺️ GoogleMapsIntegration: Creating connection line');
      const line = new window.google.maps.Polyline({
        path: [
          { lat: myLocation.latitude, lng: myLocation.longitude },
          { lat: partnerLocation.latitude, lng: partnerLocation.longitude }
        ],
        geodesic: true,
        strokeColor: '#8B5CF6',
        strokeOpacity: 0.8,
        strokeWeight: 3
      });
      line.setMap(mapInstanceRef.current);
      console.log('🗺️ GoogleMapsIntegration: Connection line created');
    }
    
    console.log('🗺️ GoogleMapsIntegration: Total markers:', markersRef.current.length);
  };

  // Load my location data
  useEffect(() => {
    if (!user) return;
    
    const locationRef = doc(firestore, 'userLocations', user.uid);
    const unsubscribe = onSnapshot(locationRef, 
      (doc) => {
        console.log('🗺️ GoogleMapsIntegration: My location snapshot received', doc.exists());
        if (doc.exists()) {
          const data = doc.data();
          console.log('🗺️ GoogleMapsIntegration: My location data:', data);
          
          // Validate that we have the required location data
          if (data.latitude && data.longitude) {
            try {
              console.log('🗺️ GoogleMapsIntegration: Processing valid location data');
              setMyLocation({
                latitude: data.latitude || 0,
                longitude: data.longitude || 0,
                accuracy: data.accuracy || 0,
                timestamp: data.timestamp && typeof data.timestamp.toDate === 'function' 
                  ? data.timestamp.toDate() 
                  : new Date(),
                address: data.address || ''
              });
              setIsLocationShared(true);
              console.log('🗺️ GoogleMapsIntegration: My location set successfully');
            } catch (error) {
              console.error('🗺️ GoogleMapsIntegration: Error processing my location data:', error, data);
              setMyLocation(null);
              setIsLocationShared(false);
            }
          } else {
            console.warn('🗺️ GoogleMapsIntegration: Invalid location data received:', data);
            setMyLocation(null);
            setIsLocationShared(false);
          }
        } else {
          console.log('🗺️ GoogleMapsIntegration: No location document found');
          setMyLocation(null);
          setIsLocationShared(false);
        }
      },
      (error) => {
        console.error('Error loading my location:', error);
        // Don't show toast for permission-denied errors
        if (error.code !== 'permission-denied') {
          toast({
            title: "Error",
            description: "Failed to load your location data.",
            variant: "destructive",
          });
        }
      }
    );

    return () => unsubscribe();
  }, [user, firestore, toast]);

  // Load partner location data
  useEffect(() => {
    if (!partnerId) return;
    
    const partnerLocationRef = doc(firestore, 'userLocations', partnerId);
    const unsubscribe = onSnapshot(partnerLocationRef, 
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          
          // Validate that we have the required location data
          if (data.latitude && data.longitude) {
            try {
              setPartnerLocation({
                latitude: data.latitude || 0,
                longitude: data.longitude || 0,
                accuracy: data.accuracy || 0,
                timestamp: data.timestamp && typeof data.timestamp.toDate === 'function' 
                  ? data.timestamp.toDate() 
                  : new Date(),
                address: data.address || ''
              });
            } catch (error) {
              console.error('Error processing partner location data:', error, data);
              setPartnerLocation(null);
            }
          } else {
            console.warn('Invalid partner location data received:', data);
            setPartnerLocation(null);
          }
        } else {
          setPartnerLocation(null);
        }
      },
      (error) => {
        console.error('Error loading partner location:', error);
        // Don't show toast for permission-denied errors
        if (error.code !== 'permission-denied') {
          toast({
            title: "Error",
            description: "Failed to load partner location data.",
            variant: "destructive",
          });
        }
      }
    );

    return () => unsubscribe();
  }, [partnerId, firestore, toast]);

  // Calculate distance when both locations are available
  useEffect(() => {
    if (myLocation && partnerLocation && showPartnerLocation) {
      const dist = calculateDistance(
        myLocation.latitude,
        myLocation.longitude,
        partnerLocation.latitude,
        partnerLocation.longitude
      );
      setDistance(dist);
    } else {
      setDistance(null);
    }
  }, [myLocation, partnerLocation, showPartnerLocation]);

  // Update map when location data changes
  useEffect(() => {
    if (isMapLoaded) {
      updateMapView();
    }
  }, [myLocation, partnerLocation, showPartnerLocation, isMapLoaded]);

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "Geolocation is not supported by this browser.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        });
      });

      const { latitude, longitude, accuracy } = position.coords;
      
      // Get address using reverse geocoding
      let address = '';
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
        );
        const data = await response.json();
        address = data.display_name || '';
      } catch (error) {
        console.error('Error getting address:', error);
      }

      const locationData = {
        latitude,
        longitude,
        accuracy,
        timestamp: serverTimestamp(),
        address
      };

      await setDoc(doc(firestore, 'userLocations', user!.uid), locationData, { merge: true });

      toast({
        title: "Location Updated",
        description: "Your location has been shared successfully!",
      });

    } catch (error: any) {
      console.error('Error getting location:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to get your location.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const shareLocation = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      await getCurrentLocation();
    } finally {
      setIsLoading(false);
    }
  };

  const sendLocationReminder = async () => {
    if (!partnerId || !user) return;

    try {
      await addDoc(collection(firestore, 'notifications'), {
        userId: partnerId,
        type: 'location_reminder',
        title: 'Location Sharing Reminder',
        message: `${user.displayName || 'Your partner'} wants to see your location!`,
        timestamp: serverTimestamp(),
        read: false,
        data: {
          requesterId: user.uid,
          requesterName: user.displayName || 'Your partner'
        }
      });

      toast({
        title: "Reminder Sent",
        description: "Location sharing reminder sent to your partner!",
      });
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast({
        title: "Error",
        description: "Failed to send reminder.",
        variant: "destructive",
      });
    }
  };

  if (mapError) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="text-center text-red-500">
            <MapPin className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">{mapError}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Please check your Google Maps API key configuration.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Location Map
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Location Controls */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={shareLocation}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
            {isLocationShared ? 'Update Location' : 'Share Location'}
          </Button>

          {partnerId && (
            <>
              <Button
                onClick={() => setShowPartnerLocation(!showPartnerLocation)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                disabled={!partnerLocation}
              >
                {showPartnerLocation ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                {showPartnerLocation ? 'Hide Partner' : 'Show Partner'}
              </Button>

              {!partnerLocation && (
                <Button
                  onClick={sendLocationReminder}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  Send Reminder
                </Button>
              )}
            </>
          )}
        </div>

        {/* Map Container */}
        <div className="w-full h-64 rounded-lg border-2 border-dashed border-muted-foreground/25 overflow-hidden">
          {!isMapLoaded ? (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 mx-auto mb-2 text-muted-foreground animate-spin" />
                <p className="text-sm text-muted-foreground">Loading Google Maps...</p>
                <p className="text-xs text-muted-foreground mt-1">API Key: {GOOGLE_MAPS_API_KEY ? '✅ Loaded' : '❌ Missing'}</p>
              </div>
            </div>
          ) : mapError ? (
            <div className="w-full h-full bg-red-50 flex items-center justify-center">
              <div className="text-center">
                <p className="text-sm text-red-600">Map Error: {mapError}</p>
                <p className="text-xs text-red-500 mt-1">Check console for details</p>
              </div>
            </div>
          ) : (
            <div 
              ref={mapRef} 
              className="w-full h-full" 
              style={{ minHeight: '256px' }}
              onLoad={() => console.log('🗺️ GoogleMapsIntegration: Map container div loaded')}
            />
          )}
        </div>

        {/* Location Indicators */}
        <div className="flex justify-center gap-4 mt-2">
          {myLocation && (
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-muted-foreground">You</span>
            </div>
          )}
          {partnerLocation && showPartnerLocation && (
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-muted-foreground">{partnerName || 'Partner'}</span>
            </div>
          )}
        </div>

        {/* Distance Display */}
        {distance !== null && (
          <div className="text-center mt-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full">
              <Ruler className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                {distance.toFixed(1)} km apart
              </span>
            </div>
          </div>
        )}

        {/* Location Status */}
        <div className="mt-2 text-center text-xs text-muted-foreground">
          {myLocation ? (
            <span className="text-green-600">✅ Your location shared</span>
          ) : (
            <span className="text-orange-600">📍 Click "Share Location" to get started</span>
          )}
          {partnerId && (
            <>
              <span className="mx-2">•</span>
              {partnerLocation ? (
                <span className="text-green-600">✅ Partner location available</span>
              ) : (
                <span className="text-orange-600">📍 Partner hasn't shared location yet</span>
              )}
            </>
          )}
        </div>

        {/* Location Info */}
        {myLocation && (
          <div className="text-xs text-muted-foreground text-center">
            <p>Last updated: {myLocation.timestamp.toLocaleString()}</p>
            {myLocation.address && (
              <p className="truncate" title={myLocation.address}>
                {myLocation.address}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
