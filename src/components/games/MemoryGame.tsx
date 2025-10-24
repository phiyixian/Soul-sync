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
  deleteDoc,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { GameSession, PlayerRole } from '@/lib/game-types';
import { Clock, Trophy, Brain } from 'lucide-react';

interface MemoryGameProps {
  gameId: string;
}

interface MemoryCard {
  id: number;
  value: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface MemoryGameData {
  cards: MemoryCard[];
  flippedCards: number[];
  moves: number;
  matches: number;
  currentPlayer: PlayerRole;
}

export default function MemoryGame({ gameId }: MemoryGameProps) {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [game, setGame] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [makingMove, setMakingMove] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const [flippingCards, setFlippingCards] = useState<number[]>([]);

  // Initialize memory cards
  const initializeCards = (): MemoryCard[] => {
    const symbols = ['🎯', '🎨', '🎪', '🎭', '🎪', '🎨', '🎯', '🎭'];
    return symbols.map((symbol, index) => ({
      id: index,
      value: symbol,
      isFlipped: false,
      isMatched: false
    }));
  };

  // Initialize game data with player stats
  const initializeGameData = (): MemoryGameData => {
    return {
      cards: initializeCards(),
      flippedCards: [],
      moves: 0,
      matches: 0,
      currentPlayer: 'player1',
      playerStats: {
        player1: { moves: 0, matches: 0 },
        player2: { moves: 0, matches: 0 }
      }
    };
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
        const currentGameData = gameData.gameData as MemoryGameData;
        const currentCards = currentGameData?.cards || [];
        const isPlayer1 = gameData.player1Id === user?.uid;
        const isPlayer2 = gameData.player2Id === user?.uid;
        const currentPlayerRole = isPlayer1 ? 'player1' : isPlayer2 ? 'player2' : null;
        
        // If it's not the current user's turn, show a notification
        if (gameData.currentPlayer !== currentPlayerRole && game) {
          toast({
            title: 'Move received!',
            description: 'Your partner made a move. It\'s your turn!',
            duration: 2000,
          });
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
              status: 'active',
              gameData: initializeGameData()
            });
            console.log('Game transitioned from waiting to active');
          } catch (error) {
            console.error('Error transitioning game to active:', error);
          }
        }
      } else {
        console.log('Game session not found');
        setGame(null);
      }
      setLoading(false);
    });

    // Cleanup on component unmount
    return () => {
      unsubscribe();
    };
  }, [gameId, firestore, redirectCountdown, toast]);

  const flipCard = async (cardId: number) => {
    if (!game || !user || makingMove) return;

    const gameData = game.gameData as MemoryGameData;
    const currentCards = gameData?.cards || initializeCards();
    const currentFlippedCards = gameData?.flippedCards || [];
    const currentMoves = gameData?.moves || 0;
    const currentMatches = gameData?.matches || 0;
    const currentPlayerStats = gameData?.playerStats || {
      player1: { moves: 0, matches: 0 },
      player2: { moves: 0, matches: 0 }
    };
    
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

    // Check if card is already flipped or matched
    const card = currentCards[cardId];
    if (card.isFlipped || card.isMatched) {
      return;
    }

    // If we already have 2 cards flipped, don't allow more
    if (currentFlippedCards.length >= 2) {
      return;
    }

    setMakingMove(true);

    try {
      const newCards = [...currentCards];
      newCards[cardId] = { ...card, isFlipped: true };
      
      let newFlippedCards = [...currentFlippedCards, cardId];
      let newMoves = currentMoves;
      let newMatches = currentMatches;
      let nextPlayer = game.currentPlayer;
      let newPlayerStats = { ...currentPlayerStats };
      
      // Update the game state immediately for real-time viewing
      await updateDoc(doc(firestore, 'gameSessions', gameId), {
        currentPlayer: nextPlayer, // Top-level currentPlayer
        gameData: {
          cards: newCards,
          flippedCards: newFlippedCards,
          moves: newMoves,
          matches: newMatches,
          currentPlayer: nextPlayer, // GameData currentPlayer
          playerStats: newPlayerStats
        }
      });
      
      // If this is the second card, check for match and handle turn logic
      if (newFlippedCards.length === 2) {
        newMoves += 1;
        // Increment individual player move count
        newPlayerStats[currentPlayerRole].moves += 1;
        
        const [card1Id, card2Id] = newFlippedCards;
        const card1 = newCards[card1Id];
        const card2 = newCards[card2Id];
        
        if (card1.value === card2.value) {
          // Match found - keep cards matched, same player continues
          newCards[card1Id] = { ...card1, isMatched: true };
          newCards[card2Id] = { ...card2, isMatched: true };
          newMatches += 1;
          // Increment individual player match count
          newPlayerStats[currentPlayerRole].matches += 1;
          newFlippedCards = []; // Clear flipped cards for match
          
          // Update with match result - same player continues
          await updateDoc(doc(firestore, 'gameSessions', gameId), {
            currentPlayer: nextPlayer, // Top-level currentPlayer (stays the same)
            gameData: {
              cards: newCards,
              flippedCards: newFlippedCards,
              moves: newMoves,
              matches: newMatches,
              currentPlayer: nextPlayer, // GameData currentPlayer (stays the same)
              playerStats: newPlayerStats
            }
          });
          // Player gets another turn for match
        } else {
          // No match - switch players after a delay
          nextPlayer = game.currentPlayer === 'player1' ? 'player2' : 'player1';
          
          // Update with no match result - update both top-level currentPlayer and gameData currentPlayer
          await updateDoc(doc(firestore, 'gameSessions', gameId), {
            currentPlayer: nextPlayer, // Top-level currentPlayer
            gameData: {
              cards: newCards,
              flippedCards: newFlippedCards,
              moves: newMoves,
              matches: newMatches,
              currentPlayer: nextPlayer, // GameData currentPlayer
              playerStats: newPlayerStats
            }
          });
          
          // Flip cards back after a delay
          setTimeout(async () => {
            const finalCards = [...newCards];
            finalCards[card1Id] = { ...card1, isFlipped: false };
            finalCards[card2Id] = { ...card2, isFlipped: false };
            
            await updateDoc(doc(firestore, 'gameSessions', gameId), {
              gameData: {
                cards: finalCards,
                flippedCards: [],
                moves: newMoves,
                matches: newMatches,
                currentPlayer: nextPlayer,
                playerStats: newPlayerStats
              }
            });
          }, 2000); // 2 second delay to see the cards
        }
      }
      
      // Check for game completion
      const allMatched = newCards.every(card => card.isMatched);
      if (allMatched) {
        // Determine winner based on individual player statistics
        const player1Matches = newPlayerStats.player1.matches;
        const player2Matches = newPlayerStats.player2.matches;
        
        let winner = null;
        if (player1Matches > player2Matches) {
          winner = 'player1';
        } else if (player2Matches > player1Matches) {
          winner = 'player2';
        } else {
          // Draw - play another round
          winner = 'draw';
        }
        
        await updateDoc(doc(firestore, 'gameSessions', gameId), {
          status: 'completed',
          winner: winner,
          completedAt: new Date()
        });
        
        // Award credits
        await awardCredits(winner, isPlayer1 ? 'player1' : 'player2');
        
        // Schedule game session deletion
        deleteCompletedGame(gameId);
      }

    } catch (error) {
      console.error('Error making move:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to make move. Please try again.',
      });
    } finally {
      setMakingMove(false);
    }
  };

  const awardCredits = async (result: string, playerRole: PlayerRole) => {
    if (!firestore || !user) return;
    
    try {
      let credits = 0;
      if (result === playerRole) {
        credits = 25; // Win
      } else if (result === 'draw') {
        credits = 15; // Draw
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
        reason: `Memory Game ${result === playerRole ? 'win' : result === 'draw' ? 'draw' : 'participation'}`,
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

  if (loading) {
    return (
      <div className="p-4">
        <div className="text-center py-8">
          <div className="text-lg font-semibold mb-2">Loading Memory Game...</div>
          <div className="text-muted-foreground">Setting up your game session</div>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="p-4">
        <div className="text-center py-8">
          <div className="text-lg font-semibold mb-2">Game Not Found</div>
          <div className="text-muted-foreground">This game session could not be found.</div>
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

  const gameData = game.gameData as MemoryGameData;
  const isPlayer1 = game.player1Id === user?.uid;
  const isPlayer2 = game.player2Id === user?.uid;
  const currentPlayerRole = isPlayer1 ? 'player1' : isPlayer2 ? 'player2' : null;

  // Initialize game data if it doesn't exist
  const cards = gameData?.cards || initializeCards();
  const moves = gameData?.moves || 0;
  const matches = gameData?.matches || 0;
  const playerStats = gameData?.playerStats || {
    player1: { moves: 0, matches: 0 },
    player2: { moves: 0, matches: 0 }
  };

  return (
    <div className="p-4 space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Memory Game</h1>
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

      {/* Game Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Game Stats
            {makingMove && (
              <div className="flex items-center gap-1 text-xs text-blue-600">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                <span>Processing move...</span>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {/* Player 1 Stats */}
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-lg font-semibold text-blue-800 mb-2">
                {isPlayer1 ? 'You' : 'Partner'}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-blue-600">Moves:</span>
                  <span className="font-bold text-blue-800">{playerStats.player1.moves}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-blue-600">Matches:</span>
                  <span className="font-bold text-blue-800">{playerStats.player1.matches}</span>
                </div>
              </div>
            </div>
            
            {/* Player 2 Stats */}
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-lg font-semibold text-green-800 mb-2">
                {isPlayer2 ? 'You' : 'Partner'}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-green-600">Moves:</span>
                  <span className="font-bold text-green-800">{playerStats.player2.moves}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-green-600">Matches:</span>
                  <span className="font-bold text-green-800">{playerStats.player2.matches}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Overall Stats */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-gray-600">{moves}</div>
                <div className="text-sm text-muted-foreground">Total Moves</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-600">{matches}</div>
                <div className="text-sm text-muted-foreground">Total Matches</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Memory Cards */}
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Memory Cards</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2 max-w-md mx-auto">
            {cards.map((card, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-16 w-16 text-2xl"
                onClick={() => flipCard(index)}
                disabled={
                  game.status !== 'active' || 
                  card.isMatched ||
                  game.currentPlayer !== currentPlayerRole ||
                  makingMove ||
                  (gameData?.flippedCards?.length >= 2 && !card.isFlipped)
                }
              >
                {card.isFlipped || card.isMatched ? card.value : '?'}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Game Rules */}
      <Card>
        <CardHeader>
          <CardTitle>How to Play</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Flip 2 cards per turn:</span>
            <span className="font-medium text-blue-600">Find matching pairs</span>
          </div>
          <div className="flex justify-between">
            <span>Match found:</span>
            <span className="font-medium text-green-600">Keep matched, another turn</span>
          </div>
          <div className="flex justify-between">
            <span>No match:</span>
            <span className="font-medium text-gray-600">Cards flip back, switch turns</span>
          </div>
          <div className="flex justify-between">
            <span>Complete all matches:</span>
            <span className="font-medium text-blue-600">Win the game!</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
