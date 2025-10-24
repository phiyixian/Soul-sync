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
  deleteDoc,
  query,
  where,
  getDocs
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
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

  // Delete completed game session after a delay
  const deleteCompletedGame = async (gameId: string) => {
    try {
      // Mark the game invite as completed first
      const invitesRef = collection(firestore, 'gameInvites');
      const invitesQuery = query(invitesRef, where('gameId', '==', gameId));
      const invitesSnapshot = await getDocs(invitesQuery);
      
      invitesSnapshot.forEach(async (doc) => {
        await updateDoc(doc.ref, {
          status: 'completed'
        });
      });

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
    const unsubscribe = onSnapshot(gameRef, async (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const gameData = {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          completedAt: data.completedAt?.toDate(),
        } as GameSession;
        
        // Check if this is a new move from the other player
        const currentGameData = gameData.gameData as TicTacToeGameData;
        const currentMoves = currentGameData?.moves || [];
        const isPlayer1 = gameData.player1Id === user?.uid;
        const isPlayer2 = gameData.player2Id === user?.uid;
        const currentPlayerRole = isPlayer1 ? 'player1' : isPlayer2 ? 'player2' : null;
        
        // If there are moves and it's not the current user's turn, show a notification
        if (Array.isArray(currentMoves) && currentMoves.length > 0 && gameData.currentPlayer !== currentPlayerRole && game) {
          const lastMove = currentMoves[currentMoves.length - 1];
          if (lastMove && typeof lastMove === 'object' && lastMove.player !== currentPlayerRole) {
            toast({
              title: 'Move received!',
              description: 'Your partner made a move. It\'s your turn!',
              duration: 2000,
            });
          }
        }
        
        // Check if game is completed and handle redirect for both players
        if (gameData.status === 'completed' && redirectCountdown === null) {
          const winner = gameData.winner;
          const isDraw = !winner;
          
          if (winner || isDraw) {
            // Show completion message
            toast({
              title: winner ? '🎉 Game Over!' : '🤝 Draw!',
              description: winner 
                ? `${winner === 'player1' ? 'Player 1' : 'Player 2'} wins!`
                : 'The game ended in a tie!',
            });
            
            // Start redirect countdown for both players
            setRedirectCountdown(3);
            const countdownInterval = setInterval(() => {
              setRedirectCountdown(prev => {
                if (prev === null || prev <= 1) {
                  clearInterval(countdownInterval);
                  window.location.href = '/home/games';
                  return null;
                }
                return prev - 1;
              });
            }, 1000);
          }
        }
        
        setGame(gameData);
        setLastUpdateTime(new Date());
        
        // Auto-transition from waiting to active when both players are present
        if (gameData.status === 'waiting' && gameData.player1Id && gameData.player2Id) {
          try {
            await updateDoc(gameRef, {
              status: 'active'
            });
            console.log('Game transitioned from waiting to active');
          } catch (error) {
            console.error('Error transitioning game to active:', error);
          }
        }
      }
      setLoading(false);
    });

    // Cleanup on component unmount - only mark as cancelled if game was abandoned
    return () => {
      unsubscribe();
      // Only mark as cancelled if the game was actually abandoned (not just navigating away)
      // We'll use a different approach - mark as cancelled only if game is still waiting
      if (game && game.status === 'waiting') {
        updateDoc(gameRef, {
          status: 'cancelled',
          completedAt: new Date()
        }).catch(console.error);
        
        // Also mark the game invite as cancelled
        const invitesRef = collection(firestore, 'gameInvites');
        const invitesQuery = query(invitesRef, where('gameId', '==', gameId));
        getDocs(invitesQuery).then(snapshot => {
          snapshot.forEach(doc => {
            updateDoc(doc.ref, {
              status: 'cancelled'
            }).catch(console.error);
          });
        }).catch(console.error);
      }
    };
  }, [gameId, firestore, game]);

  const makeMove = async (position: number) => {
    if (!game || !user || makingMove) return;
    
    const gameData = game.gameData as TicTacToeGameData;
    const currentBoard = gameData?.board || Array(9).fill(null);
    const currentMoves = Array.isArray(gameData?.moves) ? gameData.moves : [];
    
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
        player: currentPlayerRole as PlayerRole,
        position,
        timestamp: new Date()
      };
      
      const updatedGameData: TicTacToeGameData = {
        board: newBoard,
        moves: [...currentMoves, newMove],
        playerStats: gameData.playerStats || {
          player1: { moves: 0, wins: 0 },
          player2: { moves: 0, wins: 0 }
        }
      };

      // Check for win condition
      const winner = checkWinner(newBoard);
      const isDraw = newBoard.every(cell => cell !== null) && !winner;
      
      const nextPlayer = game.currentPlayer === 'player1' ? 'player2' : 'player1';
      
      const updateData: any = {
        gameData: updatedGameData,
        currentPlayer: winner || isDraw ? game.currentPlayer : nextPlayer,
        status: winner || isDraw ? 'completed' : 'active',
        winner: winner,
      };
      
      // Only add completedAt if the game is actually completed
      if (winner || isDraw) {
        updateData.completedAt = new Date();
      }
      
      await updateDoc(doc(firestore, 'gameSessions', gameId), updateData);

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
        
        // Auto-redirect to games page after 3 seconds
        setRedirectCountdown(3);
        const countdownInterval = setInterval(() => {
          setRedirectCountdown(prev => {
            if (prev === null || prev <= 1) {
              clearInterval(countdownInterval);
              window.location.href = '/home/games';
              return null;
            }
            return prev - 1;
          });
        }, 1000);
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
        credits: credits // Award the earned credits
      });

      // Log the reward
      await addDoc(collection(firestore, 'creditTransactions'), {
        userId: user.uid,
        amount: credits,
        reason: `Game ${result === playerRole ? 'win' : result === 'draw' ? 'draw' : 'participation'}`,
        gameId: gameId,
        timestamp: new Date(),
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

  // Show waiting state
  if (game.status === 'waiting') {
    return (
      <div className="p-4">
        <div className="text-center py-8">
          <div className="text-lg font-semibold mb-2">Waiting for Players...</div>
          <div className="text-muted-foreground mb-4">
            Both players need to join before the game can start.
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span>Connecting players...</span>
          </div>
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
  const moves = Array.isArray(gameData?.moves) ? gameData.moves : [];

  return (
    <div className="p-4 space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Tic-Tac-Toe</h1>
        <div className="flex items-center gap-4 mt-2">
          <Badge variant={game.status === 'active' ? 'default' : 'secondary'}>
            {game.status}
          </Badge>
          {redirectCountdown !== null && (
            <div className="flex items-center gap-2 text-sm text-orange-600">
              <Clock className="h-4 w-4" />
              <span>Redirecting in {redirectCountdown}s...</span>
            </div>
          )}
          {game.status === 'active' && redirectCountdown === null && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              <span>
                {game.currentPlayer === currentPlayerRole ? 'Your turn' : 'Partner\'s turn'}
              </span>
              {lastUpdateTime && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Live</span>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Game Board */}
      <Card>
        <CardHeader>
          <CardTitle className="text-center flex items-center justify-center gap-2">
            Game Board
            {makingMove && (
              <div className="flex items-center gap-1 text-xs text-blue-600">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                <span>Processing move...</span>
              </div>
            )}
          </CardTitle>
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
