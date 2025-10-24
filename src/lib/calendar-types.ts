export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus: 'accepted' | 'declined' | 'tentative' | 'needsAction';
  }>;
  creator?: {
    email: string;
    displayName?: string;
  };
  organizer?: {
    email: string;
    displayName?: string;
  };
  status: 'confirmed' | 'tentative' | 'cancelled';
  visibility: 'default' | 'public' | 'private';
}

export interface CalendarListEntry {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  accessRole: 'owner' | 'reader' | 'writer' | 'freeBusyReader';
  backgroundColor?: string;
  foregroundColor?: string;
}

export interface CalendarConfig {
  enabled: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  calendarId?: string;
  syncEnabled: boolean;
  shareWithPartner: boolean;
}

export interface PartnerCalendarView {
  partnerId: string;
  partnerName: string;
  events: CalendarEvent[];
  lastUpdated: string;
  isOnline: boolean;
}
