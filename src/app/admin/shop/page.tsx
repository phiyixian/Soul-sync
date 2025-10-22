'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFirebase } from '@/firebase';
import { seedShopItems } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

export default function AdminShopPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const defaultItems = [
    {
      id: "plushie",
      name: "Cute Plushie",
      price: 100,
      imageUrl: "https://firebasestorage.googleapis.com/v0/b/studio-8158823289-aa6bd.firebasestorage.app/o/shop%2Fplushie.png?alt=media&token=59ea1046-e3f1-4538-a0d0-0ef1652454c5"
    },
    {
      id: "lamp", 
      name: "Heart Lamp",
      price: 150,
      imageUrl: "https://firebasestorage.googleapis.com/v0/b/studio-8158823289-aa6bd.firebasestorage.app/o/shop%2Flamp.png?alt=media&token=64b08ed5-24b7-4630-be86-531080e6390a"
    },
    {
      id: "plant",
      name: "Potted Plant", 
      price: 75,
      imageUrl: "https://firebasestorage.googleapis.com/v0/b/studio-8158823289-aa6bd.firebasestorage.app/o/shop%2Fplant.png?alt=media&token=dd5cf497-c64b-4e34-8fa8-6a33381c68b0"
    },
    {
      id: "rug",
      name: "Heart Rug",
      price: 200, 
      imageUrl: "https://firebasestorage.googleapis.com/v0/b/studio-8158823289-aa6bd.firebasestorage.app/o/shop%2Frug.png?alt=media&token=cb093ea0-e87e-4fdb-84af-e41e8b6abf4d"
    }
  ];

  const handleSeedItems = async () => {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Firebase not initialized',
        description: 'Please check your Firebase configuration.',
      });
      return;
    }

    console.log('Starting to seed shop items...', defaultItems);
    setLoading(true);
    try {
      await seedShopItems(firestore, defaultItems);
      console.log('Successfully seeded shop items');
      toast({
        title: 'Success!',
        description: 'Shop items have been seeded to Firestore.',
      });
    } catch (error) {
      console.error('Error seeding shop items:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to seed items',
        description: 'Please check the console for errors.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Admin - Shop Items</h1>
        <p className="text-muted-foreground">
          Seed shop items to Firestore
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Seed Shop Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Ready to Seed!</Label>
            <p className="text-sm text-muted-foreground">
              Your shop images are already uploaded to Firebase Storage. 
              Click "Seed Items" below to add them to Firestore.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Default Items:</Label>
            <div className="grid grid-cols-1 gap-2 text-sm">
              {defaultItems.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-2 bg-muted rounded">
                  <span>{item.name} - {item.price} gems</span>
                  <span className="text-xs text-muted-foreground">{item.id}</span>
                </div>
              ))}
            </div>
          </div>

          <Button 
            onClick={handleSeedItems} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Seeding...' : 'Seed Shop Items'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
