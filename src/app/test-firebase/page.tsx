'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFirebase, useUser } from '@/firebase';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function FirebaseTestPage() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  const [testResult, setTestResult] = useState<string>('');

  const testFirebaseConnection = async () => {
    if (!firestore) {
      setTestResult('❌ Firestore not initialized');
      return;
    }

    if (!user) {
      setTestResult('❌ User not authenticated');
      return;
    }

    try {
      // Test reading from shopItems collection
      const shopItemsRef = collection(firestore, 'shopItems');
      const snapshot = await getDocs(shopItemsRef);
      
      setTestResult(`✅ Firebase connected! Found ${snapshot.size} shop items.`);
      
      // Log the items
      snapshot.forEach((doc) => {
        console.log('Shop item:', doc.id, doc.data());
      });
      
    } catch (error) {
      console.error('Firebase test error:', error);
      setTestResult(`❌ Firebase error: ${error}`);
    }
  };

  const testWritePermission = async () => {
    if (!firestore || !user) {
      setTestResult('❌ Not authenticated');
      return;
    }

    try {
      // Test writing to shopItems collection
      const testItem = {
        name: 'Test Item',
        price: 999,
        imageUrl: 'https://picsum.photos/200/200?random=999',
        createdAt: new Date()
      };
      
      await addDoc(collection(firestore, 'shopItems'), testItem);
      setTestResult('✅ Write permission works! Test item added.');
      
    } catch (error) {
      console.error('Write test error:', error);
      setTestResult(`❌ Write error: ${error}`);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Firebase Connection Test</h1>
        <p className="text-muted-foreground">
          Test Firebase connection and permissions
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Connection Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div>Firestore: {firestore ? '✅ Connected' : '❌ Not connected'}</div>
            <div>User: {user ? `✅ Authenticated (${user.uid})` : '❌ Not authenticated'}</div>
          </div>

          <div className="space-y-2">
            <Button onClick={testFirebaseConnection} className="w-full">
              Test Firebase Connection
            </Button>
            <Button onClick={testWritePermission} variant="outline" className="w-full">
              Test Write Permission
            </Button>
          </div>

          {testResult && (
            <div className="p-3 bg-muted rounded text-sm">
              {testResult}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
