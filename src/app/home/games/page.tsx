'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useFirebase, useUser, useDoc as useFirestoreDoc } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  updateDoc, 
  doc,
  serverTimestamp,
  deleteDoc,
  setDoc,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { GameInvite, GameType, GameStatus } from '@/lib/game-types';
import { Gamepad2, Clock, Users, Trophy } from 'lucide-react';

export default function GameInvitesPage() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [gameInvites, setGameInvites] = useState<GameInvite[]>([]);
  const [loading, setLoading] = useState(true);

  // Cleanup hanging game sessions (older than 1 hour)
  const cleanupHangingSessions = async () => {
    if (!firestore || !user) return;
    
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const hangingSessionsQuery = query(
        collection(firestore, 'gameSessions'),
        where('status', 'in', ['waiting', 'active']),
        where('createdAt', '<', Timestamp.fromDate(oneHourAgo))
      );
      
      const snapshot = await getDocs(hangingSessionsQuery);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      if (snapshot.docs.length > 0) {
        console.log(`Cleaned up ${snapshot.docs.length} hanging game sessions`);
      }
    } catch (error) {
      console.error('Error cleaning up hanging sessions:', error);
    }
  };

  // Cleanup expired game invites
  const cleanupExpiredInvites = async () => {
    if (!firestore || !user) return;
    
    try {
      const now = new Date();
      const expiredInvitesQuery = query(
        collection(firestore, 'gameInvites'),
        where('status', '==', 'waiting'),
        where('expiresAt', '<', Timestamp.fromDate(now))
      );
      
      const snapshot = await getDocs(expiredInvitesQuery);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      if (snapshot.docs.length > 0) {
        console.log(`Cleaned up ${snapshot.docs.length} expired game invites`);
      }
    } catch (error) {
      console.error('Error cleaning up expired invites:', error);
    }
  };
  const [selectedGameType, setSelectedGameType] = useState<GameType>('tic-tac-toe');

  // Run cleanup on component mount
  useEffect(() => {
    cleanupHangingSessions();
    cleanupExpiredInvites();
    
    // Set up periodic cleanup every 5 minutes
    const cleanupInterval = setInterval(() => {
      cleanupHangingSessions();
      cleanupExpiredInvites();
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(cleanupInterval);
  }, [firestore, user]);

  // Get user account to find partner
  const userAccountRef = useMemoFirebase(
    () => (user ? doc(firestore, 'userAccounts', user.uid) : null),
    [user, firestore]
  );
  const { data: userAccount } = useFirestoreDoc(userAccountRef);
  const partnerId = userAccount?.partnerAccountId;

  // Listen to game invites
  useEffect(() => {
    if (!user || !firestore) return;

    const invitesRef = collection(firestore, 'gameInvites');
    const q = query(
      invitesRef,
      where('inviteeId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const invites: GameInvite[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        invites.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          expiresAt: data.expiresAt?.toDate() || new Date(),
        } as GameInvite);
      });
      setGameInvites(invites);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, firestore]);

  // Listen for active game sessions where user is a player
  useEffect(() => {
    if (!user || !firestore) return;

    const sessionsQuery = query(
      collection(firestore, 'gameSessions'),
      where('player1Id', '==', user.uid)
    );

    const sessionsQuery2 = query(
      collection(firestore, 'gameSessions'),
      where('player2Id', '==', user.uid)
    );

    const unsubscribe1 = onSnapshot(sessionsQuery, (snapshot) => {
      snapshot.docs.forEach((doc) => {
        const gameData = doc.data();
        if (gameData.status === 'waiting' || gameData.status === 'active') {
          // Redirect to game page
          window.location.href = `/home/games/${doc.id}`;
        }
      });
    });

    const unsubscribe2 = onSnapshot(sessionsQuery2, (snapshot) => {
      snapshot.docs.forEach((doc) => {
        const gameData = doc.data();
        if (gameData.status === 'waiting' || gameData.status === 'active') {
          // Redirect to game page
          window.location.href = `/home/games/${doc.id}`;
        }
      });
    });

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [user, firestore]);

  const sendGameInvite = async (gameType: GameType) => {
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please log in to send game invites.',
      });
      return;
    }

    if (!partnerId) {
      toast({
        variant: 'destructive',
        title: 'No Partner',
        description: 'You need to be linked with a partner to play games.',
      });
      return;
    }

    try {
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 5); // 5 minutes expiry

      await addDoc(collection(firestore, 'gameInvites'), {
        gameType,
        inviterId: user.uid,
        inviteeId: partnerId,
        status: 'waiting' as GameStatus,
        createdAt: serverTimestamp(),
        expiresAt: expiresAt,
      });

      toast({
        title: 'Game Invite Sent!',
        description: `Invited your partner to play ${gameType}!`,
      });
    } catch (error) {
      console.error('Error sending game invite:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to send invite',
        description: 'Please try again.',
      });
    }
  };

  const acceptInvite = async (inviteId: string) => {
    if (!user || !firestore) return;

    try {
      const gameId = `game_${Date.now()}`;
      
      // Update invite status and create game session
      await updateDoc(doc(firestore, 'gameInvites', inviteId), {
        status: 'active' as GameStatus,
        gameId: gameId,
      });

      // Create game session document
      await setDoc(doc(firestore, 'gameSessions', gameId), {
        gameId: gameId,
        gameType: gameInvites.find(invite => invite.id === inviteId)?.gameType || 'tic-tac-toe',
        status: 'waiting' as GameStatus,
        player1Id: gameInvites.find(invite => invite.id === inviteId)?.inviterId,
        player2Id: user.uid,
        currentPlayer: 'player1' as PlayerRole, // Inviter goes first
        createdAt: serverTimestamp(),
        gameData: {
          board: Array(9).fill(null),
          moves: []
        },
        winner: null,
        creditsReward: 10 // Both players get 10 credits for playing
      });

      toast({
        title: 'Game Accepted!',
        description: 'Starting the game...',
      });

      // Navigate to game page
      window.location.href = `/home/games/${gameId}`;
    } catch (error) {
      console.error('Error accepting invite:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to accept invite',
        description: 'Please try again.',
      });
    }
  };

  const declineInvite = async (inviteId: string) => {
    if (!user || !firestore) return;

    try {
      await updateDoc(doc(firestore, 'gameInvites', inviteId), {
        status: 'cancelled' as GameStatus,
      });

      toast({
        title: 'Invite Declined',
        description: 'Game invite has been declined.',
      });
    } catch (error) {
      console.error('Error declining invite:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to decline invite',
        description: 'Please try again.',
      });
    }
  };

  const handleCreateInvite = async () => {
    await sendGameInvite(selectedGameType);
  };

  const getGameTypeDisplay = (gameType: GameType) => {
    switch (gameType) {
      case 'tic-tac-toe':
        return 'Tic-Tac-Toe';
      case 'memory-match':
        return 'Memory Match';
      case 'word-guess':
        return 'Word Guess';
      default:
        return gameType;
    }
  };

  const getStatusColor = (status: GameStatus) => {
    switch (status) {
      case 'waiting':
        return 'bg-yellow-100 text-yellow-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="text-center py-8">
          <div className="text-muted-foreground">Loading game invites...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Gamepad2 className="h-6 w-6" />
          Mini Games
        </h1>
        <p className="text-muted-foreground">
          Play games with your partner and earn credits together!
        </p>
      </header>

      {/* Send Game Invites */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Send Game Invite
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!partnerId ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-2">
                You need to be linked with a partner to play games.
              </p>
              <Button asChild>
                <a href="/home/profile">Link Partner</a>
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Choose Game Type:</label>
                <div className="grid grid-cols-1 gap-2">
                  <Button 
                    onClick={() => setSelectedGameType('tic-tac-toe')}
                    variant={selectedGameType === 'tic-tac-toe' ? 'default' : 'outline'}
                    className="w-full justify-start"
                  >
                    <Gamepad2 className="mr-2 h-4 w-4" />
                    Tic-Tac-Toe
                  </Button>
                  <Button 
                    onClick={() => setSelectedGameType('memory-match')}
                    variant={selectedGameType === 'memory-match' ? 'default' : 'outline'}
                    className="w-full justify-start"
                  >
                    <Gamepad2 className="mr-2 h-4 w-4" />
                    Memory Match
                  </Button>
                  <Button 
                    onClick={() => setSelectedGameType('word-guess')}
                    variant={selectedGameType === 'word-guess' ? 'default' : 'outline'}
                    className="w-full justify-start"
                  >
                    <Gamepad2 className="mr-2 h-4 w-4" />
                    Word Guess
                  </Button>
                </div>
              </div>
              <Button 
                onClick={handleCreateInvite}
                className="w-full"
                size="lg"
              >
                <Trophy className="mr-2 h-4 w-4" />
                Send {getGameTypeDisplay(selectedGameType)} Invite
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Game Invites */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Game Invites
          </CardTitle>
        </CardHeader>
        <CardContent>
          {gameInvites.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No game invites yet
            </div>
          ) : (
            <div className="space-y-3">
              {gameInvites.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{getGameTypeDisplay(invite.gameType)}</span>
                      <Badge className={getStatusColor(invite.status)}>
                        {invite.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {invite.status === 'waiting' && 'Waiting for your response...'}
                      {invite.status === 'active' && 'Game in progress'}
                      {invite.status === 'completed' && 'Game completed'}
                      {invite.status === 'cancelled' && 'Game cancelled'}
                    </div>
                  </div>
                  
                  {invite.status === 'waiting' && (
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => acceptInvite(invite.id)}
                      >
                        Accept
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => declineInvite(invite.id)}
                      >
                        Decline
                      </Button>
                    </div>
                  )}
                  
                  {invite.status === 'active' && (
                    <Button size="sm">
                      Join Game
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Credits Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Credits Rewards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Win a game:</span>
              <span className="font-medium text-green-600">+50 credits</span>
            </div>
            <div className="flex justify-between">
              <span>Draw/Tie:</span>
              <span className="font-medium text-blue-600">+25 credits</span>
            </div>
            <div className="flex justify-between">
              <span>Participation:</span>
              <span className="font-medium text-gray-600">+10 credits</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
