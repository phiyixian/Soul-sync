'use client';

import { useCollection, useFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { useMemo, useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Bell, Gift, Heart, Send, Inbox, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useMemoFirebase } from '@/firebase/provider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function NotificationsPage() {
  const { user } = useUser();
  const { firestore } = useFirebase();

  // Get user account to find partner ID
  const userAccountRef = useMemoFirebase(
    () => (user ? doc(firestore, 'userAccounts', user.uid) : null),
    [user, firestore]
  );
  const { data: userAccount } = useDoc(userAccountRef);
  const partnerId = userAccount?.partnerAccountId;

  // Query for received notifications (notifications sent TO this user)
  const receivedNotificationsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, `users/${user.uid}/notifications`),
      orderBy('timestamp', 'desc')
    );
  }, [firestore, user]);

  // Query for sent notifications (notifications sent BY this user TO their partner)
  const sentNotificationsQuery = useMemoFirebase(() => {
    if (!user || !partnerId) return null;
    return query(
      collection(firestore, `users/${partnerId}/notifications`),
      orderBy('timestamp', 'desc')
    );
  }, [firestore, user, partnerId]);

  const { data: receivedNotifications, isLoading: receivedLoading } = useCollection(receivedNotificationsQuery);
  const { data: sentNotifications, isLoading: sentLoading } = useCollection(sentNotificationsQuery);

  // Filter sent notifications to only show those sent by current user
  const mySentNotifications = sentNotifications?.filter(notif => notif.from === user?.uid) || [];

  useEffect(() => {
    if (receivedNotifications) {
      receivedNotifications.forEach((notif) => {
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
  }, [receivedNotifications, firestore, user]);

  const renderIcon = (type: string, isSent: boolean = false) => {
    const iconClass = isSent ? "text-blue-500" : "text-primary";
    switch (type) {
      case 'kiss':
        return <Heart className={`h-6 w-6 ${iconClass}`} />;
      case 'gift':
        return <Gift className={`h-6 w-6 ${isSent ? 'text-blue-400' : 'text-yellow-500'}`} />;
      case 'hug':
        return <Heart className={`h-6 w-6 ${iconClass}`} />;
      default:
        return <Bell className={`h-6 w-6 ${isSent ? 'text-blue-400' : 'text-secondary-foreground'}`} />;
    }
  };
  
  const renderContent = (notification: any, isSent: boolean = false) => {
    const timeAgo = notification.timestamp
      ? formatDistanceToNow(notification.timestamp.toDate(), { addSuffix: true })
      : 'Just now';

    const bgClass = isSent ? "bg-blue-50 border-l-4 border-blue-400" : "bg-secondary/50";
    const statusText = isSent ? "Sent" : "Received";

    return (
        <div className={`flex items-center gap-4 p-4 rounded-lg ${bgClass}`}>
            <div className="flex flex-col items-center">
                {renderIcon(notification.type, isSent)}
                <span className="text-xs text-muted-foreground mt-1">{statusText}</span>
            </div>
            <div className="flex-1">
                <p className='font-medium'>{notification.content}</p>
                <p className="text-xs text-muted-foreground">{timeAgo}</p>
            </div>
        </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/home">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Updates</h1>
          <p className="text-muted-foreground">
            See what you&apos;ve sent and received.
          </p>
        </div>
      </header>

      <Tabs defaultValue="received" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="received" className="flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            Received ({receivedNotifications?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Sent ({mySentNotifications?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="space-y-3">
          {receivedLoading && <p>Loading received notifications...</p>}

          {!receivedLoading && (!receivedNotifications || receivedNotifications.length === 0) && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <Inbox className="mx-auto h-12 w-12" />
                  <p className="mt-4">No received notifications yet.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {receivedNotifications && receivedNotifications.length > 0 && (
            <div className="space-y-3">
              {receivedNotifications.map((notif) => (
                <div key={notif.id}>
                  {renderContent(notif, false)}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sent" className="space-y-3">
          {sentLoading && <p>Loading sent notifications...</p>}

          {!sentLoading && (!mySentNotifications || mySentNotifications.length === 0) && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <Send className="mx-auto h-12 w-12" />
                  <p className="mt-4">No sent notifications yet.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {mySentNotifications && mySentNotifications.length > 0 && (
            <div className="space-y-3">
              {mySentNotifications.map((notif) => (
                <div key={notif.id}>
                  {renderContent(notif, true)}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
