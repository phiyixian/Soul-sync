'use client';

import { useCollection, useFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { useMemo, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Bell, Gift, Heart } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationsPage() {
  const { user } = useUser();
  const { firestore } = useFirebase();

  const notificationsQuery = useMemo(() => {
    if (!user) return null;
    return query(
      collection(firestore, `users/${user.uid}/notifications`),
      orderBy('timestamp', 'desc')
    );
  }, [firestore, user]);

  const { data: notifications, isLoading } = useCollection(notificationsQuery);

  useEffect(() => {
    if (notifications) {
      notifications.forEach((notif) => {
        if (!notif.isRead) {
          const notifRef = doc(
            firestore,
            `users/${user!.uid}/notifications`,
            notif.id
          );
          updateDoc(notifRef, { isRead: true });
        }
      });
    }
  }, [notifications, firestore, user]);

  const renderIcon = (type: string) => {
    switch (type) {
      case 'kiss':
        return <Heart className="h-6 w-6 text-primary" />;
      case 'gift':
        return <Gift className="h-6 w-6 text-yellow-500" />;
      default:
        return <Bell className="h-6 w-6 text-secondary-foreground" />;
    }
  };
  
  const renderContent = (notification: any) => {
    const timeAgo = notification.timestamp
      ? formatDistanceToNow(notification.timestamp.toDate(), { addSuffix: true })
      : 'Just now';

    return (
        <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50">
            <div>{renderIcon(notification.type)}</div>
            <div className="flex-1">
                <p className='font-medium'>{notification.content}</p>
                <p className="text-xs text-muted-foreground">{timeAgo}</p>
            </div>
        </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Updates</h1>
        <p className="text-muted-foreground">
          See what you&apos;ve missed.
        </p>
      </header>

      {isLoading && <p>Loading notifications...</p>}

      {!isLoading && (!notifications || notifications.length === 0) && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <Bell className="mx-auto h-12 w-12" />
              <p className="mt-4">No new updates yet.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {notifications && notifications.length > 0 && (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <div key={notif.id}>
              {renderContent(notif)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
