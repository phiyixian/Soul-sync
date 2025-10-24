'use client';

import { useState, useEffect } from 'react';
import { useAuth, useFirestore } from '@/firebase';
import { GoogleCalendarService } from '@/lib/google-calendar-service';
import { CalendarEvent, CalendarConfig } from '@/lib/calendar-types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';

export function CalendarDisplay() {
  const [isLoading, setIsLoading] = useState(true);
  const [calendarConfig, setCalendarConfig] = useState<CalendarConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentEvent, setCurrentEvent] = useState<CalendarEvent | null>(null);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);

  const auth = useAuth();
  const firestore = useFirestore();

  const loadCalendarEvents = async () => {
    if (!calendarConfig?.accessToken) return;
    
    try {
      setIsLoadingEvents(true);
      console.log('Loading calendar events...');
      
      const calendarService = new GoogleCalendarService(calendarConfig.accessToken);
      const upcomingEvents = await calendarService.getUpcomingEvents('primary', 7); // Next 7 days
      const currentEventData = await calendarService.getCurrentEvent('primary');
      
      console.log('Loaded events:', upcomingEvents.length);
      console.log('Current event:', currentEventData);
      
      setEvents(upcomingEvents);
      setCurrentEvent(currentEventData);
    } catch (error) {
      console.error('Error loading calendar events:', error);
      setError('Failed to load calendar events');
    } finally {
      setIsLoadingEvents(false);
    }
  };

  useEffect(() => {
    if (!auth || !firestore || !auth.currentUser?.uid) {
      setIsLoading(false);
      return;
    }

    console.log('CalendarDisplay: Setting up listener for user:', auth.currentUser.uid);

    try {
      const configRef = doc(firestore, 'userAccounts', auth.currentUser.uid);
      const unsubscribe = onSnapshot(configRef, (doc) => {
        try {
          console.log('CalendarDisplay: Received user data:', doc.exists());
          if (doc.exists()) {
            const userData = doc.data();
            const config = userData?.calendarConfig as CalendarConfig;
            console.log('CalendarDisplay: Calendar config:', config);
            setCalendarConfig(config || { enabled: false, syncEnabled: false, shareWithPartner: false });
            
            // Calendar config will trigger loadCalendarEvents via useEffect
          } else {
            console.log('CalendarDisplay: User document does not exist');
            setCalendarConfig({ enabled: false, syncEnabled: false, shareWithPartner: false });
            setError('Please connect your Google Calendar to see your schedule');
          }
        } catch (error) {
          console.error('Error loading calendar config:', error);
          setError('Failed to load calendar configuration');
        } finally {
          setIsLoading(false);
        }
      }, (error) => {
        console.error('CalendarDisplay: onSnapshot error:', error);
        setError('Failed to load calendar configuration');
        setIsLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up calendar listener:', error);
      setError('Failed to initialize calendar');
      setIsLoading(false);
    }
  }, [auth, firestore]);

  // Load calendar events when config is available
  useEffect(() => {
    if (calendarConfig?.enabled && calendarConfig?.accessToken) {
      loadCalendarEvents();
    }
  }, [calendarConfig]);

  const connectGoogleCalendar = async () => {
    if (!auth || isConnecting) return;

    try {
      setIsConnecting(true);
      setError(null);
      
      console.log('Starting Google Calendar connection...');
      
      // Use popup but handle COOP issues gracefully
      const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
      
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
      provider.addScope('https://www.googleapis.com/auth/userinfo.email');
      provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
      
      console.log('Opening Google popup...');
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Get the access token from the credential
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;

      console.log('Google Calendar connection result:', {
        user: user.uid,
        credential: !!credential,
        accessToken: !!accessToken,
        accessTokenLength: accessToken?.length
      });

      if (accessToken) {
        // Update calendar configuration in user's account
        const userAccountRef = doc(firestore, 'userAccounts', user.uid);
        console.log('Updating user document with calendar config...');
        await updateDoc(userAccountRef, {
          calendarConfig: {
            enabled: true,
            syncEnabled: true,
            shareWithPartner: true,
            accessToken: accessToken,
          }
        });
        console.log('Google Calendar access updated successfully');
        setError(null); // Clear any existing errors
        
        // Force a refresh of the calendar config
        console.log('Refreshing calendar config...');
        setTimeout(() => {
          console.log('Calendar config should be updated now');
        }, 1000);
      } else {
        console.error('No access token received from Google Calendar connection');
        setError('Failed to get calendar access. Please try again.');
      }
    } catch (err: any) {
      console.error('Google Calendar connection failed:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Calendar connection cancelled. Please try again.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked. Please allow popups and try again.');
      } else if (err.message && err.message.includes('Cross-Origin-Opener-Policy')) {
        // This is just a warning, don't treat it as an error
        console.warn('COOP warning (this is normal):', err.message);
        // Don't set an error, the authentication might still work
      } else {
        setError('Failed to connect Google Calendar. Please try again.');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="cute-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!calendarConfig?.enabled || !auth?.currentUser?.uid) {
    return (
      <Card className="cute-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar
          </CardTitle>
          <CardDescription>
            Connect your Google Calendar to see your schedule
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Button 
              onClick={connectGoogleCalendar} 
              className="cute-button w-full"
              disabled={isConnecting}
            >
              {isConnecting ? 'Connecting...' : 'Connect Google Calendar'}
            </Button>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatTime = (dateTime: string | undefined) => {
    if (!dateTime) return '';
    const date = new Date(dateTime);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (dateTime: string | undefined) => {
    if (!dateTime) return '';
    const date = new Date(dateTime);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric'
    });
  };

  const getWeekDays = () => {
    const today = new Date();
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDateString = event.start.dateTime || event.start.date;
      if (!eventDateString) return false;
      const eventDate = new Date(eventDateString);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const nextDay = () => {
    setCurrentDayIndex((prev) => Math.min(prev + 1, 6));
  };

  const prevDay = () => {
    setCurrentDayIndex((prev) => Math.max(prev - 1, 0));
  };

  const goToToday = () => {
    setCurrentDayIndex(0);
  };

  return (
    <div className="space-y-4">
          {/* Current Status */}
          <div className={`p-3 rounded-lg border ${currentEvent ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${currentEvent ? 'bg-blue-500' : 'bg-green-500'}`}></div>
              <span className={`text-sm font-medium ${currentEvent ? 'text-blue-700' : 'text-green-700'}`}>
                {currentEvent ? 'In Meeting' : 'Idle'}
              </span>
            </div>
            {currentEvent && (
              <div className="mt-2">
                <p className="text-sm font-medium text-blue-800">{currentEvent.summary}</p>
                <p className="text-xs text-blue-600">
                  {formatTime(currentEvent.start.dateTime)} - {formatTime(currentEvent.end.dateTime)}
                </p>
              </div>
            )}
          </div>

          {/* Calendar Carousel */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Schedule
              </h4>
              <Button 
                onClick={goToToday}
                variant="outline" 
                size="sm"
                className="text-xs"
              >
                Today
              </Button>
            </div>
            
            {isLoadingEvents ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Day Navigation */}
                <div className="flex items-center justify-between">
                  <Button 
                    onClick={prevDay}
                    variant="outline"
                    size="sm"
                    disabled={currentDayIndex === 0}
                    className="p-2"
                  >
                    ←
                  </Button>
                  
                  <div className="text-center">
                    <p className="text-sm font-medium">
                      {getWeekDays()[currentDayIndex].toLocaleDateString('en-US', { 
                        weekday: 'long',
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {currentDayIndex + 1} of 7 days
                    </p>
                  </div>
                  
                  <Button 
                    onClick={nextDay}
                    variant="outline"
                    size="sm"
                    disabled={currentDayIndex === 6}
                    className="p-2"
                  >
                    →
                  </Button>
                </div>

                {/* Current Day Events */}
                <div className={`p-4 rounded-lg border ${isToday(getWeekDays()[currentDayIndex]) ? 'bg-primary/10 border-primary' : 'bg-background/50 border-border'}`}>
                  <div className="space-y-3">
                    {getEventsForDate(getWeekDays()[currentDayIndex]).length > 0 ? (
                      getEventsForDate(getWeekDays()[currentDayIndex]).map((event, eventIndex) => (
                        <div key={event.id || eventIndex} className="p-3 bg-background/80 rounded-lg border">
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{event.summary}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                <Clock className="h-3 w-3" />
                                <span>{formatTime(event.start.dateTime)}</span>
                                {event.location && (
                                  <>
                                    <MapPin className="h-3 w-3" />
                                    <span className="truncate">{event.location}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No events scheduled</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

    </div>
  );
}