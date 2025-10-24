'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useCollection, useDoc, useFirebase, useUser } from '@/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  doc,
  addDoc,
  serverTimestamp,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { useMemo, useState, useRef, useEffect } from 'react';
import { useMemoFirebase } from '@/firebase/provider';
import SnapUpload from '@/components/SnapUpload';
import SnapDisplay from '@/components/SnapDisplay';
import { Snap, SnapData } from '@/lib/snap-types';

export default function MessagesPage() {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const userAccountRef = useMemoFirebase(
    () => (user ? doc(firestore, 'userAccounts', user.uid) : null),
    [user?.uid, firestore]
  );
  const { data: userAccount } = useDoc(userAccountRef);
  const partnerId = userAccount?.partnerAccountId;

  const messagesQuery = useMemoFirebase(() => {
    if (!user || !partnerId) return null;
    return query(
      collection(firestore, 'messages'),
      where('participantIds', 'array-contains', user.uid),
      orderBy('timestamp', 'asc')
    );
  }, [firestore, user?.uid, partnerId]);

  const { data: messages } = useCollection(messagesQuery);

  // Snap queries
  const sentSnapsQuery = useMemoFirebase(() => {
    if (!user || !partnerId) return null;
    return query(
      collection(firestore, 'snaps'),
      where('senderId', '==', user.uid),
      where('recipientId', '==', partnerId),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user?.uid, partnerId]);

  const receivedSnapsQuery = useMemoFirebase(() => {
    if (!user || !partnerId) return null;
    return query(
      collection(firestore, 'snaps'),
      where('senderId', '==', partnerId),
      where('recipientId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user?.uid, partnerId]);

  const { data: sentSnaps } = useCollection(sentSnapsQuery);
  const { data: receivedSnaps } = useCollection(receivedSnapsQuery);

  const filteredMessages = useMemo(() => {
    if (!messages || !partnerId) return [];
    return messages.filter(
      (msg) =>
        (msg.senderAccountId === user?.uid &&
          msg.recipientAccountId === partnerId) ||
        (msg.senderAccountId === partnerId &&
          msg.recipientAccountId === user?.uid)
    );
  }, [messages, user?.uid, partnerId]);

  const allSnaps = useMemo(() => {
    const snaps: Snap[] = [];
    
    // Only show received snaps (not sent snaps)
    if (receivedSnaps) {
      receivedSnaps.forEach((snap) => {
        const snapData = snap as SnapData;
        snaps.push({
          id: snap.id,
          senderId: snapData.senderId,
          recipientId: snapData.recipientId,
          imageUrl: snapData.imageUrl,
          createdAt: snapData.createdAt?.toDate() || new Date(),
          expiresAt: snapData.expiresAt?.toDate() || new Date(),
          isOpened: snapData.isOpened,
          openedAt: snapData.openedAt?.toDate(),
          viewDuration: snapData.viewDuration,
        });
      });
    }
    
    return snaps.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [receivedSnaps]);

  const handleSnapOpened = async (snapId: string) => {
    if (!firestore) return;
    
    console.log('handleSnapOpened called for:', snapId);
    
    try {
      // Delete the snap immediately when viewing is complete
      await deleteDoc(doc(firestore, 'snaps', snapId));
      console.log('Snap deleted successfully:', snapId);
      
    } catch (error) {
      console.error('Error deleting snap:', error);
      // Don't throw error - just log it
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [filteredMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !user || !partnerId || !firestore) return;

    try {
      await addDoc(collection(firestore, 'messages'), {
        senderAccountId: user.uid,
        recipientAccountId: partnerId,
        participantIds: [user.uid, partnerId],
        content: messageText,
        timestamp: serverTimestamp(),
      });
      // Notify partner's mailbox
      await addDoc(collection(firestore, 'users', partnerId, 'notifications'), {
        type: 'message',
        from: user.uid,
        preview: messageText.slice(0, 120),
        timestamp: serverTimestamp(),
      });
      setMessageText('');
    } catch (error) {
      console.error('Error sending message: ', error);
    }
  };

  if (!partnerId) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-4 text-center">
        <Card>
          <CardHeader>
            <CardTitle>No Partner Linked</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You need to link with a partner to send messages.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-4">
      {/* Snap Upload */}
      <SnapUpload 
        partnerId={partnerId} 
        onSnapSent={() => {
          // Refresh snaps or handle snap sent
        }} 
      />
      
      {/* Snap Display */}
      <SnapDisplay 
        snaps={allSnaps} 
        onSnapOpened={handleSnapOpened} 
      />
      
      <Card className="flex flex-1 flex-col">
        <CardHeader>
          <CardTitle>Messages with your love</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 space-y-4 overflow-y-auto p-4">
          {filteredMessages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${
                msg.senderAccountId === user?.uid
                  ? 'justify-end'
                  : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[75%] rounded-lg px-4 py-2 ${
                  msg.senderAccountId === user?.uid
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </CardContent>
        <Separator />
        <form onSubmit={handleSendMessage} className="p-4">
          <div className="flex w-full items-center space-x-2">
            <Input
              type="text"
              placeholder="Type a message..."
              className="flex-1"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
            />
            <Button type="submit" size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}