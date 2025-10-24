'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Eye, Clock, Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useUser } from '@/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Snap, SNAP_VIEW_DURATION } from '@/lib/snap-types';

interface SnapViewerProps {
  snap: Snap;
  onSnapOpened: (snapId: string) => void;
  onClose: () => void;
}

export default function SnapViewer({ snap, onSnapOpened, onClose }: SnapViewerProps) {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [timeRemaining, setTimeRemaining] = useState(SNAP_VIEW_DURATION);
  const [isViewing, setIsViewing] = useState(false);
  const [hasOpened, setHasOpened] = useState(snap.isOpened);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startViewing = async () => {
    if (hasOpened || !user || !firestore) return;

    setIsViewing(true);
    setTimeRemaining(SNAP_VIEW_DURATION);

    // Mark snap as opened (but don't delete yet)
    try {
      await updateDoc(doc(firestore, 'snaps', snap.id), {
        isOpened: true,
        openedAt: new Date(),
      });
      setHasOpened(true);
      console.log('Snap marked as opened:', snap.id);
    } catch (error) {
      console.error('Error marking snap as opened:', error);
      // If update fails, still allow viewing
    }

    // Start countdown
    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Auto-close after view duration
    timeoutRef.current = setTimeout(() => {
      handleClose();
    }, SNAP_VIEW_DURATION * 1000);
  };

  const handleClose = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsViewing(false);
    
    // Call onSnapOpened when viewing is complete (for deletion after 5 seconds)
    if (hasOpened) {
      console.log('Calling onSnapOpened for deletion after 5 seconds:', snap.id);
      // Delete after 5 seconds to allow viewing
      setTimeout(() => {
        onSnapOpened(snap.id);
      }, 5000);
    }
    
    onClose();
  };

  const handleDeleteSnap = async () => {
    if (!firestore) return;

    try {
      await deleteDoc(doc(firestore, 'snaps', snap.id));
      toast({
        title: 'Snap deleted',
        description: 'The snap has been removed.',
      });
    } catch (error) {
      console.error('Error deleting snap:', error);
    }
    handleClose();
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const progressPercentage = (timeRemaining / SNAP_VIEW_DURATION) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <Card className="w-full max-w-md mx-4 bg-gradient-to-br from-pink-100 to-purple-100 border-2 border-pink-300">
        <CardContent className="p-0">
          <div className="relative">
            {/* Progress bar */}
            {isViewing && (
              <div className="absolute top-0 left-0 right-0 z-10 p-2">
                <div className="flex items-center gap-2 text-white">
                  <Clock className="h-4 w-4" />
                  <Progress 
                    value={progressPercentage} 
                    className="flex-1 h-2 bg-white/30"
                  />
                  <span className="text-sm font-bold">{timeRemaining}s</span>
                </div>
              </div>
            )}

            {/* Image */}
            <div className="relative">
              <img
                src={snap.imageUrl}
                alt="Snap"
                className="w-full h-96 object-cover rounded-t-lg"
              />
              
              {/* Overlay */}
              {!isViewing && !hasOpened && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-t-lg">
                  <div className="text-center text-white">
                    <Eye className="h-12 w-12 mx-auto mb-2 opacity-80" />
                    <p className="text-lg font-semibold mb-2">Tap to view snap</p>
                    <p className="text-sm opacity-80">Viewing time: {SNAP_VIEW_DURATION} seconds</p>
                  </div>
                </div>
              )}

              {hasOpened && !isViewing && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-t-lg">
                  <div className="text-center text-white">
                    <Heart className="h-12 w-12 mx-auto mb-2 text-pink-400" />
                    <p className="text-lg font-semibold mb-2">Snap viewed</p>
                    <p className="text-sm opacity-80">This snap has been opened</p>
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="p-4 space-y-3">
              {!hasOpened && !isViewing && (
                <Button
                  onClick={startViewing}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-semibold py-3"
                >
                  <Eye className="h-5 w-5 mr-2" />
                  View Snap ({SNAP_VIEW_DURATION}s)
                </Button>
              )}

              {isViewing && (
                <div className="text-center">
                  <p className="text-sm cute-text-muted mb-2">
                    Snap will close automatically in {timeRemaining} seconds
                  </p>
                  <Button
                    onClick={handleClose}
                    variant="outline"
                    className="w-full"
                  >
                    Close Now
                  </Button>
                </div>
              )}

              {hasOpened && !isViewing && (
                <div className="flex gap-2">
                  <Button
                    onClick={handleClose}
                    variant="outline"
                    className="flex-1"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={handleDeleteSnap}
                    variant="destructive"
                    className="flex-1"
                  >
                    Delete Snap
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

