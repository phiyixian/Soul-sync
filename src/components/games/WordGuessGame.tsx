'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { Clock, Trophy, BookOpen } from 'lucide-react';

interface WordGuessGameProps {
  gameId: string;
}

interface WordGuessGameData {
  word: string;
  guessedLetters: string[];
  wrongGuesses: number;
  currentPlayer: PlayerRole;
  gameState: 'playing' | 'won' | 'lost';
}

export default function WordGuessGame({ gameId }: WordGuessGameProps) {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [game, setGame] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [makingMove, setMakingMove] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const [guessInput, setGuessInput] = useState('');

  // Word list for the game
  const words = ['HANGMAN', 'PUZZLE', 'GAMING', 'FRIEND', 'PARTNER', 'VICTORY', 'MEMORY', 'PUZZLE'];

  // Initialize game data
  const initializeGameData = (): WordGuessGameData => {
    const randomWord = words[Math.floor(Math.random() * words.length)];
    return {
      word: randomWord,
      guessedLetters: [],
      wrongGuesses: 0,
      currentPlayer: 'player1',
      gameState: 'playing'
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
        const currentGameData = gameData.gameData as WordGuessGameData;
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
            const initialGameData = initializeGameData();
            await updateDoc(gameRef, {
              status: 'active',
              gameData: {
                word: initialGameData.word,
                guessedLetters: initialGameData.guessedLetters,
                wrongGuesses: initialGameData.wrongGuesses,
                currentPlayer: initialGameData.currentPlayer,
                gameState: initialGameData.gameState
              }
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

  const makeGuess = async () => {
    if (!game || !user || makingMove || !guessInput.trim()) return;

    const gameData = game.gameData as WordGuessGameData;
    const currentWord = gameData?.word || '';
    const currentGuessedLetters = gameData?.guessedLetters || [];
    const currentWrongGuesses = gameData?.wrongGuesses || 0;
    
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

    const guess = guessInput.trim().toUpperCase();
    
    // Validate guess
    if (guess.length !== 1 || !/[A-Z]/.test(guess)) {
      toast({
        variant: 'destructive',
        title: 'Invalid guess',
        description: 'Please enter a single letter.',
      });
      return;
    }

    if (currentGuessedLetters.includes(guess)) {
      toast({
        variant: 'destructive',
        title: 'Already guessed',
        description: 'You have already guessed this letter.',
      });
      return;
    }

    setMakingMove(true);

    try {
      const newGuessedLetters = [...currentGuessedLetters, guess];
      let newWrongGuesses = currentWrongGuesses;
      let nextPlayer = game.currentPlayer;
      let gameState = gameData?.gameState || 'playing';
      let winner = null;
      
      // Check if guess is correct
      if (currentWord.includes(guess)) {
        // Correct guess - check if word is complete
        const wordComplete = currentWord.split('').every(letter => 
          letter === ' ' || newGuessedLetters.includes(letter)
        );
        
        if (wordComplete) {
          gameState = 'won';
          winner = game.currentPlayer;
        }
        // Player gets another turn for correct guess
      } else {
        // Wrong guess
        newWrongGuesses += 1;
        nextPlayer = game.currentPlayer === 'player1' ? 'player2' : 'player1';
        
        if (newWrongGuesses >= 6) {
          gameState = 'lost';
          winner = nextPlayer; // The other player wins
        }
      }
      
      const updateData: any = {
        gameData: {
          word: currentWord || '',
          guessedLetters: newGuessedLetters || [],
          wrongGuesses: newWrongGuesses || 0,
          currentPlayer: nextPlayer || 'player1',
          gameState: gameState || 'playing'
        },
        currentPlayer: nextPlayer || 'player1',
        status: gameState !== 'playing' ? 'completed' : 'active',
        winner: winner || null,
      };
      
      // Only add completedAt if the game is actually completed
      if (gameState !== 'playing') {
        updateData.completedAt = new Date();
      }
      
      await updateDoc(doc(firestore, 'gameSessions', gameId), updateData);

      if (gameState !== 'playing') {
        // Award credits
        await awardCredits(winner, isPlayer1 ? 'player1' : 'player2');
        
        // Schedule game session deletion
        deleteCompletedGame(gameId);
      }

      setGuessInput('');

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
        reason: `Word Guess ${result === playerRole ? 'win' : result === 'draw' ? 'draw' : 'participation'}`,
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
          <div className="text-lg font-semibold mb-2">Loading Word Guess Game...</div>
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

  const gameData = game.gameData as WordGuessGameData;
  const isPlayer1 = game.player1Id === user?.uid;
  const isPlayer2 = game.player2Id === user?.uid;
  const currentPlayerRole = isPlayer1 ? 'player1' : isPlayer2 ? 'player2' : null;

  // Initialize game data if it doesn't exist
  const word = gameData?.word || '';
  const guessedLetters = gameData?.guessedLetters || [];
  const wrongGuesses = gameData?.wrongGuesses || 0;
  const gameState = gameData?.gameState || 'playing';

  // Display word with blanks
  const displayWord = word.split('').map(letter => 
    letter === ' ' ? ' ' : guessedLetters.includes(letter) ? letter : '_'
  ).join(' ');

  return (
    <div className="p-4 space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Word Guess Game</h1>
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

      {/* Word Display */}
      <Card>
        <CardHeader>
          <CardTitle className="text-center flex items-center justify-center gap-2">
            <BookOpen className="h-5 w-5" />
            Guess the Word
            {makingMove && (
              <div className="flex items-center gap-1 text-xs text-blue-600">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                <span>Processing guess...</span>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-4xl font-mono font-bold tracking-wider mb-4">
              {displayWord}
            </div>
            <div className="text-sm text-muted-foreground">
              Wrong guesses: {wrongGuesses}/6
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Guess Input */}
      <Card>
        <CardHeader>
          <CardTitle>Make Your Guess</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={guessInput}
              onChange={(e) => setGuessInput(e.target.value.toUpperCase())}
              placeholder="Enter a letter"
              maxLength={1}
              disabled={
                game.status !== 'active' || 
                game.currentPlayer !== currentPlayerRole ||
                makingMove ||
                gameState !== 'playing'
              }
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  makeGuess();
                }
              }}
            />
            <Button 
              onClick={makeGuess}
              disabled={
                game.status !== 'active' || 
                game.currentPlayer !== currentPlayerRole ||
                makingMove ||
                !guessInput.trim() ||
                gameState !== 'playing'
              }
            >
              Guess
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Guessed Letters */}
      <Card>
        <CardHeader>
          <CardTitle>Guessed Letters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {guessedLetters.map((letter, index) => (
              <Badge key={index} variant="outline" className="text-lg px-3 py-1">
                {letter}
              </Badge>
            ))}
            {guessedLetters.length === 0 && (
              <div className="text-muted-foreground text-sm">No letters guessed yet</div>
            )}
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
            <span>Correct letter:</span>
            <span className="font-medium text-green-600">Another turn</span>
          </div>
          <div className="flex justify-between">
            <span>Wrong letter:</span>
            <span className="font-medium text-red-600">Switch turns</span>
          </div>
          <div className="flex justify-between">
            <span>6 wrong guesses:</span>
            <span className="font-medium text-red-600">Game over</span>
          </div>
          <div className="flex justify-between">
            <span>Complete the word:</span>
            <span className="font-medium text-blue-600">You win!</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
