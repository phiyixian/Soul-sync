'use client';

import { OptimizedImage } from '@/components/OptimizedImage';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gem } from 'lucide-react';
import { useFirebase, useUser, useDoc, useCollection } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { doc, collection, addDoc, serverTimestamp, getDoc, updateDoc, getDocs } from 'firebase/firestore';
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
import { useState, useEffect, useCallback, memo } from 'react';
import { Skeleton, ShopItemSkeleton } from '@/components/ui/skeleton';

type FirestoreShopItem = {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
};

export default function ShopPage() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  const [selectedItem, setSelectedItem] = useState<FirestoreShopItem | null>(null);
  const [shopItems, setShopItems] = useState<FirestoreShopItem[]>([]);
  const [loading, setLoading] = useState(true);

  const userAccountRef = useMemoFirebase(
    () => (user ? doc(firestore, 'userAccounts', user.uid) : null),
    [user, firestore]
  );
  const { data: userAccount } = useDoc(userAccountRef);
  const partnerId = userAccount?.partnerAccountId;

  // Fetch shop items from Firestore
  useEffect(() => {
    const fetchShopItems = async () => {
      if (!firestore) {
        console.log('Firestore not available yet');
        return;
      }
      
      console.log('Fetching shop items from Firestore...');
      try {
        const shopItemsRef = collection(firestore, 'shopItems');
        const snapshot = await getDocs(shopItemsRef);
        const items: FirestoreShopItem[] = [];
        
        console.log('Snapshot size:', snapshot.size);
        snapshot.forEach((doc) => {
          const data = doc.data();
          console.log('Found item:', doc.id, data);
          items.push({
            id: doc.id,
            name: data.name,
            price: data.price,
            imageUrl: data.imageUrl
          });
        });
        
        console.log('Loaded items:', items);
        setShopItems(items);
      } catch (error) {
        console.error('Error fetching shop items:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to load shop items',
          description: 'Please try refreshing the page.',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchShopItems();
  }, [firestore, toast]);

  const handlePurchase = useCallback(async () => {
    if (!user || !partnerId || !firestore || !selectedItem) {
      toast({
        variant: 'destructive',
        title: 'Cannot complete purchase',
        description: 'You must be linked with a partner to send a gift.',
      });
      return;
    }

    try {
      // Atomically deduct credits and create purchase using a transaction-like sequence
      const buyerRef = doc(firestore, 'userAccounts', user.uid);
      const buyerSnap = await getDoc(buyerRef);
      const buyerCredits = (buyerSnap.data() as any)?.credits ?? 0;
      if (buyerCredits < selectedItem.price) {
        toast({ variant: 'destructive', title: 'Not enough credits' });
        return;
      }
      await updateDoc(buyerRef, { credits: buyerCredits - selectedItem.price });

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
        imageUrl: selectedItem.imageUrl,
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
  }, [user, partnerId, firestore, selectedItem, toast]);

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
            {userAccount?.credits || 0}
          </span>
        </div>
      </header>

      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <ShopItemSkeleton key={index} />
          ))}
        </div>
      ) : shopItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 space-y-4 fade-in">
          <div className="text-muted-foreground">No shop items found</div>
          <div className="text-sm text-muted-foreground">
            Items: {shopItems.length} | Firestore: {firestore ? 'Connected' : 'Not connected'}
          </div>
          <Button asChild>
            <a href="/admin/shop">Go to Admin to Seed Items</a>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {shopItems.map((item: FirestoreShopItem, index: number) => (
            <Card key={item.id} className="overflow-hidden card-hover fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
              <CardHeader className="p-0">
                <div className="aspect-square bg-accent/50 w-full relative">
                  <OptimizedImage
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    className="object-contain p-4 pixelated"
                    quality={85}
                    sizes="(max-width: 768px) 50vw, 25vw"
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
      )}
    </div>
  );
}
