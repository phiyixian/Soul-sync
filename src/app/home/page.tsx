'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { AvatarSkeleton } from '@/components/ui/skeleton';
import { OptimizedImage } from '@/components/OptimizedImage';
import { useCriticalImagePreloader } from '@/hooks/use-image-preloader';
import { usePerformanceMonitor } from '@/hooks/use-performance-monitor';
import { NotificationsPopover } from '@/components/NotificationsPopover';
import { AvatarBackground } from '@/components/AvatarBackground';
import { GoogleMapsIntegration } from '@/components/GoogleMapsIntegration';
import { QuoteOfTheDay } from '@/components/QuoteOfTheDay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { statuses } from '@/lib/data';
import type { Status } from '@/lib/data';
import { Heart, Send, MessageCircle, Hand } from 'lucide-react';
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
  setDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import Link from 'next/link';
import { CalendarToggle } from '@/components/CalendarToggle';

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

  const [myStatusId, setMyStatusId] = useState<Status['id'] | null>(null);
  const [isStatusLoading, setIsStatusLoading] = useState(true);
  const [partnerStatus, setPartnerStatus] = useState<Status>(statuses[0]);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [kisses, setKisses] = useState<Kiss[]>([]);
  const [hugs, setHugs] = useState<Kiss[]>([]);
  const [partnerAvatar, setPartnerAvatar] = useState<AvatarData | null>(null);
  const [statusTimer, setStatusTimer] = useState<number | null>(null);
  const [customTimerHours, setCustomTimerHours] = useState<number>(0);
  const [customTimerMinutes, setCustomTimerMinutes] = useState<number>(30);
  const [showPatHeadAnimation, setShowPatHeadAnimation] = useState(false);
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

  // Set partner name from partner account data
  useEffect(() => {
    if (partnerAccount?.displayName) {
      setPartnerName(partnerAccount.displayName);
    } else {
      setPartnerName(null);
    }
  }, [partnerAccount]);
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

    console.log('👥 Setting up partner status listener for:', partnerId);
    const statusRef = doc(firestore, 'statusUpdates', partnerId);
    const unsubscribe = onSnapshot(statusRef, async (doc) => {
      console.log('📡 Partner status listener triggered');
      if (doc.exists()) {
        const statusData = doc.data();
        console.log('📊 Partner status data received:', statusData);
        
        // Check if status has expired
        if (statusData.expiresAt && statusData.expiresAt.toDate() < new Date()) {
          console.log('⏰ Partner status expired, reverting to idle');
          // Status has expired, revert to chilling
          try {
            await setDoc(statusRef, {
              statusType: 'idle',
              timestamp: serverTimestamp(),
              expiresAt: null,
              timerDuration: 0
            }, { merge: true });
            setPartnerStatus(statuses.find(s => s.id === 'idle') || statuses[0]);
            console.log('✅ Partner status reverted to idle');
            return;
          } catch (error) {
            console.error('❌ Error reverting expired status:', error);
          }
        }
        
        const newStatus = statuses.find(
          (s) => s.id === statusData.statusType
        );
        if (newStatus) {
          console.log('🔄 Updating partner status to:', newStatus.label);
          setPartnerStatus(newStatus);
        } else {
          console.log('⚠️ Status not found for:', statusData.statusType);
        }
      } else {
        console.log('📭 No partner status document found');
      }
    });

    return () => unsubscribe();
  }, [partnerId, firestore]);

  // Load my current status from Firestore
  useEffect(() => {
    if (!user) return;

    console.log('👤 Setting up my status listener for:', user.uid);
    const statusRef = doc(firestore, 'statusUpdates', user.uid);
    const unsubscribe = onSnapshot(statusRef, (doc) => {
      console.log('📡 My status listener triggered');
      if (doc.exists()) {
        const statusData = doc.data();
        console.log('📊 My status data loaded:', statusData);
        
        // Check if status has expired
        if (statusData.expiresAt && statusData.expiresAt.toDate() < new Date()) {
          console.log('⏰ My status expired, reverting to idle');
          // Status has expired, revert to idle
          setDoc(statusRef, {
            statusType: 'idle',
            timestamp: serverTimestamp(),
            expiresAt: null,
            timerDuration: 0
          }, { merge: true }).catch(console.error);
          setMyStatusId('idle');
          setStatusTimer(null);
          setIsStatusLoading(false);
          return;
        }
        
        const currentStatus = statusData.statusType as Status['id'];
        if (currentStatus && statuses.find(s => s.id === currentStatus)) {
          console.log('🔄 Setting my status to:', currentStatus);
          setMyStatusId(currentStatus);
          
          // Calculate remaining time based on Firestore expiration
          if (statusData.expiresAt && currentStatus !== 'idle') {
            const expiresAt = statusData.expiresAt.toDate();
            const now = new Date();
            const remainingSeconds = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
            console.log('⏰ Setting timer to remaining seconds:', remainingSeconds);
            setStatusTimer(remainingSeconds);
            
            // Set custom timer values from Firestore data
            if (statusData.timerDuration) {
              const totalMinutes = statusData.timerDuration;
              const hours = Math.floor(totalMinutes / 60);
              const minutes = totalMinutes % 60;
              setCustomTimerHours(hours);
              setCustomTimerMinutes(minutes);
            }
          } else {
            setStatusTimer(null);
          }
        } else {
          console.log('🔄 Invalid status, defaulting to idle');
          setMyStatusId('idle');
          setStatusTimer(null);
        }
      } else {
        console.log('📭 No status document found, using default idle');
        setMyStatusId('idle');
        setStatusTimer(null);
      }
      setIsStatusLoading(false);
    });

    return () => unsubscribe();
  }, [user, firestore]);

  // Timer countdown effect - updates every second based on Firestore expiration
  useEffect(() => {
    if (!statusTimer || statusTimer <= 0) return;

    const interval = setInterval(() => {
      setStatusTimer(prev => {
        if (prev === null || prev <= 0) {
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [statusTimer]);

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

  const handleStatusChange = useCallback(async (statusId: Status['id']) => {
    if (!user) return;
    console.log('🔄 Status change initiated:', statusId);
    console.log('👤 Current user:', user.uid);
    console.log('🔥 Firestore instance:', firestore);
    
    setMyStatusId(statusId);
    const statusRef = doc(firestore, 'statusUpdates', user.uid);
    
    console.log('📄 Status document reference:', statusRef.path);
    
    // Use custom timer for all statuses (except idle)
    const totalMinutes = customTimerHours * 60 + customTimerMinutes;
    const timerDuration = statusId === 'idle' ? 0 : totalMinutes;
    const expiresAt = timerDuration > 0 ? new Date(Date.now() + timerDuration * 60 * 1000) : null;
    
    console.log('⏰ Timer settings:', { 
      statusId, 
      timerDuration, 
      expiresAt, 
      customTimerHours,
      customTimerMinutes,
      totalMinutes
    });
    
    const statusData = {
      userAccountId: user.uid,
      statusType: statusId,
      timestamp: serverTimestamp(),
      expiresAt: expiresAt,
      timerDuration: timerDuration
    };
    
    console.log('📊 Status data to write:', statusData);
    
    try {
      // Use setDoc with merge instead of updateDoc to avoid permission issues
      await setDoc(statusRef, statusData, { merge: true });
      
      console.log('✅ Status updated successfully in Firestore');
      
      toast({
        title: 'Status Updated!',
        description: `Your partner will now see you as: ${
          statuses.find((s) => s.id === statusId)?.label
        }${timerDuration > 0 ? ` (auto-reverts in ${timerDuration} minutes)` : ''}`,
      });
      
    } catch (e) {
      console.error('❌ Unexpected error during status update:', e);
      toast({
        variant: 'destructive',
        title: 'Status Update Failed',
        description: 'Failed to update your status. Please try again.',
      });
    }
  }, [user, firestore, toast, customTimerHours, customTimerMinutes]);

  const handleTimerChange = useCallback((totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    setCustomTimerHours(hours);
    setCustomTimerMinutes(minutes);
    
    // Only update active timer if there's no current status or it's idle
    if (myStatusId === null || myStatusId === 'idle') {
      console.log('🔄 Updating timer duration to:', totalMinutes, 'minutes (no active status)');
    } else {
      console.log('🔄 Timer preset selected but status is active - user must manually apply');
    }
  }, [myStatusId]);

  // Auto-revert status when timer reaches 0
  useEffect(() => {
    if (statusTimer === 0 && myStatusId && myStatusId !== 'idle') {
      console.log('⏰ Timer reached 0, auto-reverting to idle');
      handleStatusChange('idle');
    }
  }, [statusTimer, myStatusId, handleStatusChange]);

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
      className: 'bounce-in',
    });
  }, [user, partnerId, firestore, toast]);


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
    
    // Show local hug animation immediately
    const newHug = { id: actionId };
    setHugs((prev) => [...prev, newHug]);
    setTimeout(() => {
      setHugs((prev) => prev.filter((h) => h.id !== newHug.id));
    }, 2000);
    
    // local effect
    toast({ 
      title: '🤗 Hugs! 🤗', 
      description: 'You sent a hug to your partner!',
      className: 'bounce-in',
    });
    
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

  const sendPatHead = () => {
    if (!user || !partnerId) {
      toast({
        variant: 'destructive',
        title: 'No partner linked',
        description: 'You need a partner to pat their head.',
      });
      return;
    }
    
    // Create unique action ID to prevent duplicates
    const actionId = `pat-${Date.now()}-${Math.random()}`;
    
    // Trigger pat head animation
    triggerPatHeadAnimation();
    
    // local effect
    toast({ 
      title: '👋 Pat Head! 👋', 
      description: 'You patted your partner\'s head!',
      className: 'bounce-in',
    });
    
    // remote notification
    const partnerNotificationsRef = collection(
      firestore,
      'users',
      partnerId,
      'notifications'
    );
    addDoc(partnerNotificationsRef, {
      type: 'pat',
      from: user.uid,
      timestamp: serverTimestamp(),
      description: '👋 Patted your head gently!',
      content: '👋 Patted your head gently!',
      actionId: actionId,
      processed: false,
    });
  };

  const triggerPatHeadAnimation = () => {
    setShowPatHeadAnimation(true);
    setTimeout(() => {
      setShowPatHeadAnimation(false);
    }, 2000); // Animation duration
  };

  // Helper function to get avatar asset URL
  const getAvatarAssetUrl = (category: 'hair' | 'faces' | 'clothes', assetId: string) => {
    const assets = avatarAssets[category];
    return assets.find(asset => asset.id === assetId)?.imageUrl || '';
  };

  return (
    <div className={`relative flex h-full flex-col p-4 ${partnerStatus.id === 'sleeping' ? 'sleeping-theme' : ''}`}>
      <header className="flex items-center justify-between rounded-lg bg-card/80 p-3 shadow-sm backdrop-blur-sm fade-in">
        <div>
          <p className="text-sm text-muted-foreground">My Status:</p>
          <div className="flex items-center gap-2">
            <Select onValueChange={handleStatusChange} value={myStatusId || undefined}>
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue placeholder={isStatusLoading ? "Loading..." : "Set your status"} />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((status) => (
                  <SelectItem key={status.id} value={status.id}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {statusTimer !== null && (
              <div className="text-xs text-blue-600 font-medium">
                ⏰ {Math.floor(statusTimer / 60)}:{(statusTimer % 60).toString().padStart(2, '0')}
              </div>
            )}
          </div>
          {myStatusId && myStatusId !== 'idle' && (
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Auto-revert in:</label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min="0"
                    max="23"
                    value={customTimerHours}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      const clampedValue = Math.max(0, Math.min(23, value));
                      setCustomTimerHours(clampedValue);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleStatusChange(myStatusId);
                      }
                    }}
                    className="w-12 h-7 text-xs"
                    placeholder="0"
                  />
                  <span className="text-xs text-muted-foreground">h</span>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={customTimerMinutes}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      const clampedValue = Math.max(0, Math.min(59, value));
                      setCustomTimerMinutes(clampedValue);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleStatusChange(myStatusId);
                      }
                    }}
                    className="w-12 h-7 text-xs"
                    placeholder="30"
                  />
                  <span className="text-xs text-muted-foreground">m</span>
                  <Button
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => handleStatusChange(myStatusId)}
                  >
                    ✓
                  </Button>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => handleTimerChange(5)}
                >
                  5m
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => handleTimerChange(60)}
                >
                  1h
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => handleTimerChange(420)}
                >
                  7h
                </Button>
              </div>
            </div>
          )}
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
            {/* Background Video Component */}
            <div className="absolute inset-0 w-full h-full">
              <AvatarBackground className="w-full h-full" />
            </div>
            
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
                className="pixelated object-contain fade-in relative z-10"
                dataAiHint={partnerStatus.image.imageHint}
                priority
                quality={90}
              />
            ) : partnerAvatar ? (
              <div className="relative h-full w-full fade-in z-10">
                            {/* Clothes: bottom layer */}
                            {getAvatarAssetUrl('clothes', partnerAvatar.clothing) && (
                              <OptimizedImage
                                src={getAvatarAssetUrl('clothes', partnerAvatar.clothing)}
                                alt="Partner clothes"
                                width={300}
                                height={400}
                                className="pixelated object-contain absolute scale-75 top-[150px] left-0 z-11"
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
                                className="pixelated object-contain absolute scale-60 top-[-10px] left-0 z-12"
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
                                className="pixelated object-contain absolute scale-60 top-[-10px] left-0 z-13"
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
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
              >
                <OptimizedImage
                  src="/kiss.png"
                  alt="Kiss"
                  width={128}
                  height={128}
                  className="pixelated animate-kiss-fly"
                  priority
                  quality={90}
                />
              </div>
            ))}

            {/* Hug animations */}
            {hugs.map((hug) => (
              <div
                key={hug.id}
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
              >
                <OptimizedImage
                  src="/hug.png"
                  alt="Hug"
                  width={128}
                  height={128}
                  className="pixelated animate-hug-fade"
                  priority
                  quality={90}
                />
              </div>
            ))}

            {/* Pat Head animation */}
            {showPatHeadAnimation && (
              <div className="absolute inset-0 flex items-start justify-center pointer-events-none z-50">
                <div className="relative mt-8">
                  <OptimizedImage
                    src="/pat.png"
                    alt="Pat Head"
                    width={80}
                    height={80}
                    className="pixelated animate-pat-head"
                    priority
                    quality={90}
                  />
                </div>
              </div>
            )}
            
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
        <div className="rounded-lg bg-card/80 p-4 shadow-sm backdrop-blur-sm fade-in cute-card">
          <p className="text-sm font-medium mb-3 text-center">🏠 Partner's Room Items</p>
          <div className="grid grid-cols-1 gap-3">
            {roomItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border-2 px-4 py-3 card-hover bg-background/50">
                <span className="text-sm font-medium flex-1 mr-3">{item.name}</span>
                <Button 
                  size="sm" 
                  variant={item.placed ? 'secondary' : 'default'} 
                  className={`cute-button ${item.placed ? 'bg-green-100 hover:bg-green-200 text-green-800' : 'bg-blue-100 hover:bg-blue-200 text-blue-800'}`}
                  onClick={async () => {
                    const { doc, updateDoc } = await import('firebase/firestore');
                    const ref = doc(firestore, 'users', partnerId, 'roomInventory', item.id);
                    await updateDoc(ref, { placed: !item.placed });
                  }}
                >
                  {item.placed ? '✨ Unplace' : '🎯 Place'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quote of the Day */}
      <div className="mt-3 flex justify-center">
        <QuoteOfTheDay />
      </div>

      <div className="flex items-center justify-center gap-4 cute-card bg-card/80 p-6 backdrop-blur-sm fade-in">
        <Button
          variant="outline"
          size="lg"
          className="h-16 w-16 rounded-full flex-col gap-1 cute-button hover:scale-105 transition-all duration-300"
          onClick={sendHug}
        >
          <Heart className="w-7 h-7 hover:animate-pulse" />
          <span className="text-xs font-medium">Hug</span>
        </Button>
        <Button
          variant="secondary"
          size="lg"
          className="h-20 w-20 rounded-full flex-col gap-1 shadow-lg cute-button hover:scale-105 transition-all duration-300 glow"
          onClick={sendKiss}
        >
          <PixelHeartIcon className="w-8 h-8 hover:animate-bounce" />
          <span className="text-sm font-bold">Kiss</span>
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="h-16 w-16 rounded-full flex-col gap-1 cute-button hover:scale-105 transition-all duration-300"
          onClick={sendPatHead}
        >
          <Hand className="w-7 h-7 hover:animate-pulse" />
          <span className="text-xs font-medium">Pat Head</span>
        </Button>
      </div>

      {/* Calendar Display */}
      <div className="mt-3">
        <CalendarToggle partnerId={partnerId} partnerName={partnerName || undefined} />
      </div>
      
      {/* Location Map */}
      <div className="mt-3">
        <GoogleMapsIntegration partnerId={partnerId} partnerName={partnerName || undefined} />
      </div>
    </div>
  );
}
