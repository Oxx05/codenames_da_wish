import { create } from 'zustand';
import { Player, TeamId, useGameStore } from './gameStore';
import type Peer from 'peerjs';
import type { DataConnection } from 'peerjs';

export const ROOM_PREFIX = 'codenames-v2-';

type GameAction = 
  | { type: 'JOIN'; player: Player; password?: string }
  | { type: 'JOIN_REJECTED'; reason: string }
  | { type: 'JOIN_ACCEPTED'; state: any }
  | { type: 'SYNC_STATE'; state: any }
  | { type: 'UPDATE_PLAYER'; player: Player }
  | { type: 'UPDATE_SETTINGS'; settings: any }
  | { type: 'START_GAME'; cards: any[]; firstTurn: any }
  | { type: 'GIVE_CLUE'; clue: string; count: number; playerName?: string; playerTeam?: TeamId }
  | { type: 'REVEAL_CARD'; index: number; playerName?: string; playerTeam?: TeamId }
  | { type: 'SET_MARK'; index: number; team: TeamId; remove: boolean }
  | { type: 'END_TURN'; playerName?: string; playerTeam?: TeamId }
  | { type: 'END_GAME'; winner: string }
  | { type: 'RESET_LOBBY' }
  | { type: 'KICK' }
  | { type: 'TRANSFER_HOST'; newHostName: string }
  | { type: 'CHAT_MESSAGE'; msg: any };

interface PeerState {
  peer: Peer | null;
  connections: DataConnection[]; // For Host
  hostConn: DataConnection | null; // For Guest
  roomPassword: string; // Visible to host for sharing
  
  initializeHost: (roomName: string, password?: string) => Promise<string>;
  joinRoom: (roomName: string, playerName: string, password?: string) => Promise<{ success: boolean; reason?: string }>;
  disconnect: (options?: { skipTransferHost?: boolean; keepGameState?: boolean }) => void;
  broadcastAction: (action: GameAction) => void;
  sendActionToHost: (action: GameAction) => void;
  kickPlayer: (peerId: string) => void;
  transferHost: (newHostName: string, isLeaving: boolean) => void;
}

export const usePeerStore = create<PeerState>((set, get) => {
  let expectedPassword = '';
  let pingInterval: NodeJS.Timeout | null = null;

  const handleIncomingAction = (action: GameAction, conn?: DataConnection) => {
    const gameStore = useGameStore.getState();
    const isHost = gameStore.isHost;

    switch (action.type) {
      case 'JOIN':
        if (isHost && conn) {
          if (expectedPassword && action.password !== expectedPassword) {
            conn.send({ type: 'JOIN_REJECTED', reason: 'Invalid password' });
            setTimeout(() => conn.close(), 500);
            return;
          }
          
          let newPlayers = gameStore.players;
          let newPlayer = { ...action.player };
          const existingPlayerIndex = gameStore.players.findIndex(p => p.name.toLowerCase() === action.player.name.toLowerCase());

          if (existingPlayerIndex !== -1) {
            const ghost = gameStore.players[existingPlayerIndex];
            const ghostConn = get().connections.find(c => c.peer === ghost.id);
            if (ghostConn) ghostConn.close(); // Clean up old connection
            
            // Inherit old state
            newPlayer.team = ghost.team;
            newPlayer.role = ghost.role;
            
            // Remove the ghost player from the list before appending the new one
            newPlayers = newPlayers.filter(p => p.id !== ghost.id);
          } else {
            if (gameStore.mpStatus !== 'lobby') {
              // Force mid-game joiners to be spectators
              newPlayer.team = 'neutral';
              newPlayer.role = 'spectator';
            } else {
              // Balance teams dynamically
              const activeTeams = ['red', 'blue', 'green', 'yellow'].slice(0, gameStore.numTeams) as TeamId[];
              const teamCounts = activeTeams.map(t => ({ team: t, count: gameStore.players.filter(p => p.team === t).length }));
              teamCounts.sort((a, b) => a.count - b.count);
              const targetTeam = teamCounts[0].team;
              
              const hasSpymaster = gameStore.players.some(p => p.team === targetTeam && p.role === 'spymaster');
              newPlayer.team = targetTeam;
              newPlayer.role = hasSpymaster ? 'operative' : 'spymaster';
            }
          }
          
          // Accept and add player
          newPlayers = [...newPlayers, newPlayer];
          gameStore.updatePlayers(newPlayers);
          
          // Send full state to the new guest
          conn.send({ 
            type: 'JOIN_ACCEPTED', 
            state: { 
              players: newPlayers, 
              settings: { theme: gameStore.theme, numTeams: gameStore.numTeams, totalCards: gameStore.totalCards, assassinCount: gameStore.assassinCount, firstTeam: gameStore.firstTeam, cardsPerTeam: gameStore.cardsPerTeam, neutralEndsTurn: gameStore.neutralEndsTurn, opponentEndsTurn: gameStore.opponentEndsTurn, assassinEndsGame: gameStore.assassinEndsGame, turnTimer: gameStore.turnTimer },
              cards: gameStore.cards,
              turnPhase: gameStore.turnPhase,
              currentTurn: gameStore.currentTurn,
              clue: gameStore.clue,
              guessesLeft: gameStore.guessesLeft,
              remaining: gameStore.remaining,
              eliminatedTeams: gameStore.eliminatedTeams,
              winner: gameStore.winner,
              mpStatus: gameStore.mpStatus,
              gameLog: gameStore.gameLog
            }
          });
          
          // Broadcast new player list to everyone else
          get().broadcastAction({ type: 'SYNC_STATE', state: { players: newPlayers } });
        }
        break;

      case 'JOIN_ACCEPTED':
        if (!isHost) {
          gameStore.applyFullState(action.state);
        }
        break;

      case 'JOIN_REJECTED':
        // Handled in joinRoom promise resolve; no alert needed
        break;

      case 'SYNC_STATE':
        if (!isHost) {
          gameStore.applyFullState(action.state);
        }
        break;

      case 'UPDATE_PLAYER':
        if (isHost) {
          const newPlayers = gameStore.players.map(p => p.id === action.player.id ? action.player : p);
          gameStore.updatePlayers(newPlayers);
          get().broadcastAction({ type: 'SYNC_STATE', state: { players: newPlayers } });
        } else {
          // Guest updating own player sends to host
          get().sendActionToHost(action);
        }
        break;

      case 'START_GAME':
        if (!isHost) {
          gameStore.startGame(action.cards, action.firstTurn);
        }
        break;

      case 'UPDATE_SETTINGS':
        if (!isHost) {
          gameStore.updateSettings(action.settings);
        } else {
          gameStore.updateSettings(action.settings);
          get().broadcastAction(action);
          // Also sync global rules that might have changed
          get().broadcastAction({ type: 'SYNC_STATE', state: { 
            neutralEndsTurn: gameStore.neutralEndsTurn, 
            opponentEndsTurn: gameStore.opponentEndsTurn, 
            assassinEndsGame: gameStore.assassinEndsGame 
          }});
        }
        break;

      case 'GIVE_CLUE':
        gameStore.giveClue(action.clue, action.count);
        if (action.playerName) {
          useGameStore.getState().addGameLogEntry({ type: 'clue', playerName: action.playerName, team: action.playerTeam!, word: action.clue, count: action.count });
        }
        if (isHost) {
          const s = useGameStore.getState();
          get().broadcastAction({ type: 'SYNC_STATE', state: { turnPhase: s.turnPhase, clue: s.clue, guessesLeft: s.guessesLeft, turnEndTime: s.turnEndTime, gameLog: s.gameLog } });
        }
        break;

      case 'REVEAL_CARD': {
        const cardBefore = gameStore.cards[action.index];
        gameStore.revealCard(action.index);
        if (action.playerName && cardBefore) {
          useGameStore.getState().addGameLogEntry({ type: 'reveal', playerName: action.playerName, team: action.playerTeam!, cardName: cardBefore.name, cardRole: cardBefore.role });
        }
        if (isHost) {
          const newState = useGameStore.getState();
          get().broadcastAction({
            type: 'SYNC_STATE',
            state: {
              cards: newState.cards,
              remaining: newState.remaining,
              turnPhase: newState.turnPhase,
              currentTurn: newState.currentTurn,
              guessesLeft: newState.guessesLeft,
              eliminatedTeams: newState.eliminatedTeams,
              winner: newState.winner,
              turnEndTime: newState.turnEndTime,
              gameLog: newState.gameLog
            }
          });
        }
        else get().sendActionToHost(action);
        break;
      }

      case 'SET_MARK':
        if (isHost) {
          gameStore.toggleMarkCard(action.index, action.team, action.remove);
          get().broadcastAction(action);
        } else {
          gameStore.toggleMarkCard(action.index, action.team, action.remove);
        }
        break;

      case 'END_TURN':
        gameStore.endTurn();
        if (action.playerName) {
          useGameStore.getState().addGameLogEntry({ type: 'pass', playerName: action.playerName, team: action.playerTeam! });
        }
        if (isHost) {
          const s = useGameStore.getState();
          get().broadcastAction({ type: 'SYNC_STATE', state: { turnPhase: s.turnPhase, currentTurn: s.currentTurn, eliminatedTeams: s.eliminatedTeams, guessesLeft: s.guessesLeft, clue: s.clue, turnEndTime: s.turnEndTime, gameLog: s.gameLog } });
        }
        break;

      case 'END_GAME':
        gameStore.endGame(action.winner as any);
        if (isHost) {
          get().broadcastAction({ type: 'SYNC_STATE', state: { winner: action.winner } });
        }
        break;

      case 'RESET_LOBBY':
        if (!isHost) {
          gameStore.resetLobby();
        }
        break;

      case 'CHAT_MESSAGE':
        gameStore.addChatMessage(action.msg);
        if (isHost) {
          get().broadcastAction(action);
        }
        break;

      case 'KICK':
        if (!isHost) {
          alert("You have been kicked from the room.");
          get().disconnect({ skipTransferHost: true });
        }
        break;

      case 'TRANSFER_HOST': {
        const myName = gameStore.players.find(p => p.id === gameStore.myPlayerId)?.name;
        const currentRoomName = gameStore.roomName;
        const currentPassword = expectedPassword;
        const currentState = { ...gameStore }; // Capture prior to disconnecting

        if (myName === action.newHostName) {
          // I am the new host
          // Wait briefly, reset connection, and initialize as host
          useGameStore.getState().applyFullState({ mpStatus: 'connecting', loadingMessage: 'Initializing as new Host...' });
          get().disconnect({ skipTransferHost: true, keepGameState: true });
          
          setTimeout(() => {
            get().initializeHost(currentRoomName!, currentPassword).then(id => {
              // Restore state and mark as host
              useGameStore.getState().applyFullState({
                ...currentState,
                isHost: true,
                mpStatus: currentState.mpStatus,
                myPlayerId: id,
                players: currentState.players.map(p => p.name === myName ? { ...p, id, isHost: true } : p).filter(p => p.name === myName)
              });
            });
          }, 1500);

        } else {
          // I am a regular guest — wait for new host to spin up, then rejoin
          if (!isHost) {
            useGameStore.getState().applyFullState({ mpStatus: 'connecting', loadingMessage: 'Reconnecting to new Host...' });
            get().disconnect({ skipTransferHost: true, keepGameState: true });
            setTimeout(() => {
              get().joinRoom(currentRoomName!, myName!, currentPassword).then(res => {
                if (!res.success) {
                  useGameStore.getState().disconnect();
                  alert("Failed to reconnect to the new host. Please refresh.");
                }
              });
            }, 3000);
          }
        }
        break;
      }
    }
  };

  return {
    peer: null,
    connections: [],
    hostConn: null,
    roomPassword: '',

    initializeHost: async (roomName: string, password?: string) => {
      const { Peer } = await import('peerjs');
      expectedPassword = password || '';
      set({ roomPassword: password || '' });
      const peerId = ROOM_PREFIX + roomName;

      return new Promise((resolve, reject) => {
        const peer = new Peer(peerId);
        
        peer.on('open', (id) => {
          set({ peer, connections: [] });
          resolve(id);

          // Start pinging discovery API
          const pingDiscoveryAPI = () => {
             const gs = useGameStore.getState();
             fetch('/api/rooms', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                 name: roomName,
                 hostId: id,
                 players: gs.players.length || 1,
                 status: gs.mpStatus === 'playing' ? 'playing' : 'lobby',
                 hasPassword: !!(password)
               })
             }).catch(() => {});
          };
          
          pingDiscoveryAPI();
          pingInterval = setInterval(pingDiscoveryAPI, 10000); // Ping every 10s

          // Handle ungraceful exits (closing tab/refreshing mid-host)
          const handleUnload = () => {
            fetch(`/api/rooms?name=${roomName}`, { method: 'DELETE', keepalive: true }).catch(() => {});
          };
          window.addEventListener('beforeunload', handleUnload);
          
          // Cleanup listener on disconnect
          (peer as any)._customUnloadHandler = handleUnload;
        });

        peer.on('connection', (conn) => {
          conn.on('data', (data: any) => {
            handleIncomingAction(data as GameAction, conn);
          });

          conn.on('open', () => {
            set(state => ({ connections: [...state.connections, conn] }));
          });

          conn.on('close', () => {
            set(state => ({ connections: state.connections.filter(c => c !== conn) }));
            // Remove player from lobby/game using their conn peer ID
            const gs = useGameStore.getState();
            // As the host, when someone disconnects, we should remove them.
            // conn.peer is the peer ID of the guest
            const newPlayers = gs.players.filter(p => p.id !== conn.peer);
            gs.updatePlayers(newPlayers);
            // Broadcast new state so everyone else drops them
            get().broadcastAction({ type: 'SYNC_STATE', state: { players: newPlayers } });
          });
        });

        peer.on('error', (err: any) => {
          console.error('PeerJS Host Error:', err);
          let reason = 'Failed to create room';
          if (err.type === 'unavailable-id') reason = 'Room name already in use. Try another name or wait 30 seconds.';
          reject(new Error(reason));
        });
      });
    },

    joinRoom: async (roomName: string, playerName: string, password?: string): Promise<{ success: boolean; reason?: string }> => {
      const { Peer } = await import('peerjs');
      const hostId = ROOM_PREFIX + roomName;
      expectedPassword = password || '';

      return new Promise((resolve) => {
        const peer = new Peer();
        
        peer.on('open', (id) => {
          set({ peer });
          const conn = peer.connect(hostId);

          conn.on('open', () => {
            set({ hostConn: conn });
            
            // Send JOIN action with player details
            const myPlayer: Player = { id, name: playerName, team: 'blue', role: 'operative', isHost: false };
            useGameStore.getState().setRoomDetails(roomName, false, id);
            
            conn.send({ type: 'JOIN', player: myPlayer, password });
            // Don't resolve here — wait for JOIN_ACCEPTED or JOIN_REJECTED
          });

          conn.on('data', (data: any) => {
            const action = data as GameAction;
            if (action.type === 'JOIN_REJECTED') {
              resolve({ success: false, reason: action.reason });
              get().disconnect();
              return;
            }
            if (action.type === 'JOIN_ACCEPTED') {
              resolve({ success: true });
            }
            handleIncomingAction(action, conn);
          });

          conn.on('close', () => {
            get().disconnect();
          });

          conn.on('error', (err) => {
            console.error('Connection error:', err);
            resolve({ success: false, reason: 'Connection error' });
          });
        });

        peer.on('error', (err: any) => {
          console.error('PeerJS Guest Error:', err);
          resolve({ success: false, reason: err.type === 'peer-unavailable' ? 'Room not found' : 'Failed to connect' });
        });
      });
    },

    disconnect: (options = {}) => {
      const { peer, connections, hostConn } = get();
      const gs = useGameStore.getState();
      
      // Auto-transfer host on leave
      if (gs.isHost && gs.players.length > 1 && !options.skipTransferHost) {
        const otherPlayer = gs.players.find(p => p.id !== gs.myPlayerId);
        if (otherPlayer) {
          get().transferHost(otherPlayer.name, true);
          return; // transferHost handles the actual tear down
        }
      }

      const roomName = gs.roomName;
      
      connections.forEach(c => c.close());
      if (hostConn) hostConn.close();
      if (peer) peer.destroy();
      
      if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
      }

      if (!options.keepGameState && useGameStore.getState().isHost && roomName) {
        fetch(`/api/rooms?name=${roomName}`, { method: 'DELETE', keepalive: true }).catch(() => {});
      }
      
      if (peer && (peer as any)._customUnloadHandler) {
        window.removeEventListener('beforeunload', (peer as any)._customUnloadHandler);
      }
      
      set({ peer: null, connections: [], hostConn: null, roomPassword: '' });
      if (!options.keepGameState) {
        useGameStore.getState().disconnect();
      }
    },

    broadcastAction: (action: GameAction) => {
      const { connections } = get();
      connections.forEach(conn => {
        if (conn.open) {
          conn.send(action);
        }
      });
    },

    sendActionToHost: (action: GameAction) => {
      const { hostConn } = get();
      if (hostConn && hostConn.open) {
        hostConn.send(action);
      }
    },

    kickPlayer: (peerId: string) => {
      const { connections, broadcastAction } = get();
      const gs = useGameStore.getState();
      if (!gs.isHost) return;

      const conn = connections.find(c => c.peer === peerId);
      if (conn) {
        // Send specific kick action to that one connection
        conn.send({ type: 'KICK' });
        // Close it shortly after
        setTimeout(() => conn.close(), 500);
      }
    },

    transferHost: (newHostName: string, isLeaving: boolean) => {
      const { broadcastAction, disconnect } = get();
      const gs = useGameStore.getState();
      if (!gs.isHost) return;

      // Broadcast the transfer action to everyone
      broadcastAction({ type: 'TRANSFER_HOST', newHostName });

      // If leaving completely, just disconnect without trying to rejoin
      if (isLeaving) {
        setTimeout(() => disconnect({ skipTransferHost: true }), 500);
      } else {
        // The old host becomes a guest
        const myName = gs.players.find(p => p.id === gs.myPlayerId)?.name;
        const currentRoomName = gs.roomName;
        const currentPassword = expectedPassword;
        
        useGameStore.getState().applyFullState({ mpStatus: 'connecting', loadingMessage: 'Passing the Crown...' });
        setTimeout(() => {
          disconnect({ skipTransferHost: true, keepGameState: true });
          
          setTimeout(() => {
            get().joinRoom(currentRoomName!, myName!, currentPassword).then(res => {
               if (!res.success) {
                 useGameStore.getState().disconnect();
                 alert("Failed to rejoin as guest");
               }
            });
          }, 3000);
        }, 500);
      }
    }
  };
});
