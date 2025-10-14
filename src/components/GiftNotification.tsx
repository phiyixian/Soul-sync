'use client';

import {
  collection,
  doc,
  query,
  where,
  deleteDoc,
  getDocs,
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
import { useMemo, useState } from 'react';
import { shopItems } from '@/lib/data';
import Image from 'next/image';
import { Gift } from 'lucide-react';

export function GiftNotification() {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const purchasesQuery = useMemo(() => {
    if (!user) return null;
    return query(
      collection(firestore, 'purchases'),
      where('recipientAccountId', '==', user.uid)
    );
  }, [firestore, user]);

  const { data: purchases, isLoading } = useCollection(purchasesQuery);

  const handleOpenGift = async (purchase: any) => {
    setIsOpen(true);
  };

  const handleClose = async (purchase: any) => {
    if (!firestore) return;
    try {
      const purchaseRef = doc(firestore, 'purchases', purchase.id);
      await deleteDoc(purchaseRef);
      setIsOpen(false);
      // You might want to add the item to the user's room/inventory here
    } catch (error) {
      console.error('Failed to close gift notification', error);
    }
  };

  if (isLoading || !purchases || purchases.length === 0 || isOpen) {
    return null;
  }

  const firstPurchase = purchases[0];
  const gift = shopItems.find((item) => item.id === firstPurchase.giftId);

  if (!gift) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-[380px] bg-card/90 backdrop-blur-sm">
        <CardHeader className="items-center text-center">
          <Gift className="h-12 w-12 text-primary" />
          <CardTitle>You received a gift!</CardTitle>
          <CardDescription>
            Your partner sent you a {gift.name}!
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <div className="relative h-48 w-48">
            <Image
              src={gift.image.imageUrl}
              alt={gift.name}
              fill
              className="object-contain p-4 pixelated"
              data-ai-hint={gift.image.imageHint}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-center gap-2">
          <Button onClick={() => handleClose(firstPurchase)}>Awesome!</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
