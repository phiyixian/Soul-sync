'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { statuses } from '@/lib/data';
import type { Status } from '@/lib/data';
import { Heart, Send, MessageCircle } from 'lucide-react';
import { PixelHeartIcon } from '@/components/icons/PixelHeartIcon';
import { useToast } from '@/hooks/use-toast';
import { useDoc, useFirebase, useUser } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import {
  doc,
  collection,
  addDoc,
  serverTimestamp,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import Link from 'next/link';

type Kiss = {
  id: number;
};

export default function HomePage() {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [myStatusId, setMyStatusId] = useState<Status['id']>('idle');
  const [partnerStatus, setPartnerStatus] = useState<Status>(statuses[0]);
  const [kisses, setKisses] = useState<Kiss[]>([]);
  const [schedule, setSchedule] = useState<string>('');

  const userAccountRef = useMemoFirebase(
    () => (user ? doc(firestore, 'userAccounts', user.uid) : null),
    [user, firestore]
  );
  const { data: userAccount } = useDoc(userAccountRef);
  const partnerId = userAccount?.partnerAccountId;

  const partnerAccountRef = useMemoFirebase(
    () => (partnerId ? doc(firestore, 'userAccounts', partnerId) : null),
    [partnerId, firestore]
  );
  const { data: partnerAccount } = useDoc(partnerAccountRef);
  // Partner room inventory and placed items
  const [roomItems, setRoomItems] = useState<any[]>([]);
  useEffect(() => {
    if (!partnerId) return;
    const invRef = collection(firestore, 'users', partnerId, 'roomInventory');
    const unsub = onSnapshot(invRef, (snap) => {
      setRoomItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, [partnerId, firestore]);

  // Listen to partner's status updates
  useEffect(() => {
    if (!partnerId) return;

    const statusRef = doc(firestore, 'statusUpdates', partnerId);
    const unsubscribe = onSnapshot(statusRef, (doc) => {
      if (doc.exists()) {
        const statusData = doc.data();
        const newStatus = statuses.find(
          (s) => s.id === statusData.statusType
        );
        if (newStatus) {
          setPartnerStatus(newStatus);
        }
      }
    });

    return () => unsubscribe();
  }, [partnerId, firestore]);

  // Listen for kisses
  useEffect(() => {
    if (!user) return;
    const kissesRef = collection(
      firestore,
      'users',
      user.uid,
      'notifications'
    );
    const unsubscribe = onSnapshot(kissesRef, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          if (data.type === 'kiss') {
            const newKiss = { id: Date.now() };
            setKisses((prev) => [...prev, newKiss]);
            setTimeout(() => {
              setKisses((prev) => prev.filter((k) => k.id !== newKiss.id));
            }, 1500);
            // Optionally delete the notification
            // deleteDoc(change.doc.ref);
          }
        }
      });
    });

    return () => unsubscribe();
  }, [user, firestore]);

  // Load my schedule
  useEffect(() => {
    if (!user) return;
    const scheduleRef = doc(firestore, 'schedules', user.uid);
    const unsub = onSnapshot(scheduleRef, (s) => {
      if (s.exists()) setSchedule((s.data() as any).text || '');
    });
    return () => unsub();
  }, [user, firestore]);

  const handleStatusChange = async (statusId: Status['id']) => {
    if (!user) return;
    setMyStatusId(statusId);
    const statusRef = doc(firestore, 'statusUpdates', user.uid);
    try {
      await updateDoc(statusRef, {
        userAccountId: user.uid,
        statusType: statusId,
        timestamp: serverTimestamp(),
      });
      toast({
        title: 'Status Updated!',
        description: `Your partner will now see you as: ${
          statuses.find((s) => s.id === statusId)?.label
        }`,
      });
    } catch (e) {
      // If doc doesn't exist, create it.
      if ((e as any).code === 'not-found') {
        const { setDocumentNonBlocking } = await import(
          '@/firebase/non-blocking-updates'
        );
        setDocumentNonBlocking(
          statusRef,
          {
            userAccountId: user.uid,
            statusType: statusId,
            timestamp: serverTimestamp(),
          },
          { merge: true }
        );
      }
    }
  };

  const sendKiss = async () => {
    if (!user || !partnerId) {
      toast({
        variant: 'destructive',
        title: 'No partner linked',
        description: 'You need a partner to send a kiss to.',
      });
      return;
    }
    const newKiss = { id: Date.now() };
    setKisses((prev) => [...prev, newKiss]);
    setTimeout(() => {
      setKisses((prev) => prev.filter((k) => k.id !== newKiss.id));
    }, 1500);

    const partnerNotificationsRef = collection(
      firestore,
      'users',
      partnerId,
      'notifications'
    );
    await addDoc(partnerNotificationsRef, {
      type: 'kiss',
      from: user.uid,
      timestamp: serverTimestamp(),
    });

    toast({
      title: '💕 Smooch! 💕',
      description: 'You sent a kiss to your partner!',
    });
  };

  const saveSchedule = async () => {
    if (!user) return;
    const scheduleRef = doc(firestore, 'schedules', user.uid);
    await updateDoc(scheduleRef, {
      userAccountId: user.uid,
      text: schedule,
      updatedAt: serverTimestamp(),
    }).catch(async (e) => {
      const { setDocumentNonBlocking } = await import(
        '@/firebase/non-blocking-updates'
      );
      setDocumentNonBlocking(
        scheduleRef,
        { userAccountId: user.uid, text: schedule, updatedAt: serverTimestamp() },
        { merge: true }
      );
    });
    toast({ title: 'Schedule saved' });
  };

  const sendHug = () => {
    if (!user || !partnerId) {
      toast({
        variant: 'destructive',
        title: 'No partner linked',
        description: 'You need a partner to send a hug to.',
      });
      return;
    }
    // local effect
    toast({ title: '🤗 Hugs! 🤗', description: 'You sent a hug to your partner!' });
    // remote notification
    const partnerNotificationsRef = collection(
      firestore,
      'users',
      partnerId,
      'notifications'
    );
    addDoc(partnerNotificationsRef, {
      type: 'hug',
      from: user.uid,
      timestamp: serverTimestamp(),
    });
  };

  return (
    <div className="relative flex h-full flex-col bg-accent/30 p-4">
      <header className="flex items-center justify-between rounded-lg bg-card/80 p-3 shadow-sm backdrop-blur-sm">
        <div>
          <p className="text-sm text-muted-foreground">My Status:</p>
          <Select onValueChange={handleStatusChange} defaultValue={myStatusId}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="Set your status" />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((status) => (
                <SelectItem key={status.id} value={status.id}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">
            {partnerAccount ? `${partnerAccount.username}'s Room` : "Partner's Room"}
          </p>
          <p className="text-xs text-muted-foreground">
            Is currently {partnerStatus.label}
          </p>
        </div>
      </header>

      <div className="relative flex-1 flex items-center justify-center my-4">
        {partnerId ? (
          <div className="relative w-[300px] h-[400px]">
            <Image
              src={partnerStatus.image.imageUrl}
              alt={partnerStatus.description}
              width={300}
              height={400}
              className="pixelated object-contain"
              data-ai-hint={partnerStatus.image.imageHint}
            />
            {roomItems.filter(i => i.placed).map((i, idx) => (
              <div key={i.id} className="absolute" style={{ left: (idx % 3) * 90 + 10, top: Math.floor(idx / 3) * 90 + 260 }}>
                <Image src={i.imageUrl} alt={i.name} width={64} height={64} className="pixelated" />
              </div>
            ))}
            {kisses.map((kiss) => (
              <div
                key={kiss.id}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <PixelHeartIcon className="w-16 h-16 text-primary/80 animate-heart-float" />
              </div>
            ))}
          </div>
        ) : (
           <div className="text-center">
            <p className="text-muted-foreground">You are not linked with a partner yet.</p>
            <Button asChild className="mt-4">
                <Link href="/home/profile">Link with Partner</Link>
            </Button>
           </div>
        )}
      </div>

      {partnerId && (
        <div className="rounded-lg bg-card/80 p-3 shadow-sm backdrop-blur-sm">
          <p className="text-sm mb-2">My Partner's Room Items</p>
          <div className="grid grid-cols-3 gap-2">
            {roomItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded border px-2 py-1">
                <span className="text-xs truncate mr-2">{item.name}</span>
                <Button size="xs" variant={item.placed ? 'secondary' : 'primary'} onClick={async () => {
                  const { doc, updateDoc } = await import('firebase/firestore');
                  const ref = doc(firestore, 'users', partnerId, 'roomInventory', item.id);
                  await updateDoc(ref, { placed: !item.placed });
                }}>
                  {item.placed ? 'Unplace' : 'Place'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-4 rounded-lg bg-card/80 p-4 shadow-sm backdrop-blur-sm">
        <Button
          variant="outline"
          size="lg"
          className="h-16 w-16 rounded-full flex-col gap-1"
          onClick={sendHug}
        >
          <Heart className="w-7 h-7" />
          <span className="text-xs">Hug</span>
        </Button>
        <Button
          variant="primary"
          size="lg"
          className="h-20 w-20 rounded-full flex-col gap-1 shadow-lg"
          onClick={sendKiss}
        >
          <PixelHeartIcon className="w-8 h-8" />
          <span className="text-sm font-bold">Kiss</span>
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="h-16 w-16 rounded-full flex-col gap-1"
          asChild
        >
          <Link href="/home/messages">
            <MessageCircle className="w-7 h-7" />
            <span className="text-xs">Msg</span>
          </Link>
        </Button>
      </div>

      <div className="mt-3 rounded-lg bg-card/80 p-3 shadow-sm backdrop-blur-sm">
        <p className="text-sm mb-2">My Schedule (visible to partner)</p>
        <div className="flex gap-2">
          <input className="flex-1 rounded border px-3 py-2" value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="e.g., Study 7-9pm; Gym 9-10pm" />
          <Button onClick={saveSchedule} size="sm">Save</Button>
        </div>
      </div>
    </div>
  );
}
