'use client';

import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import TicTacToeGame from '@/components/games/TicTacToeGame';
import MemoryGame from '@/components/games/MemoryGame';
import WordGuessGame from '@/components/games/WordGuessGame';
import { useFirebase, useUser } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useState, useEffect } from 'react';

export default function GameSessionPage() {
  const searchParams = useSearchParams();
  const gameId = searchParams.get('gameId');
  const { firestore } = useFirebase();
  const { user } = useUser();
  const [gameType, setGameType] = useState<string>('');

  // Get game type from Firestore
  useEffect(() => {
    if (!gameId || !firestore) return;

    const gameRef = doc(firestore, 'gameSessions', gameId);
    const unsubscribe = onSnapshot(gameRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setGameType(data.gameType || 'tic-tac-toe');
      }
    });

    return () => unsubscribe();
  }, [gameId, firestore]);

  if (!gameId) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/home/games">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Game Error</h1>
        </div>
        <div className="text-center py-8">
          <div className="text-muted-foreground">No game ID provided</div>
          <Button asChild className="mt-4">
            <Link href="/home/games">Back to Games</Link>
          </Button>
        </div>
      </div>
    );
  }

  const renderGame = () => {
    if (!gameId) return null;
    
    // Ensure gameType is a string
    const safeGameType = typeof gameType === 'string' ? gameType : 'tic-tac-toe';
    
    switch (safeGameType) {
      case 'memory-match':
        return <MemoryGame gameId={gameId} />;
      case 'word-guess':
        return <WordGuessGame gameId={gameId} />;
      case 'tic-tac-toe':
      default:
        return <TicTacToeGame gameId={gameId} />;
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/home/games">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Game Session</h1>
      </div>
      {renderGame()}
    </div>
  );
}
