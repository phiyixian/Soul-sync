import { CalendarEvent, CalendarListEntry, CalendarConfig } from './calendar-types';

const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

export class GoogleCalendarService {
  private accessToken: string | null = null;

  constructor(accessToken?: string) {
    this.accessToken = accessToken || null;
  }

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    try {
      const response = await fetch(`${GOOGLE_CALENDAR_API_BASE}${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`Google Calendar API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data || {};
    } catch (error) {
      console.error('Google Calendar API request failed:', error);
      throw error;
    }
  }

  async getCalendarList(): Promise<CalendarListEntry[]> {
    const data = await this.makeRequest('/users/me/calendarList');
    return data.items || [];
  }

  async getEvents(
    calendarId: string = 'primary',
    timeMin?: string,
    timeMax?: string,
    maxResults: number = 50
  ): Promise<CalendarEvent[]> {
    try {
      const params = new URLSearchParams({
        maxResults: maxResults.toString(),
        singleEvents: 'true',
        orderBy: 'startTime',
      });

      if (timeMin) params.append('timeMin', timeMin);
      if (timeMax) params.append('timeMax', timeMax);

      const encodedCalendarId = encodeURIComponent(calendarId || 'primary');
      const data = await this.makeRequest(`/calendars/${encodedCalendarId}/events?${params}`);
      return data?.items || [];
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      return [];
    }
  }

  async getUpcomingEvents(calendarId: string = 'primary', days: number = 7): Promise<CalendarEvent[]> {
    const now = new Date();
    const timeMin = now.toISOString();
    const timeMax = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

    return this.getEvents(calendarId, timeMin, timeMax);
  }

  async getTodayEvents(calendarId: string = 'primary'): Promise<CalendarEvent[]> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    return this.getEvents(
      calendarId,
      startOfDay.toISOString(),
      endOfDay.toISOString()
    );
  }

  async getCurrentEvent(calendarId: string = 'primary'): Promise<CalendarEvent | null> {
    const now = new Date();
    const events = await this.getEvents(
      calendarId,
      now.toISOString(),
      new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
    );

    // Find the current event (event that's happening now)
    const currentEvent = events.find(event => {
      const startTime = new Date(event.start.dateTime || event.start.date || '');
      const endTime = new Date(event.end.dateTime || event.end.date || '');
      
      return now >= startTime && now <= endTime;
    });

    return currentEvent || null;
  }

  async getNextEvent(calendarId: string = 'primary'): Promise<CalendarEvent | null> {
    const now = new Date();
    const events = await this.getEvents(
      calendarId,
      now.toISOString(),
      new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    );

    // Find the next upcoming event
    const nextEvent = events.find(event => {
      const startTime = new Date(event.start.dateTime || event.start.date || '');
      return startTime > now;
    });

    return nextEvent || null;
  }

  // Helper method to format event time
  formatEventTime(event: CalendarEvent): string {
    const startTime = new Date(event.start.dateTime || event.start.date || '');
    const endTime = new Date(event.end.dateTime || event.end.date || '');
    
    const isAllDay = !event.start.dateTime;
    
    if (isAllDay) {
      return 'All day';
    }
    
    const startStr = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const endStr = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    return `${startStr} - ${endStr}`;
  }

  // Helper method to get event duration in minutes
  getEventDurationMinutes(event: CalendarEvent): number {
    const startTime = new Date(event.start.dateTime || event.start.date || '');
    const endTime = new Date(event.end.dateTime || event.end.date || '');
    
    return Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
  }

  // Helper method to check if event is happening now
  isEventHappeningNow(event: CalendarEvent): boolean {
    const now = new Date();
    const startTime = new Date(event.start.dateTime || event.start.date || '');
    const endTime = new Date(event.end.dateTime || event.end.date || '');
    
    return now >= startTime && now <= endTime;
  }
}
