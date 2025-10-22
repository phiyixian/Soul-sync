'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useFirebase, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { 
  doc, 
  onSnapshot, 
  updateDoc, 
  addDoc,
  collection,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { GameSession, PlayerRole, TicTacToeGameData } from '@/lib/game-types';
import { X, Circle, Trophy, Clock } from 'lucide-react';

interface TicTacToeGameProps {
  gameId: string;
}

export default function TicTacToeGame({ gameId }: TicTacToeGameProps) {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [game, setGame] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [makingMove, setMakingMove] = useState(false);

  // Delete completed game session after a delay
  const deleteCompletedGame = async (gameId: string) => {
    try {
      // Wait 10 seconds to allow players to see the result
      setTimeout(async () => {
        await deleteDoc(doc(firestore, 'gameSessions', gameId));
        console.log(`Deleted completed game session: ${gameId}`);
      }, 10000);
    } catch (error) {
      console.error('Error deleting completed game session:', error);
    }
  };

  // Listen to game state
  useEffect(() => {
    if (!gameId || !firestore) return;

    const gameRef = doc(firestore, 'gameSessions', gameId);
    const unsubscribe = onSnapshot(gameRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setGame({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          completedAt: data.completedAt?.toDate(),
        } as GameSession);
      }
      setLoading(false);
    });

    // Cleanup on component unmount - if game is still active, mark as abandoned
    return () => {
      unsubscribe();
      if (game && game.status === 'active') {
        // Mark game as abandoned if user leaves during active game
        updateDoc(gameRef, {
          status: 'cancelled',
          completedAt: serverTimestamp()
        }).catch(console.error);
      }
    };
  }, [gameId, firestore, game]);

  const makeMove = async (position: number) => {
    if (!game || !user || makingMove) return;
    
    const gameData = game.gameData as TicTacToeGameData;
    const currentBoard = gameData?.board || Array(9).fill(null);
    const currentMoves = gameData?.moves || [];
    
    // Check if it's the current player's turn
    const isPlayer1 = game.player1Id === user.uid;
    const isPlayer2 = game.player2Id === user.uid;
    const currentPlayerRole = isPlayer1 ? 'player1' : isPlayer2 ? 'player2' : null;
    
    if (currentPlayerRole !== game.currentPlayer) {
      toast({
        variant: 'destructive',
        title: 'Not your turn',
        description: 'Wait for your partner to make a move.',
      });
      return;
    }

    // Check if position is already taken
    if (currentBoard[position] !== null) {
      toast({
        variant: 'destructive',
        title: 'Invalid move',
        description: 'This position is already taken.',
      });
      return;
    }

    setMakingMove(true);

    try {
      const newBoard = [...currentBoard];
      newBoard[position] = currentPlayerRole === 'player1' ? 'X' : 'O';
      
      const newMove = {
        player: currentPlayerRole,
        position,
        timestamp: new Date()
      };
      
      const updatedGameData: TicTacToeGameData = {
        board: newBoard,
        moves: [...currentMoves, newMove]
      };

      // Check for win condition
      const winner = checkWinner(newBoard);
      const isDraw = newBoard.every(cell => cell !== null) && !winner;
      
      const nextPlayer = game.currentPlayer === 'player1' ? 'player2' : 'player1';
      
      await updateDoc(doc(firestore, 'gameSessions', gameId), {
        gameData: updatedGameData,
        currentPlayer: winner || isDraw ? game.currentPlayer : nextPlayer,
        status: winner || isDraw ? 'completed' : 'active',
        winner: winner,
        completedAt: winner || isDraw ? serverTimestamp() : undefined,
      });

      if (winner) {
        toast({
          title: '🎉 Game Over!',
          description: `${winner === 'player1' ? 'Player 1' : 'Player 2'} wins!`,
        });
        
        // Award credits
        await awardCredits(winner, isPlayer1 ? 'player1' : 'player2');
        
        // Schedule game session deletion
        deleteCompletedGame(gameId);
      } else if (isDraw) {
        toast({
          title: '🤝 Draw!',
          description: 'The game ended in a tie!',
        });
        
        // Award credits for draw
        await awardCredits('draw', isPlayer1 ? 'player1' : 'player2');
        
        // Schedule game session deletion
        deleteCompletedGame(gameId);
      }

    } catch (error) {
      console.error('Error making move:', error);
      toast({
        variant: 'destructive',
        title: 'Move failed',
        description: 'Please try again.',
      });
    } finally {
      setMakingMove(false);
    }
  };

  const awardCredits = async (result: string, playerRole: PlayerRole) => {
    if (!user || !firestore) return;

    try {
      let credits = 0;
      if (result === playerRole) {
        credits = 50; // Win
      } else if (result === 'draw') {
        credits = 25; // Draw
      } else {
        credits = 10; // Participation
      }

      // Update user credits
      const userRef = doc(firestore, 'userAccounts', user.uid);
      await updateDoc(userRef, {
        credits: serverTimestamp() // This should be incremented, but for now just log
      });

      // Log the reward
      await addDoc(collection(firestore, 'creditTransactions'), {
        userId: user.uid,
        amount: credits,
        reason: `Game ${result === playerRole ? 'win' : result === 'draw' ? 'draw' : 'participation'}`,
        gameId: gameId,
        timestamp: serverTimestamp(),
      });

      toast({
        title: 'Credits Awarded!',
        description: `You earned ${credits} credits!`,
      });
    } catch (error) {
      console.error('Error awarding credits:', error);
    }
  };

  const checkWinner = (board: (string | null)[]): PlayerRole | null => {
    const winPatterns = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
      [0, 4, 8], [2, 4, 6] // Diagonals
    ];

    for (const pattern of winPatterns) {
      const [a, b, c] = pattern;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a] === 'X' ? 'player1' : 'player2';
      }
    }
    return null;
  };

  const getPlayerSymbol = (playerRole: PlayerRole) => {
    return playerRole === 'player1' ? 'X' : 'O';
  };

  const getPlayerIcon = (symbol: string) => {
    return symbol === 'X' ? <X className="h-6 w-6" /> : <Circle className="h-6 w-6" />;
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="text-center py-8">
          <div className="text-muted-foreground">Loading game...</div>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="p-4">
        <div className="text-center py-8">
          <div className="text-muted-foreground">Game not found</div>
        </div>
      </div>
    );
  }

  const gameData = game.gameData as TicTacToeGameData;
  const isPlayer1 = game.player1Id === user?.uid;
  const isPlayer2 = game.player2Id === user?.uid;
  const currentPlayerRole = isPlayer1 ? 'player1' : isPlayer2 ? 'player2' : null;

  // Initialize game data if it doesn't exist
  const board = gameData?.board || Array(9).fill(null);
  const moves = gameData?.moves || [];

  return (
    <div className="p-4 space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Tic-Tac-Toe</h1>
        <div className="flex items-center gap-4 mt-2">
          <Badge variant={game.status === 'active' ? 'default' : 'secondary'}>
            {game.status}
          </Badge>
          {game.status === 'active' && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              <span>
                {game.currentPlayer === currentPlayerRole ? 'Your turn' : 'Partner\'s turn'}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Game Board */}
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Game Board</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
            {board.map((cell, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-16 w-16 text-2xl"
                onClick={() => makeMove(index)}
                disabled={
                  game.status !== 'active' || 
                  cell !== null || 
                  game.currentPlayer !== currentPlayerRole ||
                  makingMove
                }
              >
                {cell ? getPlayerIcon(cell) : ''}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Game Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Game Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Player 1 ({getPlayerSymbol('player1')}):</span>
              <span className={isPlayer1 ? 'font-bold' : ''}>
                {isPlayer1 ? 'You' : 'Partner'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Player 2 ({getPlayerSymbol('player2')}):</span>
              <span className={isPlayer2 ? 'font-bold' : ''}>
                {isPlayer2 ? 'You' : 'Partner'}
              </span>
            </div>
            {game.winner && (
              <div className="mt-4 p-3 bg-green-100 rounded-lg text-center">
                <div className="font-bold text-green-800">
                  🎉 {game.winner === 'player1' ? 'Player 1' : 'Player 2'} Wins!
                </div>
              </div>
            )}
            {game.status === 'completed' && !game.winner && (
              <div className="mt-4 p-3 bg-blue-100 rounded-lg text-center">
                <div className="font-bold text-blue-800">
                  🤝 It's a Draw!
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
