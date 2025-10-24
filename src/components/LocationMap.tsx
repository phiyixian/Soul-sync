'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Navigation, Send, RefreshCw, Eye, EyeOff, Ruler } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirebase } from '@/firebase';
import { doc, updateDoc, onSnapshot, addDoc, collection, serverTimestamp, setDoc } from 'firebase/firestore';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
  address?: string;
}

interface LocationMapProps {
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

// Simple Map Component using iframe to avoid Leaflet issues
function SimpleMap({ 
  myLocation, 
  partnerLocation, 
  showPartnerLocation, 
  distance 
}: {
  myLocation: LocationData | null;
  partnerLocation: LocationData | null;
  showPartnerLocation: boolean;
  distance: number | null;
}) {
  const mapUrl = useMemo(() => {
    if (!myLocation && !partnerLocation) return '';
    
    let centerLat = 0;
    let centerLng = 0;
    let zoom = 10;
    
    if (myLocation && partnerLocation && showPartnerLocation) {
      // Center between both locations
      centerLat = (myLocation.latitude + partnerLocation.latitude) / 2;
      centerLng = (myLocation.longitude + partnerLocation.longitude) / 2;
      zoom = 8;
    } else if (myLocation) {
      centerLat = myLocation.latitude;
      centerLng = myLocation.longitude;
    } else if (partnerLocation && showPartnerLocation) {
      centerLat = partnerLocation.latitude;
      centerLng = partnerLocation.longitude;
    }
    
    // Google Maps Embed API only supports basic view mode
    // We'll use a simple view centered on the location(s)
    return `https://www.google.com/maps/embed/v1/view?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dOWWgUYxO_8Q&center=${centerLat},${centerLng}&zoom=${zoom}`;
  }, [myLocation, partnerLocation, showPartnerLocation]);

  if (!mapUrl) {
    return (
      <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center">
          <MapPin className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No location data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-64 rounded-lg border-2 border-dashed border-muted-foreground/25 overflow-hidden">
      <iframe
        src={mapUrl}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="Location Map"
      />
    </div>
  );
}

export function LocationMap({ partnerId, partnerName }: LocationMapProps) {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  const [myLocation, setMyLocation] = useState<LocationData | null>(null);
  const [partnerLocation, setPartnerLocation] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocationShared, setIsLocationShared] = useState(false);
  const [showPartnerLocation, setShowPartnerLocation] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);

  // Load my location data
  useEffect(() => {
    if (!user) return;
    
    const locationRef = doc(firestore, 'userLocations', user.uid);
    const unsubscribe = onSnapshot(locationRef, 
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setMyLocation({
            latitude: data.latitude,
            longitude: data.longitude,
            accuracy: data.accuracy,
            timestamp: data.timestamp?.toDate() || new Date(),
            address: data.address
          });
          setIsLocationShared(true);
        } else {
          setIsLocationShared(false);
        }
      },
      (error) => {
        console.error('Error listening to my location:', error);
        setIsLocationShared(false);
        if (error.code !== 'permission-denied') {
          toast({
            variant: 'destructive',
            title: 'Location Error',
            description: 'Could not load your location data.',
            className: 'bounce-in',
          });
        }
      }
    );

    return () => unsubscribe();
  }, [user, firestore, toast]);

  // Load partner location data
  useEffect(() => {
    if (!partnerId || !firestore) return;
    
    const partnerLocationRef = doc(firestore, 'userLocations', partnerId);
    const unsubscribe = onSnapshot(partnerLocationRef, 
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setPartnerLocation({
            latitude: data.latitude,
            longitude: data.longitude,
            accuracy: data.accuracy,
            timestamp: data.timestamp?.toDate() || new Date(),
            address: data.address
          });
        } else {
          setPartnerLocation(null);
        }
      },
      (error) => {
        console.error('Error listening to partner location:', error);
        setPartnerLocation(null);
        if (error.code !== 'permission-denied') {
          toast({
            variant: 'destructive',
            title: 'Location Error',
            description: 'Could not load partner location.',
            className: 'bounce-in',
          });
        }
      }
    );

    return () => unsubscribe();
  }, [partnerId, firestore, toast]);

  // Calculate distance when both locations are available
  useEffect(() => {
    if (myLocation && partnerLocation) {
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
  }, [myLocation, partnerLocation]);

  const getCurrentLocation = async (): Promise<LocationData> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          
          // Get address from coordinates (using reverse geocoding)
          let address = '';
          try {
            const response = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
            );
            const data = await response.json();
            address = `${data.city || ''}, ${data.principalSubdivision || ''}, ${data.countryName || ''}`.trim();
          } catch (error) {
            console.log('Could not get address:', error);
          }

          resolve({
            latitude,
            longitude,
            accuracy,
            timestamp: new Date(),
            address
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  };

  const shareLocation = async () => {
    if (!user || !firestore) return;
    
    setIsLoading(true);
    try {
      const location = await getCurrentLocation();
      
      // Save location to Firestore using setDoc with merge to handle both create and update
      const locationRef = doc(firestore, 'userLocations', user.uid);
      await setDoc(locationRef, {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        timestamp: serverTimestamp(),
        address: location.address,
        userId: user.uid
      }, { merge: true });

      setMyLocation(location);
      setIsLocationShared(true);
      
      toast({
        title: '📍 Location Shared!',
        description: 'Your location has been shared with your partner.',
        className: 'bounce-in',
      });
      
    } catch (error: any) {
      console.error('Error getting location:', error);
      toast({
        variant: 'destructive',
        title: 'Location Error',
        description: error.message || 'Could not get your location. Please check permissions.',
        className: 'bounce-in',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendLocationReminder = async () => {
    if (!user || !partnerId || !firestore) return;
    
    try {
      // Send notification to partner
      await addDoc(collection(firestore, 'users', partnerId, 'notifications'), {
        type: 'location_reminder',
        from: user.uid,
        timestamp: serverTimestamp(),
        description: '📍 Location Reminder',
        content: `${user.displayName || 'Your partner'} wants to see your location! Please share your location.`,
        processed: false,
      });

      toast({
        title: '📨 Reminder Sent!',
        description: `Location reminder sent to ${partnerName || 'your partner'}.`,
        className: 'bounce-in',
      });
      
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast({
        variant: 'destructive',
        title: 'Reminder Failed',
        description: 'Could not send location reminder. Please try again.',
        className: 'bounce-in',
      });
    }
  };

  const togglePartnerLocation = () => {
    if (partnerLocation) {
      setShowPartnerLocation(!showPartnerLocation);
    }
  };

  const refreshLocation = async () => {
    if (isLocationShared) {
      await shareLocation();
    }
  };

  // Don't render map if no location data
  if (!myLocation && !partnerLocation) {
    return (
      <Card className="cute-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location Sharing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-8">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Share your location to see the interactive map!</p>
            <Button
              onClick={shareLocation}
              variant="default"
              size="sm"
              className="cute-button mt-4"
              disabled={isLoading}
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Navigation className="h-4 w-4" />
              )}
              Share Location
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="cute-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Location Sharing
          {distance !== null && (
            <span className="text-sm font-normal cute-text-muted">
              <Ruler className="h-4 w-4 inline mr-1" />
              {distance.toFixed(1)} km apart
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* My Location Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">My Location</span>
            <div className="flex gap-2">
              {isLocationShared ? (
                <>
                  <Button
                    onClick={refreshLocation}
                    variant="outline"
                    size="sm"
                    className="cute-button"
                    disabled={isLoading}
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                  <span className="text-xs text-green-600">📍 Shared</span>
                </>
              ) : (
                <Button
                  onClick={shareLocation}
                  variant="default"
                  size="sm"
                  className="cute-button"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Navigation className="h-4 w-4" />
                  )}
                  Share Location
                </Button>
              )}
            </div>
          </div>
          
          {myLocation && (
            <div className="text-xs text-muted-foreground">
              <p>📍 {myLocation.address || `${myLocation.latitude.toFixed(4)}, ${myLocation.longitude.toFixed(4)}`}</p>
              <p>🕒 Updated: {myLocation.timestamp.toLocaleTimeString()}</p>
            </div>
          )}
        </div>

        {/* Partner Location Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {partnerName ? `${partnerName}'s Location` : "Partner's Location"}
            </span>
            <div className="flex gap-2">
              {partnerLocation ? (
                <Button
                  onClick={togglePartnerLocation}
                  variant="outline"
                  size="sm"
                  className="cute-button"
                >
                  {showPartnerLocation ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  {showPartnerLocation ? 'Hide' : 'View'}
                </Button>
              ) : (
                <Button
                  onClick={sendLocationReminder}
                  variant="outline"
                  size="sm"
                  className="cute-button"
                >
                  <Send className="h-4 w-4" />
                  Send Reminder
                </Button>
              )}
            </div>
          </div>
          
          {partnerLocation ? (
            <div className="text-xs text-muted-foreground">
              <p>📍 {partnerLocation.address || `${partnerLocation.latitude.toFixed(4)}, ${partnerLocation.longitude.toFixed(4)}`}</p>
              <p>🕒 Updated: {partnerLocation.timestamp.toLocaleTimeString()}</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Partner hasn't shared their location yet</p>
          )}
        </div>

        {/* Interactive Map */}
        {(myLocation || partnerLocation) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Interactive Map</span>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowPartnerLocation(false)}
                  variant="outline"
                  size="sm"
                  className="cute-button"
                  disabled={!myLocation}
                >
                  🏠 Me Only
                </Button>
                {partnerLocation && (
                  <Button
                    onClick={() => setShowPartnerLocation(true)}
                    variant="outline"
                    size="sm"
                    className="cute-button"
                  >
                    👥 Both
                  </Button>
                )}
              </div>
            </div>
            
            <SimpleMap
              myLocation={myLocation}
              partnerLocation={partnerLocation}
              showPartnerLocation={showPartnerLocation}
              distance={distance}
            />
            
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
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full">
                  <Ruler className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">
                    {distance.toFixed(1)} km apart
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}