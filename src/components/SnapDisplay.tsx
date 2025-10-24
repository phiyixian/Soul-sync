'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, Eye, Clock } from 'lucide-react';
import { Snap } from '@/lib/snap-types';
import SnapViewer from './SnapViewer';

interface SnapDisplayProps {
  snaps: Snap[];
  onSnapOpened: (snapId: string) => void;
}

export default function SnapDisplay({ snaps, onSnapOpened }: SnapDisplayProps) {
  const [selectedSnap, setSelectedSnap] = useState<Snap | null>(null);
  const [processingSnaps, setProcessingSnaps] = useState<Set<string>>(new Set());

  const handleSnapClick = (snap: Snap) => {
    // Prevent multiple clicks on the same snap
    if (processingSnaps.has(snap.id)) {
      console.log('Snap already being processed:', snap.id);
      return;
    }

    // Mark snap as being processed
    setProcessingSnaps(prev => new Set(prev).add(snap.id));
    
    // Open the snap viewer
    setSelectedSnap(snap);
    
    // Remove from processing set after a delay
    setTimeout(() => {
      setProcessingSnaps(prev => {
        const newSet = new Set(prev);
        newSet.delete(snap.id);
        return newSet;
      });
    }, 10000); // Remove after 10 seconds (longer than viewing time)
  };

  const handleCloseViewer = () => {
    setSelectedSnap(null);
    // Clear processing state for the closed snap
    if (selectedSnap) {
      setProcessingSnaps(prev => {
        const newSet = new Set(prev);
        newSet.delete(selectedSnap.id);
        return newSet;
      });
    }
  };

  const getSnapStatus = (snap: Snap) => {
    if (snap.isOpened) {
      return { icon: Eye, text: 'Opened', color: 'text-green-600 bg-green-100' };
    } else {
      return { icon: Clock, text: 'New', color: 'text-pink-600 bg-pink-100' };
    }
  };

  if (snaps.length === 0) {
    return (
      <Card className="mb-4">
        <CardContent className="p-4 text-center">
          <Camera className="h-8 w-8 mx-auto mb-2 cute-text-subtle" />
          <p className="text-sm cute-text-muted">No snaps yet</p>
          <p className="text-xs cute-text-subtle">Send a snap to get started!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Camera className="h-5 w-5 text-pink-500" />
            <h3 className="font-semibold text-pink-600">Snaps 📸</h3>
            <span className="text-xs cute-text-subtle">({snaps.length}/3)</span>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            {snaps.map((snap) => {
              const status = getSnapStatus(snap);
              const StatusIcon = status.icon;
              const isProcessing = processingSnaps.has(snap.id);
              
              return (
                <div
                  key={snap.id}
                  className={`relative group ${isProcessing ? 'cursor-wait opacity-50' : 'cursor-pointer'}`}
                  onClick={() => handleSnapClick(snap)}
                >
                  <div className="aspect-square rounded-full overflow-hidden border-2 border-pink-300 hover:border-pink-400 transition-colors">
                    <img
                      src={snap.imageUrl}
                      alt="Snap"
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors rounded-full" />
                    
                    {/* Status badge */}
                    <div className={`absolute top-1 right-1 px-1.5 py-0.5 rounded-full text-xs font-medium ${
                      isProcessing ? 'text-blue-600 bg-blue-100' : status.color
                    }`}>
                      <StatusIcon className="h-3 w-3 inline mr-1" />
                      {isProcessing ? 'Opening...' : status.text}
                    </div>
                    
                    {/* View indicator */}
                    {!snap.isOpened && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-full">
                        <div className="bg-pink-500 text-white rounded-full p-2 opacity-80 group-hover:opacity-100 transition-opacity">
                          <Eye className="h-4 w-4" />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Snap info */}
                  <div className="mt-1 text-center">
                    <p className="text-xs cute-text-muted">
                      {new Date(snap.createdAt).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          
          {snaps.length === 0 && (
            <div className="mt-3 text-center">
              <p className="text-xs cute-text-subtle">
                No snaps received yet
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Snap Viewer Modal */}
      {selectedSnap && (
        <SnapViewer
          snap={selectedSnap}
          onSnapOpened={onSnapOpened}
          onClose={handleCloseViewer}
        />
      )}
    </>
  );
}

