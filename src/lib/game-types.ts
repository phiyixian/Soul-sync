// Game types and interfaces
export type GameType = 'tic-tac-toe' | 'memory-match' | 'word-guess';

export type GameStatus = 'waiting' | 'active' | 'completed' | 'cancelled';

export type PlayerRole = 'player1' | 'player2';

export interface GameInvite {
  id: string;
  gameType: GameType;
  inviterId: string;
  inviteeId: string;
  status: GameStatus;
  createdAt: Date;
  expiresAt: Date;
  gameId?: string; // Set when game starts
}

export interface GameSession {
  id: string;
  gameType: GameType;
  player1Id: string;
  player2Id: string;
  status: GameStatus;
  currentPlayer: PlayerRole;
  gameData: any; // Game-specific data
  winner?: PlayerRole;
  creditsReward: number;
  createdAt: Date;
  completedAt?: Date;
}

export interface MemoryGameData {
  cards: MemoryCard[];
  flippedCards: number[];
  moves: number;
  matches: number;
  currentPlayer: PlayerRole;
  playerStats: {
    player1: { moves: number; matches: number };
    player2: { moves: number; matches: number };
  };
}

export interface MemoryCard {
  id: number;
  value: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export interface TicTacToeGameData {
  board: (string | null)[];
  moves: Array<{player: PlayerRole, position: number, timestamp: Date}>;
  playerStats: {
    player1: { moves: number; wins: number };
    player2: { moves: number; wins: number };
  };
}

export interface WordGuessGameData {
  word: string;
  guessedLetters: string[];
  wrongGuesses: number;
  currentPlayer: PlayerRole;
  gameState: 'playing' | 'won' | 'lost';
  playerStats: {
    player1: { guesses: number; wins: number };
    player2: { guesses: number; wins: number };
  };
}

export interface GameMove {
  playerId: string;
  move: any; // Game-specific move data
  timestamp: Date;
}

// Game constants
export const GAME_CONFIG = {
  INVITE_EXPIRY_MINUTES: 5,
  CREDITS_REWARD: {
    WIN: 50,
    DRAW: 25,
    PARTICIPATION: 10
  },
  BOARD_SIZE: 9 // 3x3 for tic-tac-toe
} as const;
