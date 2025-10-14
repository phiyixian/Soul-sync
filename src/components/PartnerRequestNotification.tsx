'use client';

import {
  collection,
  doc,
  getDoc,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { useCollection, useFirebase, useUser } from '@/firebase';
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

  const partnerRequestsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, 'partnerRequests'),
      where('requestedAccountId', '==', user.uid),
      where('status', '==', 'pending')
    );
  }, [firestore, user]);

  const { data: requests, isLoading } = useCollection(partnerRequestsQuery);

  const handleAccept = async (request: any) => {
    if (!user || !firestore) return;

    try {
      const batch = writeBatch(firestore);

      // 1. Update the request status to 'accepted'
      const requestRef = doc(firestore, 'partnerRequests', request.id);
      batch.update(requestRef, { status: 'accepted' });

      // 2. Update the current user's partnerAccountId
      const currentUserRef = doc(firestore, 'userAccounts', user.uid);
      batch.update(currentUserRef, {
        partnerAccountId: request.requestingAccountId,
      });

      // 3. Update the requesting user's partnerAccountId
      const requestingUserRef = doc(
        firestore,
        'userAccounts',
        request.requestingAccountId
      );
      batch.update(requestingUserRef, { partnerAccountId: user.uid });

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

  if (isLoading || !requests || requests.length === 0) {
    return null;
  }

  // We'll just show the first pending request for simplicity
  const firstRequest = requests[0];
  return (
    <div className="fixed inset-x-0 top-4 z-50 flex justify-center">
      <Card className="w-[380px] bg-card/90 backdrop-blur-sm">
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
