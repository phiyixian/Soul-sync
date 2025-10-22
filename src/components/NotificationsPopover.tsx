'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirebase, useUser } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { collection, query, where, orderBy } from 'firebase/firestore';
import Link from 'next/link';

interface Notification {
  id: string;
  type: string;
  from: string;
  timestamp: any;
  description: string;
  content: string;
  isRead: boolean;
  actionId?: string;
}

export function NotificationsPopover() {
  const { user } = useUser();
  const { firestore } = useFirebase();

  const notificationsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, `users/${user.uid}/notifications`),
      orderBy('timestamp', 'desc')
    );
  }, [firestore, user?.uid]);

  const { data: notifications } = useCollection(notificationsQuery);

  const unreadCount = notifications?.filter((n: Notification) => !n.isRead).length || 0;

  return (
    <Link href="/home/notifications">
      <Button variant="ghost" size="sm" className="relative p-2">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>
    </Link>
  );
}
