'use client';

import { useState } from 'react';
import { CalendarDisplay } from './CalendarDisplay';
import { PartnerCalendar } from './PartnerCalendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Users } from 'lucide-react';

interface CalendarToggleProps {
  partnerId?: string;
  partnerName?: string;
}

export function CalendarToggle({ partnerId, partnerName }: CalendarToggleProps) {
  const [showPartnerCalendar, setShowPartnerCalendar] = useState(false);

  return (
    <Card className="cute-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {showPartnerCalendar ? 'Partner\'s Schedule' : 'My Schedule'}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowPartnerCalendar(false)}
              variant={!showPartnerCalendar ? "default" : "outline"}
              size="sm"
              className="text-xs"
            >
              <Calendar className="h-3 w-3 mr-1" />
              Mine
            </Button>
            <Button
              onClick={() => setShowPartnerCalendar(true)}
              variant={showPartnerCalendar ? "default" : "outline"}
              size="sm"
              className="text-xs"
            >
              <Users className="h-3 w-3 mr-1" />
              Partner
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {showPartnerCalendar ? (
          <PartnerCalendar partnerId={partnerId} partnerName={partnerName} />
        ) : (
          <div className="p-6">
            <CalendarDisplay />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
