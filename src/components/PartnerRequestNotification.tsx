'use client';

import {
  collection,
  doc,
  getDoc,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { useCollection, useDoc, useFirebase, useUser } from '@/firebase';
import { Button } from './ui/button';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './ui/card';
import { useToast } from '@/hooks/use-toast';
import { useMemo } from 'react';
import { useMemoFirebase } from '@/firebase/provider';

export function PartnerRequestNotification() {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  // Load current user's account to check if already linked
  const userAccountRef = useMemoFirebase(
    () => (user ? doc(firestore, 'userAccounts', user.uid) : null),
    [user, firestore]
  );
  const { data: userAccount } = useDoc(userAccountRef);

  const partnerRequestsQuery = useMemoFirebase(() => {
    if (!user) return null;
    if (userAccount?.partnerAccountId) return null; // already linked; suppress invite banner
    return query(
      collection(firestore, 'partnerRequests'),
      where('requestedAccountId', '==', user.uid),
      where('status', '==', 'pending')
    );
  }, [firestore, user, userAccount?.partnerAccountId]);

  const { data: requests, isLoading } = useCollection(partnerRequestsQuery);

  const handleAccept = async (request: any) => {
    if (!user || !firestore) return;

    try {
      const batch = writeBatch(firestore);

      // 1. Update the request status to 'accepted'
      const requestRef = doc(firestore, 'partnerRequests', request.id);
      batch.update(requestRef, { status: 'accepted' });

      // 2. Denormalize usernames on both user accounts and set partner ids
      const currentUserRef = doc(firestore, 'userAccounts', user.uid);
      const requestingUserRef = doc(
        firestore,
        'userAccounts',
        request.requestingAccountId
      );
      const [currentSnap, requestingSnap] = await Promise.all([
        getDoc(currentUserRef),
        getDoc(requestingUserRef),
      ]);
      const currentUsername = currentSnap.exists() ? (currentSnap.data() as any).username : null;
      const requestingUsername = requestingSnap.exists() ? (requestingSnap.data() as any).username : null;

      batch.update(currentUserRef, {
        partnerAccountId: request.requestingAccountId,
        partnerUsername: requestingUsername || null,
      });
      batch.update(requestingUserRef, {
        partnerAccountId: user.uid,
        partnerUsername: currentUsername || null,
      });

      await batch.commit();

      toast({
        title: 'You are now linked!',
        description: 'You can now interact with your partner.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to accept request',
        description: error.message,
      });
    }
  };

  const handleDecline = async (requestId: string) => {
    if (!firestore) return;
    try {
      const requestRef = doc(firestore, 'partnerRequests', requestId);
      const batch = writeBatch(firestore);
      batch.update(requestRef, { status: 'rejected' });
      await batch.commit();
      toast({
        title: 'Request Declined',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to decline request',
      });
    }
  };

  if (isLoading || userAccount?.partnerAccountId || !requests || requests.length === 0) {
    return null;
  }

  // We'll just show the first pending request for simplicity
  const firstRequest = requests[0];
  return (
    <div className="absolute inset-x-0 top-4 z-50 flex justify-center">
      <Card className="w-[320px] bg-card/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Partner Request</CardTitle>
          <CardDescription>
            You have a new partner link request!
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => handleDecline(firstRequest.id)}
          >
            Decline
          </Button>
          <Button onClick={() => handleAccept(firstRequest)}>Accept</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
