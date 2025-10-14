'use client';

import Image from 'next/image';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { shopItems } from '@/lib/data';
import { Gem } from 'lucide-react';
import { useFirebase, useUser, useDoc, useCollection } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { doc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useState } from 'react';

export default function ShopPage() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const userAccountRef = useMemoFirebase(
    () => (user ? doc(firestore, 'userAccounts', user.uid) : null),
    [user, firestore]
  );
  const { data: userAccount } = useDoc(userAccountRef);
  const partnerId = userAccount?.partnerAccountId;

  const handlePurchase = async () => {
    if (!user || !partnerId || !firestore || !selectedItem) {
      toast({
        variant: 'destructive',
        title: 'Cannot complete purchase',
        description: 'You must be linked with a partner to send a gift.',
      });
      return;
    }

    try {
      await addDoc(collection(firestore, 'purchases'), {
        buyerAccountId: user.uid,
        recipientAccountId: partnerId,
        giftId: selectedItem.id,
        purchaseDate: serverTimestamp(),
      });
      // Add gift to partner's room inventory list
      await addDoc(collection(firestore, 'users', partnerId, 'roomInventory'), {
        itemId: selectedItem.id,
        name: selectedItem.name,
        imageUrl: selectedItem.image.imageUrl,
        placed: false,
        addedAt: serverTimestamp(),
      });

      // In a real app, you would handle currency deduction here.
      // For this demo, we'll just show a success message.

      toast({
        title: 'Gift Sent!',
        description: `You sent ${selectedItem.name} to your partner!`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Purchase Failed',
        description: error.message,
      });
    }
  };

  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gift Shop</h1>
          <p className="text-muted-foreground">
            Spoil your partner with cute gifts!
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-accent px-4 py-2">
          <Gem className="h-5 w-5 text-primary" />
          <span className="font-bold text-lg text-primary-foreground">
            500
          </span>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4">
        {shopItems.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            <CardHeader className="p-0">
              <div className="aspect-square bg-accent/50 w-full relative">
                <Image
                  src={item.image.imageUrl}
                  alt={item.name}
                  fill
                  className="object-contain p-4 pixelated"
                  data-ai-hint={item.image.imageHint}
                />
              </div>
            </CardHeader>
            <CardContent className="p-4 pb-2">
              <CardTitle className="text-base">{item.name}</CardTitle>
            </CardContent>
            <CardFooter className="p-4 pt-0">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    className="w-full"
                    onClick={() => setSelectedItem(item)}
                  >
                    <Gem className="mr-2 h-4 w-4" />
                    {item.price}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Purchase</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to buy the {selectedItem?.name} for{' '}
                      {selectedItem?.price} gems and send it to your partner?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePurchase}>
                      Confirm
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
