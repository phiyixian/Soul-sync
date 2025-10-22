'use client';

import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import TicTacToeGame from '@/components/games/TicTacToeGame';

export default function GameSessionPage() {
  const params = useParams();
  const gameId = params.gameId as string;

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
          <div className="text-muted-foreground">Invalid game ID</div>
        </div>
      </div>
    );
  }

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
      <TicTacToeGame gameId={gameId} />
    </div>
  );
}
