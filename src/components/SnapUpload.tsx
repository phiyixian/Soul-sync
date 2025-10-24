'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { MAX_SNAPS_PER_USER, SNAP_EXPIRY_HOURS } from '@/lib/snap-types';

interface SnapUploadProps {
  partnerId: string;
  onSnapSent: () => void;
}

export default function SnapUpload({ partnerId, onSnapSent }: SnapUploadProps) {
  const { user } = useUser();
  const { firestore, storage } = useFirebase();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pendingSnaps, setPendingSnaps] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch pending snaps
  const fetchPendingSnaps = async () => {
    if (!user || !firestore) return;
    
    try {
      const snapsRef = collection(firestore, 'snaps');
      const q = query(
        snapsRef,
        where('senderId', '==', user.uid),
        where('recipientId', '==', partnerId),
        where('isOpened', '==', false)
      );
      
      const snapshot = await getDocs(q);
      const snaps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPendingSnaps(snaps);
    } catch (error) {
      console.error('Error fetching pending snaps:', error);
    }
  };

  // Debug logging
  useEffect(() => {
    console.log('SnapUpload state:', { 
      previewUrl: !!previewUrl, 
      isUploading, 
      user: !!user, 
      firestore: !!firestore, 
      storage: !!storage, 
      partnerId,
      buttonDisabled: isUploading,
      selectedFile: !!selectedFile,
      fileInputFiles: fileInputRef.current?.files?.length || 0,
      pendingSnapsCount: pendingSnaps.length
    });
  }, [previewUrl, isUploading, user, firestore, storage, partnerId, selectedFile, pendingSnaps]);

  // Set up real-time listener for pending snaps
  useEffect(() => {
    if (!user || !firestore || !partnerId) return;

    const snapsRef = collection(firestore, 'snaps');
    const q = query(
      snapsRef,
      where('senderId', '==', user.uid),
      where('recipientId', '==', partnerId),
      where('isOpened', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const snaps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPendingSnaps(snaps);
      console.log('Pending snaps updated:', snaps.length);
    }, (error) => {
      console.error('Error listening to pending snaps:', error);
      // If there's an error, try to fetch once
      fetchPendingSnaps();
    });

    return () => unsubscribe();
  }, [user, firestore, partnerId]);

  const checkSnapLimit = async () => {
    if (!user || !firestore) return false;
    
    try {
      const snapsRef = collection(firestore, 'snaps');
      const q = query(
        snapsRef,
        where('senderId', '==', user.uid),
        where('recipientId', '==', partnerId),
        where('isOpened', '==', false)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.size < MAX_SNAPS_PER_USER;
    } catch (error) {
      console.error('Error checking snap limit:', error);
      return false;
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log('File selected:', file?.name, file?.size);
    
    if (!file) {
      console.log('No file selected');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Invalid file type',
        description: 'Please select an image file.',
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Please select an image smaller than 10MB.',
      });
      return;
    }

    // Store the file in state
    setSelectedFile(file);
    console.log('File stored in state:', file.name);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    try {
      console.log('handleUpload called', { user: !!user, firestore: !!firestore, storage: !!storage, partnerId });
      
      if (!user || !firestore || !storage || !selectedFile) {
        console.log('Missing required data:', { user: !!user, firestore: !!firestore, storage: !!storage, file: !!selectedFile });
        if (!storage) {
          toast({
            variant: 'destructive',
            title: 'Storage not available',
            description: 'Firebase Storage is not configured. Please check your Firebase setup.',
          });
        }
        return;
      }

      const file = selectedFile;
      console.log('Using stored file:', file.name, file.size);
      
      const canSendSnap = await checkSnapLimit();
      console.log('Can send snap:', canSendSnap);

    if (!canSendSnap) {
      toast({
        variant: 'destructive',
        title: 'Snap limit reached',
        description: `You can only send ${MAX_SNAPS_PER_USER} unopened snaps at a time.`,
      });
      return;
    }

    setIsUploading(true);
    console.log('Starting upload...');

    try {
      // Upload image to Firebase Storage
      const imageRef = ref(storage, `snaps/${user.uid}/${Date.now()}_${file.name}`);
      console.log('Uploading to storage path:', imageRef.fullPath);
      
      const uploadResult = await uploadBytes(imageRef, file);
      console.log('Upload completed:', uploadResult);
      
      const imageUrl = await getDownloadURL(uploadResult.ref);
      console.log('Image URL:', imageUrl);

      // Create snap document
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + SNAP_EXPIRY_HOURS);

      const snapData = {
        senderId: user.uid,
        recipientId: partnerId,
        imageUrl: imageUrl,
        createdAt: serverTimestamp(),
        expiresAt: serverTimestamp(),
        isOpened: false,
        viewDuration: 5,
      };
      
      console.log('Creating snap document:', snapData);
      const snapDoc = await addDoc(collection(firestore, 'snaps'), snapData);
      console.log('Snap document created:', snapDoc.id);

      // Send notification to partner
      console.log('Sending notification to partner:', partnerId);
      await addDoc(collection(firestore, 'users', partnerId, 'notifications'), {
        type: 'snap',
        from: user.uid,
        description: '📸 Sent you a snap!',
        timestamp: serverTimestamp(),
        processed: false,
      });
      console.log('Notification sent');

      toast({
        title: 'Snap sent! 📸',
        description: 'Your snap has been sent to your partner.',
      });

      // Reset form
      setPreviewUrl(null);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      console.log('Calling onSnapSent callback');
      onSnapSent();

    } catch (error) {
      console.error('Error uploading snap:', error);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: 'Failed to send snap. Please try again.',
      });
    } finally {
      setIsUploading(false);
      console.log('Upload process completed');
    }
    } catch (error) {
      console.error('Error in handleUpload:', error);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: 'An unexpected error occurred. Please try again.',
      });
    }
  };

  const handleCancel = () => {
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="mb-4 cute-card">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-pink-500" />
            <h3 className="font-semibold text-pink-600">Send a Snap 📸</h3>
          </div>
          
          {!previewUrl ? (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="grid grid-cols-3 gap-7">
                {/* Three round columns - show occupied for pending snaps */}
                {[0, 1, 2].map((index) => {
                  const isOccupied = index < pendingSnaps.length;
                  const pendingSnap = pendingSnaps[index];
                  
                  return (
                    <div
                      key={index}
                      onClick={!isOccupied ? () => fileInputRef.current?.click() : undefined}
                      className={`aspect-square rounded-full border-2 transition-colors flex items-center justify-center ${
                        isOccupied
                          ? 'border-pink-400 bg-pink-100 cursor-default'
                          : 'border-dashed border-pink-300 hover:border-pink-400 hover:bg-pink-50 cursor-pointer'
                      }`}
                    >
                      {isOccupied ? (
                        <div className="text-center">
                          <div className="text-pink-600 text-xs font-medium">📸</div>
                          <div className="text-pink-500 text-xs mt-1">Sent</div>
                        </div>
                      ) : (
                        <Camera className="h-6 w-6 text-pink-500" />
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-center text-sm text-pink-600">
                {pendingSnaps.length > 0 
                  ? `${pendingSnaps.length} snap(s) pending - waiting for partner to open`
                  : 'Tap any circle to upload a snap'
                }
              </p>
              <p className="text-center text-xs cute-text-subtle">
                You can send {MAX_SNAPS_PER_USER - pendingSnaps.length} more snap{MAX_SNAPS_PER_USER - pendingSnaps.length !== 1 ? 's' : ''}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Snap preview"
                  className="w-full h-48 object-cover rounded-lg border-2 border-pink-300"
                />
                <Button
                  onClick={handleCancel}
                  size="sm"
                  variant="destructive"
                  className="absolute top-2 right-2 h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    console.log('Send Snap button clicked!', { isUploading, disabled: isUploading });
                    console.log('About to call handleUpload...');
                    handleUpload();
                    console.log('handleUpload call completed');
                  }}
                  disabled={isUploading}
                  className="flex-1 bg-pink-500 hover:bg-pink-600 cute-button"
                >
                  {isUploading ? (
                    <>
                      <Upload className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Send Snap 📸
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  disabled={isUploading}
                  className="cute-button"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

