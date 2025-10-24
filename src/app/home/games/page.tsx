'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  getDoc,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { GameInvite, GameType, GameStatus } from '@/lib/game-types';
import { Gamepad2, Clock, Users, Trophy } from 'lucide-react';

export default function GameInvitesPage() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [gameInvites, setGameInvites] = useState<GameInvite[]>([]);
  const [gameSessions, setGameSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [gameHistory, setGameHistory] = useState<any[]>([]);

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

  // Cleanup games that haven't been joined by both players within 10 minutes
  const cleanupUnjoinedGames = async () => {
    if (!firestore || !user) return;
    
    try {
      const sessionsRef = collection(firestore, 'gameSessions');
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      
      const q = query(
        sessionsRef,
        where('status', '==', 'waiting'),
        where('createdAt', '<=', Timestamp.fromDate(tenMinutesAgo))
      );
      
      const snapshot = await getDocs(q);
      const batch = writeBatch(firestore);
      
      snapshot.forEach((doc) => {
        batch.update(doc.ref, { status: 'cancelled' });
      });
      
      if (snapshot.size > 0) {
        await batch.commit();
        console.log(`Cleaned up ${snapshot.size} unjoined games`);
        
        // Also mark corresponding invites as cancelled
        for (const doc of snapshot.docs) {
          const gameData = doc.data();
          if (gameData.gameId) {
            const invitesRef = collection(firestore, 'gameInvites');
            const inviteQuery = query(invitesRef, where('gameId', '==', gameData.gameId));
            const inviteSnapshot = await getDocs(inviteQuery);
            const inviteBatch = writeBatch(firestore);
            
            inviteSnapshot.forEach((inviteDoc) => {
              inviteBatch.update(inviteDoc.ref, { status: 'cancelled' });
            });
            
            if (inviteSnapshot.size > 0) {
              await inviteBatch.commit();
            }
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up unjoined games:', error);
    }
  };

  // Fetch game history
  const fetchGameHistory = async () => {
    if (!firestore || !user) return;
    
    try {
      // Get completed game invites where user was involved
      const invitesRef = collection(firestore, 'gameInvites');
      const q = query(
        invitesRef,
        where('status', '==', 'completed'),
        where('inviterId', '==', user.uid)
      );
      
      const q2 = query(
        invitesRef,
        where('status', '==', 'completed'),
        where('inviteeId', '==', user.uid)
      );
      
      const [snapshot1, snapshot2] = await Promise.all([
        getDocs(q),
        getDocs(q2)
      ]);
      
      const history: any[] = [];
      
      // Process invites where user was the inviter
      for (const inviteDoc of snapshot1.docs) {
        const data = inviteDoc.data();
        let gameSessionData = null;
        
        // Fetch game session data if gameId exists
        if (data.gameId) {
          try {
            const gameSessionRef = doc(firestore, 'gameSessions', data.gameId);
            const gameSessionDoc = await getDoc(gameSessionRef);
            if (gameSessionDoc.exists()) {
              gameSessionData = gameSessionDoc.data();
            }
          } catch (error) {
            console.error('Error fetching game session:', error);
          }
        }
        
        history.push({
          id: inviteDoc.id,
          gameType: data.gameType,
          createdAt: data.createdAt?.toDate() || new Date(),
          completedAt: data.completedAt?.toDate(),
          inviterId: data.inviterId,
          inviteeId: data.inviteeId,
          isInviter: true,
          winner: gameSessionData?.winner,
          creditsReward: gameSessionData?.creditsReward || 0
        });
      }
      
      // Process invites where user was the invitee
      for (const inviteDoc of snapshot2.docs) {
        const data = inviteDoc.data();
        let gameSessionData = null;
        
        // Fetch game session data if gameId exists
        if (data.gameId) {
          try {
            const gameSessionRef = doc(firestore, 'gameSessions', data.gameId);
            const gameSessionDoc = await getDoc(gameSessionRef);
            if (gameSessionDoc.exists()) {
              gameSessionData = gameSessionDoc.data();
            }
          } catch (error) {
            console.error('Error fetching game session:', error);
          }
        }
        
        history.push({
          id: inviteDoc.id,
          gameType: data.gameType,
          createdAt: data.createdAt?.toDate() || new Date(),
          completedAt: data.completedAt?.toDate(),
          inviterId: data.inviterId,
          inviteeId: data.inviteeId,
          isInviter: false,
          winner: gameSessionData?.winner,
          creditsReward: gameSessionData?.creditsReward || 0
        });
      }
      
      // Sort by completion date (most recent first)
      history.sort((a, b) => (b.completedAt || b.createdAt).getTime() - (a.completedAt || a.createdAt).getTime());
      
      setGameHistory(history);
    } catch (error) {
      console.error('Error fetching game history:', error);
    }
  };

  const [selectedGameType, setSelectedGameType] = useState<GameType>('tic-tac-toe');

  // Run cleanup on component mount
  useEffect(() => {
    cleanupHangingSessions();
    cleanupExpiredInvites();
    cleanupUnjoinedGames();
    
    // Set up periodic cleanup every 5 minutes
    const cleanupInterval = setInterval(() => {
      cleanupHangingSessions();
      cleanupExpiredInvites();
      cleanupUnjoinedGames();
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
    
    // Query for invites where user is invitee
    const q1 = query(
      invitesRef,
      where('inviteeId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    
    // Query for invites where user is inviter
    const q2 = query(
      invitesRef,
      where('inviterId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe1 = onSnapshot(q1, (snapshot) => {
      const invites: GameInvite[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Filter out completed and cancelled games
        if (data.status !== 'completed' && data.status !== 'cancelled') {
          invites.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            expiresAt: data.expiresAt?.toDate() || new Date(),
          } as GameInvite);
        }
      });
      setGameInvites(prev => {
        const otherInvites = prev.filter(invite => invite.inviterId === user.uid);
        return [...otherInvites, ...invites];
      });
      setLoading(false);
    });

    const unsubscribe2 = onSnapshot(q2, (snapshot) => {
      const invites: GameInvite[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Filter out completed and cancelled games
        if (data.status !== 'completed' && data.status !== 'cancelled') {
          invites.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            expiresAt: data.expiresAt?.toDate() || new Date(),
          } as GameInvite);
        }
      });
      setGameInvites(prev => {
        const otherInvites = prev.filter(invite => invite.inviteeId === user.uid);
        return [...otherInvites, ...invites];
      });
    });

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [user, firestore]);

  // Listen to game sessions to track join status
  useEffect(() => {
    if (!user || !firestore) return;

    const sessionsRef = collection(firestore, 'gameSessions');
    const q = query(
      sessionsRef,
      where('status', 'in', ['waiting', 'active'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessions: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        sessions.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });
      setGameSessions(sessions);
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
          window.location.href = `/home/games/session?gameId=${doc.id}`;
        }
      });
    });

    const unsubscribe2 = onSnapshot(sessionsQuery2, (snapshot) => {
      snapshot.docs.forEach((doc) => {
        const gameData = doc.data();
        if (gameData.status === 'waiting' || gameData.status === 'active') {
          // Redirect to game page
          window.location.href = `/home/games/session?gameId=${doc.id}`;
        }
      });
    });

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [user, firestore]);

  // Fetch game history when modal is opened
  useEffect(() => {
    if (showHistory) {
      fetchGameHistory();
    }
  }, [showHistory]);

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
        status: 'active' as GameStatus, // Start as active since both players are present
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
        description: 'Click "Join Game" to start playing.',
      });

      // Don't automatically redirect - let users click "Join Game" button
      // window.location.href = `/home/games/session?gameId=${gameId}`;
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
        return 'cute-purple text-purple-800';
      default:
        return 'cute-blue text-blue-800';
    }
  };

  // Get join status for a game invite
  const getJoinStatus = (invite: GameInvite) => {
    if (!invite.gameId) return null;
    
    const session = gameSessions.find(s => s.id === invite.gameId);
    if (!session) return null;
    
    const hasPlayer1 = !!session.player1Id;
    const hasPlayer2 = !!session.player2Id;
    const isCurrentUserPlayer1 = session.player1Id === user?.uid;
    const isCurrentUserPlayer2 = session.player2Id === user?.uid;
    
    if (hasPlayer1 && hasPlayer2) {
      return { status: 'both-joined', message: 'Both players joined - ready to play!' };
    } else if (hasPlayer1 && !hasPlayer2) {
      return { 
        status: 'partial', 
        message: isCurrentUserPlayer1 ? 'Waiting for partner to join...' : 'Partner has joined - click Join Game!' 
      };
    } else if (!hasPlayer1 && hasPlayer2) {
      return { 
        status: 'partial', 
        message: isCurrentUserPlayer2 ? 'Waiting for partner to join...' : 'Partner has joined - click Join Game!' 
      };
    } else {
      return { status: 'none', message: 'No players joined yet' };
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
      <Card className="cute-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-semibold">
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
                    className="w-full justify-start cute-button"
                  >
                    <Gamepad2 className="mr-2 h-4 w-4" />
                    Tic-Tac-Toe
                  </Button>
                  <Button 
                    onClick={() => setSelectedGameType('memory-match')}
                    variant={selectedGameType === 'memory-match' ? 'default' : 'outline'}
                    className="w-full justify-start cute-button"
                  >
                    <Gamepad2 className="mr-2 h-4 w-4" />
                    Memory Match
                  </Button>
                  <Button 
                    onClick={() => setSelectedGameType('word-guess')}
                    variant={selectedGameType === 'word-guess' ? 'default' : 'outline'}
                    className="w-full justify-start cute-button"
                  >
                    <Gamepad2 className="mr-2 h-4 w-4" />
                    Word Guess
                  </Button>
                </div>
              </div>
              <Button 
                onClick={handleCreateInvite}
                className="w-full cute-button"
                size="lg"
              >
                <Trophy className="mr-2 h-4 w-4" />
                Send {getGameTypeDisplay(selectedGameType)} Invite
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Game History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Game History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-4">
              View your completed games and track your progress.
            </p>
            <Button 
              onClick={() => setShowHistory(true)}
              variant="outline"
              className="w-full"
            >
              <Clock className="mr-2 h-4 w-4" />
              View Game History
            </Button>
          </div>
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
                      {invite.status === 'waiting' && (
                        invite.inviterId === user?.uid 
                          ? 'Invitation sent - waiting for response'
                          : 'Waiting for your response...'
                      )}
                      {invite.status === 'active' && 'Game ready - click Join Game'}
                      {invite.status === 'completed' && 'Game completed'}
                      {invite.status === 'cancelled' && 'Game cancelled'}
                      
                      {/* Show join status if game session exists */}
                      {invite.gameId && (() => {
                        const joinStatus = getJoinStatus(invite);
                        if (joinStatus) {
                          return (
                            <div className={`mt-1 text-xs ${
                              joinStatus.status === 'both-joined' ? 'text-green-600' :
                              joinStatus.status === 'partial' ? 'text-yellow-600' :
                              'cute-text-subtle'
                            }`}>
                              {joinStatus.message}
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                  
                  {invite.status === 'waiting' && (
                    invite.inviterId === user?.uid ? (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" disabled>
                          Invitation Sent
                        </Button>
                      </div>
                    ) : (
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
                    )
                  )}
                  
                  {invite.status === 'active' && (
                    <Button 
                      size="sm"
                      onClick={() => {
                        if (invite.gameId) {
                          window.location.href = `/home/games/session?gameId=${invite.gameId}`;
                        }
                      }}
                    >
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
              <span className="font-medium cute-text-muted">+10 credits</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Game History Modal */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Game History
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {gameHistory.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-muted-foreground mb-2">No completed games yet</div>
                <div className="text-sm text-muted-foreground">
                  Start playing games to see your history here!
                </div>
              </div>
            ) : (
              gameHistory.map((game) => (
                <Card key={game.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Gamepad2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium">{getGameTypeDisplay(game.gameType)}</div>
                          <div className="text-sm text-muted-foreground">
                            {game.completedAt ? 
                              (game.completedAt instanceof Date ? 
                                game.completedAt.toLocaleDateString() + ' ' + game.completedAt.toLocaleTimeString() :
                                new Date(game.completedAt).toLocaleDateString() + ' ' + new Date(game.completedAt).toLocaleTimeString()
                              ) :
                              (game.createdAt instanceof Date ?
                                game.createdAt.toLocaleDateString() + ' ' + game.createdAt.toLocaleTimeString() :
                                new Date(game.createdAt).toLocaleDateString() + ' ' + new Date(game.createdAt).toLocaleTimeString()
                              )
                            }
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="mb-1">
                          {game.isInviter ? 'You invited' : 'You were invited'}
                        </Badge>
                        <div className="text-sm text-muted-foreground mb-1">
                          {game.isInviter ? 'vs Partner' : 'vs Partner'}
                        </div>
                        {game.winner && (
                          <div className="text-sm font-medium">
                            {game.winner === 'draw' ? (
                              <span className="text-orange-600">🤝 Draw</span>
                            ) : (
                              <span className={game.winner === (game.isInviter ? 'player1' : 'player2') ? 'text-green-600' : 'text-red-600'}>
                                {game.winner === (game.isInviter ? 'player1' : 'player2') ? '🏆 You Won' : '😔 You Lost'}
                              </span>
                            )}
                          </div>
                        )}
                        {game.creditsReward > 0 && (
                          <div className="text-xs text-blue-600 font-medium">
                            +{game.creditsReward} credits
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
