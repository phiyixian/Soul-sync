'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { AvatarSkeleton } from '@/components/ui/skeleton';
import { OptimizedImage } from '@/components/OptimizedImage';
import { useCriticalImagePreloader } from '@/hooks/use-image-preloader';
import { usePerformanceMonitor, PerformanceDebugger } from '@/hooks/use-performance-monitor';
import { NotificationsPopover } from '@/components/NotificationsPopover';
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
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import Link from 'next/link';

type Kiss = {
  id: string;
};

type AvatarData = {
  hairStyle: string;
  faceType: string;
  clothing: string;
};

type AvatarAsset = {
  id: string;
  name: string;
  imageUrl: string;
};

export default function HomePage() {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [myStatusId, setMyStatusId] = useState<Status['id']>('idle');
  const [partnerStatus, setPartnerStatus] = useState<Status>(statuses[0]);
  const [kisses, setKisses] = useState<Kiss[]>([]);
  const [schedule, setSchedule] = useState<string>('');
  const [partnerAvatar, setPartnerAvatar] = useState<AvatarData | null>(null);
  const [avatarAssets, setAvatarAssets] = useState<{
    hair: AvatarAsset[];
    faces: AvatarAsset[];
    clothes: AvatarAsset[];
  }>({ hair: [], faces: [], clothes: [] });
  const [processedNotifications, setProcessedNotifications] = useState<Set<string>>(new Set());
  const [isLoadingAvatar, setIsLoadingAvatar] = useState(true);

  // Performance monitoring
  const { metrics, measureRender, measureImageLoad, measureFirestoreQuery } = usePerformanceMonitor('HomePage');
  
  // Preload critical images
  useCriticalImagePreloader(partnerStatus.id, avatarAssets);

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

  // Load avatar assets
  useEffect(() => {
    (async () => {
      const base = collection(firestore, 'avatarAssets');
      const [hairSnap, faceSnap, clothesSnap] = await Promise.all([
        getDocs(query(base, where('type', '==', 'hair'))),
        getDocs(query(base, where('type', '==', 'faces'))),
        getDocs(query(base, where('type', '==', 'clothes'))),
      ]);
      const hair = hairSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      const faces = faceSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      const clothes = clothesSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

      setAvatarAssets({ hair, faces, clothes });
    })();
  }, [firestore]);

  // Load partner avatar data
  useEffect(() => {
    if (!partnerId) {
      setIsLoadingAvatar(false);
      return;
    }
    setIsLoadingAvatar(true);
    const avatarRef = doc(firestore, 'avatars', partnerId);
    const unsub = onSnapshot(avatarRef, (doc) => {
      if (doc.exists()) {
        const avatarData = doc.data() as AvatarData;
        setPartnerAvatar(avatarData);
      } else {
        setPartnerAvatar(null);
      }
      setIsLoadingAvatar(false);
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

  // Listen for notifications (kisses, hugs, etc.)
  useEffect(() => {
    if (!user) return;
    const notificationsRef = collection(
      firestore,
      'users',
      user.uid,
      'notifications'
    );
    const unsubscribe = onSnapshot(notificationsRef, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const notificationId = change.doc.id;
          
          // Check if this notification has already been processed
          if (processedNotifications.has(notificationId)) {
            return;
          }
          
          // Mark as processed immediately to prevent duplicates
          setProcessedNotifications(prev => new Set([...prev, notificationId]));
          
          if (data.type === 'kiss') {
            const newKiss = { id: `${Date.now()}-${Math.random()}` };
            setKisses((prev) => [...prev, newKiss]);
            setTimeout(() => {
              setKisses((prev) => prev.filter((k) => k.id !== newKiss.id));
            }, 2000); // Increased duration for better visibility
            
            // Mark notification as processed in Firebase
            updateDoc(change.doc.ref, { 
              processed: true, 
              processedAt: serverTimestamp() 
            }).catch(console.error);
          }
          
          if (data.type === 'hug') {
            // Add hug animation/effect here if needed
            toast({
              title: '🤗 Hug Received!',
              description: 'Your partner sent you a warm hug!',
            });
            
            // Mark notification as processed in Firebase
            updateDoc(change.doc.ref, { 
              processed: true, 
              processedAt: serverTimestamp() 
            }).catch(console.error);
          }
        }
      });
    });

    return () => unsubscribe();
  }, [user, firestore, processedNotifications]);

  // Load my schedule
  useEffect(() => {
    if (!user) return;
    const scheduleRef = doc(firestore, 'schedules', user.uid);
    const unsub = onSnapshot(scheduleRef, (s) => {
      if (s.exists()) setSchedule((s.data() as any).text || '');
    });
    return () => unsub();
  }, [user, firestore]);

  const handleStatusChange = useCallback(async (statusId: Status['id']) => {
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
  }, [user, firestore, toast]);

  const sendKiss = useCallback(async () => {
    if (!user || !partnerId) {
      toast({
        variant: 'destructive',
        title: 'No partner linked',
        description: 'You need a partner to send a kiss to.',
      });
      return;
    }
    
    // Create unique action ID to prevent duplicates
    const actionId = `kiss-${Date.now()}-${Math.random()}`;
    
    // Show local kiss animation immediately
    const newKiss = { id: actionId };
    setKisses((prev) => [...prev, newKiss]);
    setTimeout(() => {
      setKisses((prev) => prev.filter((k) => k.id !== newKiss.id));
    }, 2000);

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
      description: '💕 Sent you a kiss!',
      content: '💕 Sent you a kiss!',
      actionId: actionId,
      processed: false,
    });

    toast({
      title: '💕 Smooch! 💕',
      description: 'You sent a kiss to your partner!',
    });
  }, [user, partnerId, firestore, toast]);

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
    
    // Create unique action ID to prevent duplicates
    const actionId = `hug-${Date.now()}-${Math.random()}`;
    
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
      description: '🤗 Sent you a warm hug!',
      content: '🤗 Sent you a warm hug!',
      actionId: actionId,
      processed: false,
    });
  };

  // Helper function to get avatar asset URL
  const getAvatarAssetUrl = (category: 'hair' | 'faces' | 'clothes', assetId: string) => {
    const assets = avatarAssets[category];
    return assets.find(asset => asset.id === assetId)?.imageUrl || '';
  };

  return (
    <div className={`relative flex h-full flex-col bg-accent/30 p-4 ${partnerStatus.id === 'sleeping' ? 'sleeping-theme' : ''}`}>
      <header className="flex items-center justify-between rounded-lg bg-card/80 p-3 shadow-sm backdrop-blur-sm fade-in">
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
        <NotificationsPopover />
      </header>

      <div className="relative flex-2 flex items-center justify-center my-4">
        {partnerId ? (
          <div className="relative w-[300px] h-[400px]">
            {isLoadingAvatar ? (
              <AvatarSkeleton />
            ) : (
              <>
                {/* Show status-based placeholder image for sleeping, eating, or showering */}
            {['sleeping', 'eating', 'showering'].includes(partnerStatus.id) ? (
              <OptimizedImage
                src={partnerStatus.image.imageUrl}
                alt={partnerStatus.description}
                width={300}
                height={400}
                className="pixelated object-contain fade-in"
                dataAiHint={partnerStatus.image.imageHint}
                priority
                quality={90}
              />
            ) : partnerAvatar ? (
              <div className="relative h-full w-full fade-in">
                            {/* Clothes: bottom layer */}
                            {getAvatarAssetUrl('clothes', partnerAvatar.clothing) && (
                              <OptimizedImage
                                src={getAvatarAssetUrl('clothes', partnerAvatar.clothing)}
                                alt="Partner clothes"
                                width={300}
                                height={400}
                                className="pixelated object-contain absolute scale-75 top-[150px] left-0 z-10"
                                dataAiHint="pixel art clothes"
                                quality={85}
                              />
                            )}

                            {/* Face: middle layer */}
                            {getAvatarAssetUrl('faces', partnerAvatar.faceType) && (
                              <OptimizedImage
                                src={getAvatarAssetUrl('faces', partnerAvatar.faceType)}
                                alt="Partner face"
                                width={300}
                                height={400}
                                className="pixelated object-contain absolute scale-60 top-[-10px] left-0 z-20"
                                dataAiHint="pixel art faces"
                                quality={85}
                              />
                            )}

                            {/* Hair: top layer */}
                            {getAvatarAssetUrl('hair', partnerAvatar.hairStyle) && (
                              <OptimizedImage
                                src={getAvatarAssetUrl('hair', partnerAvatar.hairStyle)}
                                alt="Partner hair"
                                width={300}
                                height={400}
                                className="pixelated object-contain absolute scale-60 top-[-10px] left-0 z-30"
                                dataAiHint="pixel art hair"
                                quality={85}
                              />
                            )}
              </div>
            ) : (
              <OptimizedImage
                src={partnerStatus.image.imageUrl}
                alt={partnerStatus.description}
                width={300}
                height={400}
                className="pixelated object-contain fade-in"
                dataAiHint={partnerStatus.image.imageHint}
                priority
                quality={90}
              />
            )}
            
            {/* Room items overlay */}
            {roomItems.filter(i => i.placed).map((i, idx) => (
              <div key={i.id} className="absolute slide-in" style={{ left: (idx % 3) * 90 + 10, top: Math.floor(idx / 3) * 90 + 260 }}>
                <OptimizedImage 
                  src={i.imageUrl} 
                  alt={i.name} 
                  width={64} 
                  height={64} 
                  className="pixelated" 
                  quality={80}
                />
              </div>
            ))}
            
            {/* Kiss animations */}
            {kisses.map((kiss) => (
              <div
                key={kiss.id}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <OptimizedImage
                  src="/kiss.png"
                  alt="Kiss"
                  width={128}
                  height={128}
                  className="pixelated animate-kiss-fly z-50"
                  priority
                  quality={90}
                />
              </div>
            ))}
            
            {/* Water dripping animation for showering status */}
            {partnerStatus.id === 'showering' && (
              <>
                <div className="water-drip"></div>
                <div className="water-drip"></div>
                <div className="water-drip"></div>
                <div className="water-drip"></div>
                <div className="water-drip"></div>
                <div className="water-drip"></div>
              </>
            )}
              </>
            )}
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
        <div className="rounded-lg bg-card/80 p-3 shadow-sm backdrop-blur-sm fade-in">
          <p className="text-sm mb-2">My Partner's Room Items</p>
          <div className="grid grid-cols-3 gap-2">
            {roomItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded border px-2 py-1 card-hover">
                <span className="text-xs truncate mr-2">{item.name}</span>
                <Button size="sm" variant={item.placed ? 'secondary' : 'default'} onClick={async () => {
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

      <div className="flex items-center justify-center gap-4 rounded-lg bg-card/80 p-4 shadow-sm backdrop-blur-sm fade-in">
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
          variant="secondary"
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

      <div className="mt-3 rounded-lg bg-card/80 p-3 shadow-sm backdrop-blur-sm fade-in">
        <p className="text-sm mb-2">My Schedule (visible to partner)</p>
        <div className="flex gap-2">
          <input className="flex-1 rounded border px-3 py-2" value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="e.g., Study 7-9pm; Gym 9-10pm" />
          <Button onClick={saveSchedule} size="sm">Save</Button>
        </div>
      </div>
      
      {/* Performance Debugger - only shows in development */}
      <PerformanceDebugger componentName="HomePage" metrics={metrics} />
    </div>
  );
}
