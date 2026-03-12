"use client";

import { useState, useEffect } from "react";
import { useGameStore } from "@/store/gameStore";
import { usePeerStore } from "@/store/peerStore";
import { Gamepad2, AlertCircle, Play, LogIn, PlusCircle, Users, RefreshCw, WifiOff } from "lucide-react";
import LobbyScreen from "@/components/LobbyScreen";
import GameBoard from "@/components/GameBoard";
import OfflineSetup from "@/components/OfflineSetup";
import OfflineBoard from "@/components/OfflineBoard";

export default function App() {
  const mpStatus = useGameStore(s => s.mpStatus);
  const disconnect = usePeerStore(s => s.disconnect);
  const isHost = useGameStore(s => s.isHost);
  const playersCount = useGameStore(s => s.players.length);
  const loadingMessage = useGameStore(s => s.loadingMessage);
  const roomName = useGameStore(s => s.roomName);

  const [showOfflineSetup, setShowOfflineSetup] = useState(false);

  // Mobile Back-Button Trap
  useEffect(() => {
    // Only trap history if we are actively connected to a room
    if (mpStatus === 'disconnected' && !showOfflineSetup) return;

    // Push a dummy state so there is something to "pop" when the user hits back
    window.history.pushState({ page: 'room' }, '', '');

    const handlePopState = (e: PopStateEvent) => {
      // The browser just popped our dummy state. We are still on the page, but the history pointer moved back.
      if (showOfflineSetup) {
        setShowOfflineSetup(false);
        return;
      }

      if (mpStatus === 'playing' && roomName === 'offline') {
        const confirmLeave = window.confirm("Are you sure you want to leave the offline game?");
        if (confirmLeave) {
          useGameStore.getState().disconnect();
        } else {
          window.history.pushState({ page: 'room' }, '', '');
        }
        return;
      }

      const confirmLeave = window.confirm("Are you sure you want to leave the game room?");
      
      if (confirmLeave) {
        // If they click yes, we execute the disconnect logic
        if (isHost && playersCount > 1) {
           usePeerStore.getState().transferHost(useGameStore.getState().players.find(p => p.id !== useGameStore.getState().myPlayerId)?.name || '', true);
        } else {
           disconnect();
        }
      } else {
        // If they click cancel, we push another phantom state immediately to re-trap the next back click
        window.history.pushState({ page: 'room' }, '', '');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [mpStatus, disconnect, isHost, playersCount, showOfflineSetup, roomName]);
  
  if (mpStatus === 'lobby') return <LobbyScreen />;
  if (mpStatus === 'playing' && roomName === 'offline') return <OfflineBoard />;
  if (mpStatus === 'playing') return <GameBoard />;
  if (mpStatus === 'connecting') return <LoadingScreen message={loadingMessage} />;

  if (showOfflineSetup) return <OfflineSetup onBack={() => setShowOfflineSetup(false)} />;

  return <ConnectionMenu onOffline={() => setShowOfflineSetup(true)} />;
}

function LoadingScreen({ message = "Loading game..." }: { message?: string }) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6">
      <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-300 text-lg font-semibold animate-pulse">{message}</p>
    </div>
  );
}

function ConnectionMenu({ onOffline }: { onOffline: () => void }) {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [roomName, setRoomName] = useState('');
  const [password, setPassword] = useState('');
  const [playerName, setPlayerName] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('codenames_player_name') || '';
    }
    return '';
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rooms, setRooms] = useState<any[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  // Save name to localStorage whenever it changes
  useEffect(() => {
    if (playerName) {
      localStorage.setItem('codenames_player_name', playerName);
    }
  }, [playerName]);

  // Auto-fill room if URL has ?room=Name
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const roomParam = urlParams.get('room');
      if (roomParam) {
        setRoomName(roomParam);
        setTab('join');
      }
    }
  }, []);

  const initializeHost = usePeerStore(s => s.initializeHost);
  const joinRoomAction = usePeerStore(s => s.joinRoom);
  const joinLobby = useGameStore(s => s.joinLobby);
  const updatePlayers = useGameStore(s => s.updatePlayers);

  const handleCreate = async () => {
    if (!roomName || !playerName) {
      setError("Room Name and Player Name are required!");
      return;
    }
    setLoading(true);
    setError('');
    try {
      const id = await initializeHost(roomName, password);
      joinLobby(roomName, true, id);
      updatePlayers([{
        id, name: playerName, team: 'red', role: 'spymaster', isHost: true
      }]);
    } catch (err: any) {
      setError(err.message || "Failed to create room.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!roomName || !playerName) {
      setError("Room Name and Player Name are required!");
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await joinRoomAction(roomName, playerName, password);
      if (!result.success) {
        setError(result.reason || "Failed to join room.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to join room.");
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    setLoadingRooms(true);
    try {
      const res = await fetch('/api/rooms');
      const data = await res.json();
      setRooms(data);
    } catch (err) {
      console.error("Failed to fetch rooms", err);
    }
    setLoadingRooms(false);
  };

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col md:flex-row items-center justify-center p-4 gap-8">
      
      {/* Left Column: Room Discovery */}
      <div className="bg-slate-800 p-6 rounded-2xl shadow-2xl w-full max-w-sm h-[500px] border border-slate-700 flex flex-col hidden md:flex">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Gamepad2 className="w-6 h-6 text-emerald-400" /> Active Rooms
          </h2>
          <button onClick={fetchRooms} disabled={loadingRooms} className="text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50">
            <RefreshCw className={`w-5 h-5 ${loadingRooms ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
          {loadingRooms && rooms.length === 0 ? (
            <div className="text-center text-slate-500 py-8 text-sm animate-pulse">Scanning network...</div>
          ) : rooms.length === 0 ? (
            <div className="text-center text-slate-500 py-8 text-sm">No active public rooms found. Create one!</div>
          ) : (
            rooms.map((room) => (
              <div 
                key={room.name} 
                onClick={() => { setRoomName(room.name); setTab('join'); }}
                className="bg-slate-900 border border-slate-700 hover:border-emerald-500/50 p-4 rounded-xl cursor-pointer transition-all group hover:bg-slate-900/80"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-white font-bold group-hover:text-emerald-400 transition-colors">{room.name}</h3>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${room.status === 'playing' ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {room.status === 'playing' ? 'In Game' : 'Lobby'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> {room.players} players
                  </div>
                  <span className="font-semibold text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity">Join &rarr;</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Column: Connection Form */}
      <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700">
        <div className="flex justify-center mb-6">
          <Gamepad2 className="w-16 h-16 text-emerald-400" />
        </div>
        <h1 className="text-3xl font-black text-center text-white mb-2 uppercase tracking-wider">Codenames</h1>
        <p className="text-center text-slate-400 mb-8 font-medium">Multiplayer Web App Edition</p>

        <div className="flex bg-slate-700/50 rounded-lg p-1 mb-6">
          <button 
            className={`flex-1 py-2 font-semibold text-sm rounded-md transition-all ${tab === 'create' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            onClick={() => { setTab('create'); setError(''); }}
          >
            Create Room
          </button>
          <button 
            className={`flex-1 py-2 font-semibold text-sm rounded-md transition-all ${tab === 'join' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            onClick={() => { setTab('join'); setError(''); }}
          >
            Join Room
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/50 rounded-lg flex items-start gap-3 text-rose-400">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Your Name</label>
            <input 
              type="text" 
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              placeholder="e.g. Bernardo"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Room ID</label>
            <input 
              type="text" 
              value={roomName}
              onChange={e => setRoomName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              className="w-full bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              placeholder="e.g. jpsala-2"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Password {tab === 'create' ? '(Optional)' : ''}
            </label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              placeholder="Secret key"
              onKeyDown={e => {
                if (e.key === 'Enter') tab === 'create' ? handleCreate() : handleJoin();
              }}
            />
          </div>

          <button 
            onClick={tab === 'create' ? handleCreate : handleJoin}
            disabled={loading}
            className="w-full mt-6 bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Connecting..." : (tab === 'create' ? <><PlusCircle className="w-5 h-5"/> Create Room</> : <><LogIn className="w-5 h-5"/> Join Room</>)}
          </button>

          <div className="relative flex items-center mt-5">
            <div className="flex-1 border-t border-slate-700"></div>
            <span className="px-3 text-xs text-slate-500 font-bold uppercase">or</span>
            <div className="flex-1 border-t border-slate-700"></div>
          </div>

          <button
            onClick={onOffline}
            className="w-full mt-4 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer hover:border-amber-500/60"
          >
            <WifiOff className="w-5 h-5" /> Play Offline (Pass &amp; Play)
          </button>
        </div>
      </div>
      
      {/* Mobile-only Room Discovery Button (Simple version) */}
      <div className="md:hidden w-full max-w-md bg-slate-800 p-4 rounded-xl border border-slate-700">
        <div className="flex justify-between items-center mb-3">
           <h2 className="text-sm font-bold text-slate-300 flex items-center gap-2"><Gamepad2 className="w-4 h-4 text-emerald-400"/> Active Rooms ({rooms.length})</h2>
           <button onClick={fetchRooms} disabled={loadingRooms} className="text-slate-400 cursor-pointer">
             <RefreshCw className={`w-4 h-4 ${loadingRooms ? 'animate-spin' : ''}`} />
           </button>
        </div>
          <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 custom-scrollbar snap-x">
            {rooms.length === 0 ? (
              <span className="text-xs text-slate-500 italic px-2">No active rooms found.</span>
            ) : (
              rooms.map(room => (
                <button 
                  key={room.name} 
                  onClick={() => { setRoomName(room.name); setTab('join'); }}
                  className="shrink-0 snap-center bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-sm text-left cursor-pointer hover:border-emerald-500 min-w-[140px] shadow-sm transition-all"
                >
                  <div className="font-bold text-slate-200 truncate">{room.name}</div>
                  <div className="text-xs text-slate-400 mt-1 flex justify-between">{room.players} players</div>
                </button>
              ))
            )}
        </div>
      </div>

    </div>
  );
}
