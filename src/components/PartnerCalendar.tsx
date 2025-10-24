'use client';

import { useState, useEffect } from 'react';
import { useAuth, useFirestore } from '@/firebase';
import { GoogleCalendarService } from '@/lib/google-calendar-service';
import { CalendarEvent, PartnerCalendarView } from '@/lib/calendar-types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Users, Link as LinkIcon } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';

interface PartnerCalendarProps {
  partnerId?: string;
  partnerName?: string;
}

export function PartnerCalendar({ partnerId, partnerName }: PartnerCalendarProps) {
  const [partnerCalendar, setPartnerCalendar] = useState<PartnerCalendarView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);

  const auth = useAuth();
  const firestore = useFirestore();

  const formatTime = (dateTime: string | undefined) => {
    if (!dateTime) return '';
    const date = new Date(dateTime);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
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
    if (!partnerCalendar?.events) return [];
    return partnerCalendar.events.filter(event => {
      const eventDate = event.start.dateTime ? new Date(event.start.dateTime) : new Date(event.start.date);
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

  useEffect(() => {
    if (!auth || !firestore || !partnerId) {
      setIsLoading(false);
      return;
    }

    // Listen to partner's calendar data
    const partnerCalendarRef = doc(firestore, 'partnerCalendars', partnerId);
    const unsubscribe = onSnapshot(partnerCalendarRef, (doc) => {
      if (doc.exists()) {
        const calendarData = doc.data() as PartnerCalendarView;
        setPartnerCalendar(calendarData);
      } else {
        setPartnerCalendar(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [auth, firestore, partnerId]);


  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show partner linking prompt if no partner is linked
  if (!partnerId) {
    return (
      <div className="text-center py-8">
        <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground mb-4">No partner linked yet</p>
        <Button className="cute-button" onClick={() => {
          // Navigate to profile page to link partner
          window.location.href = '/home/profile';
        }}>
          <LinkIcon className="h-4 w-4 mr-2" />
          Link Partner
        </Button>
      </div>
    );
  }

  if (!partnerCalendar) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No calendar data available</p>
      </div>
    );
  }

  const currentEvent = partnerCalendar.events.find(event => {
    const now = new Date();
    const startTime = new Date(event.start.dateTime || event.start.date || '');
    const endTime = new Date(event.end.dateTime || event.end.date || '');
    return now >= startTime && now <= endTime;
  });

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
          </div>
    </div>
  );
}
