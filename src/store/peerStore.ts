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
  | { type: 'GIVE_CLUE'; clue: string; count: number }
  | { type: 'REVEAL_CARD'; index: number }
  | { type: 'SET_MARK'; index: number; team: TeamId; remove: boolean }
  | { type: 'END_TURN' }
  | { type: 'END_GAME'; winner: string }
  | { type: 'RESET_LOBBY' };

interface PeerState {
  peer: Peer | null;
  connections: DataConnection[]; // For Host
  hostConn: DataConnection | null; // For Guest
  
  initializeHost: (roomName: string, password?: string) => Promise<string>;
  joinRoom: (roomName: string, playerName: string, password?: string) => Promise<{ success: boolean; reason?: string }>;
  disconnect: () => void;
  broadcastAction: (action: GameAction) => void;
  sendActionToHost: (action: GameAction) => void;
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
          
          // Reconnection logic: if name is taken, kick the old ghost instead of rejecting
          const existingPlayerIndex = gameStore.players.findIndex(p => p.name.toLowerCase() === action.player.name.toLowerCase());
          if (existingPlayerIndex !== -1) {
            const ghost = gameStore.players[existingPlayerIndex];
            const ghostConn = get().connections.find(c => c.peer === ghost.id);
            if (ghostConn) ghostConn.close(); // Clean up old connection
            
            // Remove the ghost player gracefully
            gameStore.updatePlayers(gameStore.players.filter(p => p.id !== ghost.id));
          }
          
          let newPlayer = { ...action.player };
          
          if (gameStore.mpStatus !== 'lobby') {
            // Force mid-game joiners to be spectators
            newPlayer.team = 'neutral';
            newPlayer.role = 'spectator';
          }
          
          // Accept and add player
          const newPlayers = [...gameStore.players, newPlayer];
          gameStore.updatePlayers(newPlayers);
          
          // Send full state to the new guest
          conn.send({ 
            type: 'JOIN_ACCEPTED', 
            state: { 
              players: newPlayers, 
              settings: { theme: gameStore.theme, numTeams: gameStore.numTeams, totalCards: gameStore.totalCards, assassinCount: gameStore.assassinCount, firstTeam: gameStore.firstTeam },
              cards: gameStore.cards,
              turnPhase: gameStore.turnPhase,
              currentTurn: gameStore.currentTurn,
              clue: gameStore.clue,
              guessesLeft: gameStore.guessesLeft,
              remaining: gameStore.remaining,
              winner: gameStore.winner,
              mpStatus: gameStore.mpStatus
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
        }
        break;

      case 'GIVE_CLUE':
        gameStore.giveClue(action.clue, action.count);
        if (isHost) get().broadcastAction(action);
        else get().sendActionToHost(action);
        break;

      case 'REVEAL_CARD':
        gameStore.revealCard(action.index);
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
              winner: newState.winner
            } 
          });
        }
        else get().sendActionToHost(action);
        break;

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
        if (isHost) get().broadcastAction(action);
        else get().sendActionToHost(action);
        break;

      case 'END_GAME':
        gameStore.endGame(action.winner as any);
        if (isHost) get().broadcastAction(action);
        else get().sendActionToHost(action);
        break;

      case 'RESET_LOBBY':
        if (!isHost) {
          gameStore.resetToLobby();
        }
        break;
    }
  };

  return {
    peer: null,
    connections: [],
    hostConn: null,

    initializeHost: async (roomName: string, password?: string) => {
      const { Peer } = await import('peerjs');
      expectedPassword = password || '';
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
                 status: gs.mpStatus === 'playing' ? 'playing' : 'lobby'
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

      return new Promise((resolve) => {
        const peer = new Peer();
        
        peer.on('open', (id) => {
          set({ peer });
          const conn = peer.connect(hostId);

          conn.on('open', () => {
            set({ hostConn: conn });
            
            // Send JOIN action with player details
            const myPlayer: Player = { id, name: playerName, team: 'blue', role: 'operative', isHost: false };
            useGameStore.getState().joinLobby(roomName, false, id);
            
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

    disconnect: () => {
      const { peer, connections, hostConn } = get();
      const roomName = useGameStore.getState().roomName;
      
      connections.forEach(c => c.close());
      if (hostConn) hostConn.close();
      if (peer) peer.destroy();
      
      if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
      }

      if (useGameStore.getState().isHost && roomName) {
        fetch(`/api/rooms?name=${roomName}`, { method: 'DELETE', keepalive: true }).catch(() => {});
      }
      
      if (peer && (peer as any)._customUnloadHandler) {
        window.removeEventListener('beforeunload', (peer as any)._customUnloadHandler);
      }
      
      set({ peer: null, connections: [], hostConn: null });
      useGameStore.getState().disconnect();
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
    }
  };
});
