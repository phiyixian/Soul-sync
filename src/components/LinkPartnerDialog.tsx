'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFirebase, useUser } from '@/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface LinkPartnerDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function LinkPartnerDialog({
  isOpen,
  onOpenChange,
}: LinkPartnerDialogProps) {
  const [partnerUsername, setPartnerUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();

  const handleSendRequest = async () => {
    if (!user || !firestore) return;

    setIsLoading(true);
    try {
      // 1. Find partner by username
      const usersRef = collection(firestore, 'userAccounts');
      const q = query(usersRef, where('username', '==', partnerUsername));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({
          variant: 'destructive',
          title: 'User not found',
          description: "We couldn't find a user with that username.",
        });
        return;
      }

      const partnerDoc = querySnapshot.docs[0];
      const partnerId = partnerDoc.id;

      if (partnerId === user.uid) {
        toast({
          variant: 'destructive',
          title: 'Oops!',
          description: "You can't link with yourself!",
        });
        return;
      }

      // 2. Create a partner request
      const partnerRequestsRef = collection(firestore, 'partnerRequests');
      await addDoc(partnerRequestsRef, {
        requestingAccountId: user.uid,
        requestedAccountId: partnerId,
        status: 'pending',
        timestamp: serverTimestamp(),
      });

      toast({
        title: 'Request Sent!',
        description: `Your link request has been sent to ${partnerUsername}.`,
      });
      onOpenChange(false);
      setPartnerUsername('');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Something went wrong',
        description: error.message || 'Could not send partner request.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link with Your Partner</DialogTitle>
          <DialogDescription>
            Enter your partner&apos;s username to send them a link request.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-4">
          <Label htmlFor="partner-username">Partner&apos;s Username</Label>
          <Input
            id="partner-username"
            value={partnerUsername}
            onChange={(e) => setPartnerUsername(e.target.value)}
            placeholder="TheirUsername"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSendRequest} disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
