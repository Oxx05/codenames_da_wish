"use client";

import { useGameStore, Player, TeamId, PlayerRole } from "@/store/gameStore";
import { usePeerStore } from "@/store/peerStore";
import { useState } from "react";
import { themes, ThemeId } from "@/lib/themes";
import { Users, Settings, LogOut, Play, AlertTriangle, Dice5, Dices, Ban, Crown, Copy, CheckCircle } from "lucide-react";

export default function LobbyScreen() {
  const { isHost, roomName, players, myPlayerId, theme, numTeams, totalCards, assassinCount, cardsPerTeam, firstTeam, neutralEndsTurn, turnTimer } = useGameStore();
  const { disconnect, broadcastAction, sendActionToHost, kickPlayer, transferHost } = usePeerStore();

  const me = players.find(p => p.id === myPlayerId);
  const myTeam = me?.team || 'red';
  const myRole = me?.role || 'operative';
  const hasSpymaster = players.some(p => p.team === myTeam && p.role === 'spymaster' && p.id !== myPlayerId);

  // Validation logic
  const selectedThemeInfo = themes[theme];
  const maxAvailable = selectedThemeInfo?.maxCards || 60;
  
  const totalRequired = (numTeams * 1) + 1 + assassinCount; // Minimum cards required: 1 per team + 1 starting + assassins
  
  const teamNames = numTeams === 2 ? ['red', 'blue'] : numTeams === 3 ? ['red', 'blue', 'green'] : ['red', 'blue', 'green', 'yellow'];
  const hasSpiesAndOps = teamNames.every(t => 
    players.some(p => p.team === t && p.role === 'spymaster') &&
    players.some(p => p.team === t && p.role === 'operative')
  );

  const isValidGame = totalCards <= maxAvailable && totalCards >= totalRequired && assassinCount < totalCards && numTeams >= 2 && numTeams <= 4 && hasSpiesAndOps;

  const [isFlipping, setIsFlipping] = useState(false);
  const [tempValues, setTempValues] = useState<Record<string, string>>({});
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyLink = () => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}?room=${roomName}`;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleLeave = () => {
    disconnect();
  };

  const handleUpdatePlayer = (team: TeamId, requestedRole: PlayerRole) => {
    if (!me) return;
    
    // Check if the target team already has a spymaster
    const targetTeamHasSpymaster = players.some(p => p.team === team && p.role === 'spymaster' && p.id !== myPlayerId);
    
    let finalRole = requestedRole;
    if (finalRole === 'spymaster' && targetTeamHasSpymaster) {
      finalRole = 'operative'; // Auto-downgrade if Spymaster slot is taken
    } else if (team !== myTeam && !targetTeamHasSpymaster && team !== 'neutral') {
      finalRole = 'spymaster'; // Auto-assign Spymaster if joining a team that lacks one
    }

    // If host, update directly and broadcast. Otherwise, send to host.
    const updated = { ...me, team, role: finalRole };
    if (isHost) {
      useGameStore.getState().updatePlayers(players.map(p => p.id === myPlayerId ? updated : p));
      broadcastAction({ type: 'SYNC_STATE', state: { players: useGameStore.getState().players } });
    } else {
      sendActionToHost({ type: 'UPDATE_PLAYER', player: updated });
    }
  };

  const handleStartGame = async () => {
    if (!isHost || !isValidGame) return;
    
    // 1. Fetch theme data and select cards
    const themeApi = themes[theme];
    usePeerStore.getState().broadcastAction({ type: 'SYNC_STATE', state: { mpStatus: 'connecting' } }); // show a loading state
    
    try {
      const allItems = await themeApi.fetchData();
      // Shuffle the items before slicing so we don't always get the first alphabetical ones
      const shuffledItems = [...allItems].sort(() => 0.5 - Math.random());
      const selected = shuffledItems.slice(0, totalCards);
      
      // Fill roles array — use per-team overrides if set, otherwise auto-calculate
      const roles: TeamId[] = [];
      const teamNames: TeamId[] = numTeams === 2 ? ['red', 'blue'] : numTeams === 3 ? ['red', 'blue', 'green'] : ['red', 'blue', 'green', 'yellow'];
      
      // One team starts, so they get +1 card
      const firstTurnTeam = firstTeam === 'random' ? teamNames[Math.floor(Math.random() * teamNames.length)] : firstTeam;
      
      const hasCustomCounts = teamNames.some(t => (cardsPerTeam[t] || 0) > 0);
      
      teamNames.forEach(t => {
        let count: number;
        if (hasCustomCounts && (cardsPerTeam[t] || 0) > 0) {
          count = cardsPerTeam[t];
        } else {
          const autoPerTeam = Math.floor((totalCards - assassinCount - Math.max(0, 10 - numTeams)) / numTeams);
          count = t === firstTurnTeam ? autoPerTeam + 1 : autoPerTeam;
        }
        for (let i = 0; i < count; i++) roles.push(t);
      });
      for (let i = 0; i < assassinCount; i++) roles.push('assassin');
      while (roles.length < totalCards) roles.push('neutral');
      
      // Shuffle roles
      roles.sort(() => 0.5 - Math.random());
      
      // Create final cards array
      const cards = selected.map((item, i) => ({
        name: item.name,
        image: item.image,
        role: roles[i],
        revealed: false
      }));

      // 3. Dispatch START_GAME
      useGameStore.getState().startGame(cards, firstTurnTeam);
      broadcastAction({ type: 'START_GAME', cards, firstTurn: firstTurnTeam });

    } catch (err) {
      console.error("Failed to start game:", err);
      useGameStore.getState().applyFullState({ mpStatus: 'lobby' });
    }
  };

  const flipCoin = () => {
    if (!isHost) return;
    setIsFlipping(true);
    setTimeout(() => {
      const teams: TeamId[] = numTeams === 2 ? ['red', 'blue'] : numTeams === 3 ? ['red', 'blue', 'green'] : ['red', 'blue', 'green', 'yellow'];
      const randomTeam = teams[Math.floor(Math.random() * teams.length)];
      useGameStore.getState().updateSettings({ firstTeam: randomTeam });
      setIsFlipping(false);
    }, 600); // 600ms animation delay
  };

  return (
    <div className="min-h-screen bg-slate-950 p-2 sm:p-4 lg:p-8 font-sans text-white flex flex-col items-center overflow-x-hidden">
      <div className="w-full max-w-6xl bg-slate-900 rounded-2xl shadow-2xl overflow-hidden mt-2 sm:mt-4 border border-slate-800 shadow-emerald-500/5">
        
        {/* Header */}
        <div className="bg-slate-950/50 p-4 sm:p-6 lg:p-8 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-wider flex items-center gap-3 text-emerald-500">
                <Users className="w-8 h-8"/> Room: <span className="text-white">{roomName}</span>
              </h2>
              <button 
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-all border border-slate-700 w-fit"
              >
                {isCopied ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {isCopied ? <span className="text-emerald-400">Copied!</span> : "Copy Link"}
              </button>
            </div>
            <p className="text-slate-400 text-sm mt-2">
              Select your team and role. The host will start the game.
            </p>
          </div>
          <button onClick={handleLeave} className="px-5 py-2.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-xl flex items-center gap-2 transition-all font-semibold shadow-sm cursor-pointer hover:shadow-md">
            <LogOut className="w-5 h-5" /> Leave Room
          </button>
        </div>

        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Settings Column */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-slate-900 p-5 rounded-xl border border-slate-700">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Settings className="w-4 h-4" /> Game Settings
              </h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Theme</label>
                    <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20">Max: {maxAvailable} cards</span>
                  </div>
                  {isHost ? (
                    <select 
                      value={theme}
                      onChange={e => {
                        const newTheme = e.target.value as ThemeId;
                        useGameStore.getState().updateSettings({ theme: newTheme });
                        if (isHost) broadcastAction({ type: 'UPDATE_SETTINGS', settings: { theme: newTheme } } as any);
                      }}
                      className="w-full bg-slate-950 border-2 border-slate-800 hover:border-emerald-500/50 rounded-xl px-4 py-3 text-sm font-bold outline-none cursor-pointer transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 shadow-inner"
                    >
                      {Object.values(themes).map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300">
                      {themes[theme]?.name}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-slate-400 mb-1 uppercase tracking-wide text-center">Teams</label>
                    {isHost ? (
                      <input 
                        type="number" 
                        min={2} max={4}
                        value={tempValues.numTeams ?? numTeams}
                        onChange={e => {
                          const raw = e.target.value;
                          setTempValues(prev => ({ ...prev, numTeams: raw }));
                          const val = parseInt(raw);
                          if (!isNaN(val) && val >= 2 && val <= 4) {
                            useGameStore.getState().updateSettings({ numTeams: val });
                            broadcastAction({ type: 'UPDATE_SETTINGS', settings: { numTeams: val } } as any);
                          }
                        }}
                        onBlur={() => setTempValues(prev => {
                          const { numTeams: _, ...rest } = prev;
                          return rest;
                        })}
                        className="w-full bg-slate-950 border-2 border-slate-800 hover:border-emerald-500/50 rounded-xl px-4 py-3 text-base text-center font-black outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 cursor-pointer shadow-inner"
                      />
                    ) : (
                      <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-base text-center font-bold shadow-inner text-slate-200">{numTeams}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-slate-400 mb-1 uppercase tracking-wide text-center">Cards</label>
                    {isHost ? (
                       <input 
                        type="number" 
                        min={numTeams + 1} max={selectedThemeInfo?.maxCards || 60}
                        value={tempValues.totalCards ?? totalCards}
                        onChange={e => {
                          const raw = e.target.value;
                          setTempValues(prev => ({ ...prev, totalCards: raw }));
                          const val = parseInt(raw);
                          const max = selectedThemeInfo?.maxCards || 60;
                          if (!isNaN(val) && val >= (numTeams + 1) && val <= max) {
                            useGameStore.getState().updateSettings({ totalCards: val });
                            broadcastAction({ type: 'UPDATE_SETTINGS', settings: { totalCards: val } } as any);
                          }
                        }}
                        onBlur={() => setTempValues(prev => {
                          const { totalCards: _, ...rest } = prev;
                          return rest;
                        })}
                        className="w-full bg-slate-950 border-2 border-slate-800 hover:border-emerald-500/50 rounded-xl px-4 py-3 text-base text-center font-black outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 cursor-pointer shadow-inner"
                      />
                    ) : (
                      <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-base text-center font-bold shadow-inner text-slate-200">
                        {totalCards}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-slate-400 mb-1 uppercase tracking-wide text-center">Assassins</label>
                    {isHost ? (
                       <input 
                        type="number" 
                        min={0} max={Math.max(0, totalCards - numTeams - 1)}
                        value={tempValues.assassinCount ?? assassinCount}
                        onChange={e => {
                          const raw = e.target.value;
                          setTempValues(prev => ({ ...prev, assassinCount: raw }));
                          const val = parseInt(raw);
                          const max = Math.max(0, totalCards - numTeams - 1);
                          if (!isNaN(val) && val >= 0 && val <= max) {
                            useGameStore.getState().updateSettings({ assassinCount: val });
                            broadcastAction({ type: 'UPDATE_SETTINGS', settings: { assassinCount: val } } as any);
                          }
                        }}
                        onBlur={() => setTempValues(prev => {
                          const { assassinCount: _, ...rest } = prev;
                          return rest;
                        })}
                        className="w-full bg-slate-950 border-2 border-slate-800 hover:border-emerald-500/50 rounded-xl px-4 py-3 text-base text-center font-black outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 cursor-pointer shadow-inner"
                      />
                    ) : (
                      <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-base text-center font-bold shadow-inner text-slate-200">
                        {assassinCount}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-700/50 mt-2">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">First Team</label>
                    {isHost && (
                      <button onClick={flipCoin} disabled={isFlipping} className="text-xs flex items-center gap-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all disabled:opacity-50">
                        <Dices className={`w-4 h-4 ${isFlipping ? 'animate-spin text-indigo-400' : ''}`} /> {isFlipping ? 'Flipping...' : 'Coin Flip'}
                      </button>
                    )}
                  </div>
                  {isHost ? (
                    <select 
                      value={firstTeam}
                      onChange={e => {
                        const val = e.target.value as any;
                        useGameStore.getState().updateSettings({ firstTeam: val });
                        if (isHost) broadcastAction({ type: 'UPDATE_SETTINGS', settings: { firstTeam: val } } as any);
                      }}
                      className={`w-full bg-slate-800 border-2 border-slate-700 rounded-xl px-4 py-3 text-base outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-black uppercase tracking-wider text-center cursor-pointer ${isFlipping ? 'opacity-50 scale-95' : 'scale-100'}`}
                    >
                      <option value="random">Random 🎲</option>
                      <option value="red" className="text-red-400">Red 🔴</option>
                      <option value="blue" className="text-blue-400">Blue 🔵</option>
                      {numTeams >= 3 && <option value="green" className="text-green-400">Green 🟢</option>}
                      {numTeams >= 4 && <option value="yellow" className="text-yellow-400">Yellow 🟡</option>}
                    </select>
                  ) : (
                    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-bold uppercase text-center text-slate-300">
                      {firstTeam === 'random' ? 'Random 🎲' : `${firstTeam} 🏳️`}
                    </div>
                  )}
                </div>

                {/* Neutral Ends Turn Toggle */}
                <div className="pt-4 border-t border-slate-700/50 mt-2 flex justify-between items-center">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">Neutral Tile</label>
                    <span className="text-[10px] text-slate-500">Ends turn when guessed?</span>
                  </div>
                  {isHost ? (
                    <button 
                      onClick={() => {
                        useGameStore.getState().updateSettings({ neutralEndsTurn: !neutralEndsTurn });
                        broadcastAction({ type: 'UPDATE_SETTINGS', settings: { neutralEndsTurn: !neutralEndsTurn } } as any);
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${neutralEndsTurn ? 'bg-emerald-500' : 'bg-slate-700'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${neutralEndsTurn ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  ) : (
                    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1 text-xs font-bold uppercase text-slate-300">
                      {neutralEndsTurn ? 'Yes' : 'No'}
                    </div>
                  )}
                </div>

                {/* Turn Timer Select */}
                <div className="pt-4 border-t border-slate-700/50 mt-2 flex justify-between items-center">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">Turn Timer</label>
                    <span className="text-[10px] text-slate-500">Auto-ends turns?</span>
                  </div>
                  {isHost ? (
                    <select 
                      value={turnTimer}
                      onChange={e => {
                        const val = parseInt(e.target.value);
                        useGameStore.getState().updateSettings({ turnTimer: val });
                        broadcastAction({ type: 'UPDATE_SETTINGS', settings: { turnTimer: val } } as any);
                      }}
                      className="bg-slate-800 border-2 border-slate-700 rounded-lg px-2 py-1 text-xs font-bold outline-none cursor-pointer focus:border-emerald-500"
                    >
                      <option value={0}>Off ♾️</option>
                      <option value={60}>60s ⏱️</option>
                      <option value={90}>90s ⏱️</option>
                      <option value={120}>120s ⏱️</option>
                    </select>
                  ) : (
                    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1 text-xs font-bold uppercase text-slate-300">
                      {turnTimer === 0 ? 'Off' : `${turnTimer}s`}
                    </div>
                  )}
                </div>

                {/* Per-Team Card Counts (Advanced) */}
                {isHost && (
                  <div className="pt-3 border-t border-slate-700/50 mt-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2 text-center">Cards Per Team <span className="text-slate-600">(0 = auto)</span></label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['red', 'blue', ...(numTeams >= 3 ? ['green'] : []), ...(numTeams >= 4 ? ['yellow'] : [])] as TeamId[]).map(team => (
                        <div key={team} className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full shrink-0 ${team === 'red' ? 'bg-red-500' : team === 'blue' ? 'bg-blue-500' : team === 'green' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                          <input
                            type="number"
                            min={0}
                            max={totalCards}
                            value={tempValues[`cards-${team}`] ?? (cardsPerTeam[team] || 0)}
                            onChange={e => {
                              const raw = e.target.value;
                              setTempValues(prev => ({ ...prev, [`cards-${team}`]: raw }));
                              const val = parseInt(raw);
                              if (!isNaN(val) && val >= 0 && val <= totalCards) {
                                const updated = { ...cardsPerTeam, [team]: val };
                                useGameStore.getState().updateSettings({ cardsPerTeam: updated });
                                broadcastAction({ type: 'UPDATE_SETTINGS', settings: { cardsPerTeam: updated } } as any);
                              }
                            }}
                            onBlur={() => setTempValues(prev => {
                              const { [`cards-${team}`]: _, ...rest } = prev;
                              return rest;
                            })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-sm text-center font-bold outline-none focus:border-emerald-500 transition-all shadow-inner"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Validation Warnings */}
                {isHost && !isValidGame && (
                  <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 flex gap-2 items-start mt-4">
                    <AlertTriangle className="text-rose-400 w-4 h-4 mt-0.5 shrink-0" />
                    <div className="text-xs text-rose-300">
                      {totalCards > maxAvailable && <p>Total cards exceeds theme max ({maxAvailable}).</p>}
                      {totalCards < totalRequired && <p>Need more cards! At least {totalRequired} required for {numTeams} teams and {assassinCount} assassins.</p>}
                      {assassinCount >= totalCards && <p>Too many assassins, not enough agents!</p>}
                      {(numTeams < 2 || numTeams > 4) && <p>Teams must be between 2 and 4.</p>}
                      {!hasSpiesAndOps && <p>Every active team must have at least 1 Spymaster and 1 Operative.</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* My Controls */}
            <div className="bg-slate-900 p-5 rounded-xl border border-slate-700">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">My Role</h3>
              
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button onClick={() => handleUpdatePlayer('red', myRole === 'spectator' ? 'operative' : myRole)} className={`flex-1 py-2.5 border rounded-lg text-sm font-bold transition-all cursor-pointer shadow-sm ${myTeam === 'red' && myRole !== 'spectator' ? 'bg-red-600 text-white border-red-500 shadow-red-900/50 scale-105' : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/30'}`}>Red 🔴</button>
                  <button onClick={() => handleUpdatePlayer('blue', myRole === 'spectator' ? 'operative' : myRole)} className={`flex-1 py-2.5 border rounded-lg text-sm font-bold transition-all cursor-pointer shadow-sm ${myTeam === 'blue' && myRole !== 'spectator'  ? 'bg-blue-600 text-white border-blue-500 shadow-blue-900/50 scale-105' : 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/30'}`}>Blue 🔵</button>
                </div>
                {numTeams >= 3 && (
                  <div className="flex gap-2">
                    <button onClick={() => handleUpdatePlayer('green', myRole === 'spectator' ? 'operative' : myRole)} className={`flex-1 py-2.5 border rounded-lg text-sm font-bold transition-all cursor-pointer shadow-sm ${myTeam === 'green' && myRole !== 'spectator'  ? 'bg-green-600 text-white border-green-500 shadow-green-900/50 scale-105' : 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/30'}`}>Green 🟢</button>
                    {numTeams >= 4 && (
                      <button onClick={() => handleUpdatePlayer('yellow', myRole === 'spectator' ? 'operative' : myRole)} className={`flex-1 py-2.5 border rounded-lg text-sm font-bold transition-all cursor-pointer shadow-sm ${myTeam === 'yellow' && myRole !== 'spectator'  ? 'bg-yellow-600 text-white border-yellow-500 shadow-yellow-900/50 scale-105' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/30'}`}>Yellow 🟡</button>
                    )}
                  </div>
                )}
                
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 mt-4 pt-4 border-t border-slate-700/50">My Action Role</h3>
                <div className="flex gap-2">
                  <button disabled={myRole === 'spectator'} onClick={() => handleUpdatePlayer(myTeam, 'operative')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all shadow-md ${myRole === 'operative' ? 'bg-emerald-600 text-white shadow-emerald-900/50 scale-105' : myRole === 'spectator' ? 'bg-slate-800/50 text-slate-600 border border-slate-800 cursor-not-allowed' : 'bg-slate-800 border border-slate-600 hover:bg-slate-700 text-slate-300 cursor-pointer'}`}>🕵️ Operative</button>
                  <button disabled={myRole === 'spectator' || (hasSpymaster && myRole !== 'spymaster')} onClick={() => handleUpdatePlayer(myTeam, 'spymaster')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all shadow-md ${myRole === 'spymaster' ? 'bg-amber-600 text-white shadow-amber-900/50 cursor-pointer scale-105' : (hasSpymaster || myRole === 'spectator') ? 'bg-slate-800/50 text-slate-600 border border-slate-800 cursor-not-allowed' : 'bg-slate-800 border border-slate-600 hover:bg-slate-700 text-slate-300 cursor-pointer'}`}>🧠 Spymaster {hasSpymaster && myRole !== 'spymaster' && '(Full)'}</button>
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                  <button onClick={() => handleUpdatePlayer('neutral', 'spectator')} className={`w-full py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer ${myRole === 'spectator' ? 'bg-indigo-600 text-white shadow-indigo-900/50 scale-102 border border-indigo-500' : 'bg-slate-800/80 border border-slate-600 hover:bg-indigo-900/40 hover:border-indigo-500/50 text-slate-300'}`}>👁️ Join as Spectator</button>
                </div>
                {myRole === 'spectator' && (
                  <div className="mt-3 text-center text-xs font-semibold text-amber-500 animate-pulse bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                    ☝️ To start playing, select a Team Color above!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Players Column */}
          <div className="md:col-span-2 space-y-6">
            
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-6 ${numTeams > 2 && 'sm:grid-cols-2 lg:grid-cols-2'}`}>
              
              {/* Red Team */}
              <div className="bg-red-950/20 border-l-4 border border-red-500/40 rounded-xl p-4 shadow-lg relative overflow-hidden">
                <h4 className="text-red-400 font-black uppercase tracking-widest mb-3 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div> Red Team
                  </span>
                  <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">{players.filter(p => p.team === 'red').length}</span>
                </h4>
                <div className="space-y-2">
                  {players.filter(p => p.team === 'red').map(p => (
                    <div key={p.id} className="group flex justify-between items-center bg-slate-900/50 p-3 rounded-lg text-sm shadow-sm border border-slate-700/30">
                      <div className="flex flex-col">
                        <span className={p.id === myPlayerId ? "font-bold text-white flex items-center gap-1" : "text-slate-300 flex items-center gap-1"}>
                          {p.name} {p.id === myPlayerId && <span className="text-[10px] bg-slate-700 px-1 rounded">(You)</span>} {p.isHost && <span className="text-xs text-yellow-500 font-bold">★ Host</span>}
                        </span>
                        {isHost && p.id !== myPlayerId && (
                           <div className="hidden group-hover:flex gap-2 mt-2">
                             <button onClick={() => transferHost(p.name, false)} className="text-[10px] flex items-center gap-1 bg-amber-500/20 hover:bg-amber-500/40 text-amber-400 px-2 py-1 rounded" title="Make Host"><Crown className="w-3 h-3"/> Host</button>
                             <button onClick={() => kickPlayer(p.id)} className="text-[10px] flex items-center gap-1 bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 px-2 py-1 rounded" title="Kick"><Ban className="w-3 h-3"/> Kick</button>
                           </div>
                        )}
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold shadow-sm h-fit ${p.role === 'spymaster' ? 'bg-amber-500 text-amber-950' : 'bg-slate-700 text-slate-200'}`}>
                        {p.role === 'spymaster' ? '🧠 Spymaster' : '🕵️ Operative'}
                      </span>
                    </div>
                  ))}
                  {players.filter(p => p.team === 'red').length === 0 && <p className="text-xs text-center text-slate-500 py-3 italic">No operatives</p>}
                </div>
              </div>

              {/* Blue Team */}
              <div className="bg-blue-950/20 border-l-4 border border-blue-500/40 rounded-xl p-4 shadow-lg relative overflow-hidden">
                <h4 className="text-blue-400 font-black uppercase tracking-widest mb-3 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div> Blue Team
                  </span>
                  <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-bold">{players.filter(p => p.team === 'blue').length}</span>
                </h4>
                <div className="space-y-2">
                  {players.filter(p => p.team === 'blue').map(p => (
                    <div key={p.id} className="group flex justify-between items-center bg-slate-900/50 p-3 rounded-lg text-sm shadow-sm border border-slate-700/30">
                      <div className="flex flex-col">
                        <span className={p.id === myPlayerId ? "font-bold text-white flex items-center gap-1" : "text-slate-300 flex items-center gap-1"}>
                          {p.name} {p.id === myPlayerId && <span className="text-[10px] bg-slate-700 px-1 rounded">(You)</span>} {p.isHost && <span className="text-xs text-yellow-500 font-bold">★ Host</span>}
                        </span>
                        {isHost && p.id !== myPlayerId && (
                           <div className="hidden group-hover:flex gap-2 mt-2">
                             <button onClick={() => transferHost(p.name, false)} className="text-[10px] flex items-center gap-1 bg-amber-500/20 hover:bg-amber-500/40 text-amber-400 px-2 py-1 rounded" title="Make Host"><Crown className="w-3 h-3"/> Host</button>
                             <button onClick={() => kickPlayer(p.id)} className="text-[10px] flex items-center gap-1 bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 px-2 py-1 rounded" title="Kick"><Ban className="w-3 h-3"/> Kick</button>
                           </div>
                        )}
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold shadow-sm h-fit ${p.role === 'spymaster' ? 'bg-amber-500 text-amber-950' : 'bg-slate-700 text-slate-200'}`}>
                        {p.role === 'spymaster' ? '🧠 Spymaster' : '🕵️ Operative'}
                      </span>
                    </div>
                  ))}
                  {players.filter(p => p.team === 'blue').length === 0 && <p className="text-xs text-center text-slate-500 py-3 italic">No operatives</p>}
                </div>
              </div>
              
              {/* Green Team */}
              {numTeams >= 3 && (
                <div className="bg-green-950/20 border-l-4 border border-green-500/40 rounded-xl p-4 shadow-lg relative overflow-hidden">
                  <h4 className="text-green-400 font-black uppercase tracking-widest mb-3 text-xs flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div> Green Team
                    </span>
                    <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-bold">{players.filter(p => p.team === 'green').length}</span>
                  </h4>
                  <div className="space-y-2">
                    {players.filter(p => p.team === 'green').map(p => (
                      <div key={p.id} className="group flex justify-between items-center bg-slate-900/50 p-3 rounded-lg text-sm shadow-sm border border-slate-700/30">
                        <div className="flex flex-col">
                          <span className={p.id === myPlayerId ? "font-bold text-white flex items-center gap-1" : "text-slate-300 flex items-center gap-1"}>
                            {p.name} {p.id === myPlayerId && <span className="text-[10px] bg-slate-700 px-1 rounded">(You)</span>} {p.isHost && <span className="text-xs text-yellow-500 font-bold">★ Host</span>}
                          </span>
                          {isHost && p.id !== myPlayerId && (
                             <div className="hidden group-hover:flex gap-2 mt-2">
                               <button onClick={() => transferHost(p.name, false)} className="text-[10px] flex items-center gap-1 bg-amber-500/20 hover:bg-amber-500/40 text-amber-400 px-2 py-1 rounded" title="Make Host"><Crown className="w-3 h-3"/> Host</button>
                               <button onClick={() => kickPlayer(p.id)} className="text-[10px] flex items-center gap-1 bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 px-2 py-1 rounded" title="Kick"><Ban className="w-3 h-3"/> Kick</button>
                             </div>
                          )}
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold shadow-sm h-fit ${p.role === 'spymaster' ? 'bg-amber-500 text-amber-950' : 'bg-slate-700 text-slate-200'}`}>
                          {p.role === 'spymaster' ? '🧠 Spymaster' : '🕵️ Operative'}
                        </span>
                      </div>
                    ))}
                    {players.filter(p => p.team === 'green').length === 0 && <p className="text-xs text-center text-slate-500 py-3 italic">No operatives</p>}
                  </div>
                </div>
              )}
              
              {/* Yellow Team */}
              {numTeams >= 4 && (
                <div className="bg-yellow-950/20 border-l-4 border border-yellow-500/40 rounded-xl p-4 shadow-lg relative overflow-hidden">
                  <h4 className="text-yellow-400 font-black uppercase tracking-widest mb-3 text-xs flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.8)]"></div> Yellow Team
                    </span>
                    <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded font-bold">{players.filter(p => p.team === 'yellow').length}</span>
                  </h4>
                  <div className="space-y-2">
                    {players.filter(p => p.team === 'yellow').map(p => (
                      <div key={p.id} className="group flex justify-between items-center bg-slate-900/50 p-3 rounded-lg text-sm shadow-sm border border-slate-700/30">
                        <div className="flex flex-col">
                          <span className={p.id === myPlayerId ? "font-bold text-white flex items-center gap-1" : "text-slate-300 flex items-center gap-1"}>
                            {p.name} {p.id === myPlayerId && <span className="text-[10px] bg-slate-700 px-1 rounded">(You)</span>} {p.isHost && <span className="text-xs text-yellow-500 font-bold">★ Host</span>}
                          </span>
                          {isHost && p.id !== myPlayerId && (
                             <div className="hidden group-hover:flex gap-2 mt-2">
                               <button onClick={() => transferHost(p.name, false)} className="text-[10px] flex items-center gap-1 bg-amber-500/20 hover:bg-amber-500/40 text-amber-400 px-2 py-1 rounded" title="Make Host"><Crown className="w-3 h-3"/> Host</button>
                               <button onClick={() => kickPlayer(p.id)} className="text-[10px] flex items-center gap-1 bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 px-2 py-1 rounded" title="Kick"><Ban className="w-3 h-3"/> Kick</button>
                             </div>
                          )}
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold shadow-sm h-fit ${p.role === 'spymaster' ? 'bg-amber-500 text-amber-950' : 'bg-slate-700 text-slate-200'}`}>
                          {p.role === 'spymaster' ? '🧠 Spymaster' : '🕵️ Operative'}
                        </span>
                      </div>
                    ))}
                    {players.filter(p => p.team === 'yellow').length === 0 && <p className="text-xs text-center text-slate-500 py-3 italic">No operatives</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="bg-slate-850 justify-center p-6 rounded-2xl border border-slate-700 shadow-xl flex items-center mt-8">
              {isHost ? (
                <button 
                  onClick={handleStartGame}
                  disabled={!isValidGame}
                  className={`w-full max-w-md px-8 py-4 text-lg font-black tracking-wider uppercase rounded-xl shadow-2xl flex justify-center items-center gap-3 transition-all ${isValidGame ? 'bg-emerald-500 hover:bg-emerald-400 text-white cursor-pointer hover:shadow-emerald-500/30 active:scale-95' : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'}`}
                >
                  <Play className="w-5 h-5" fill="currentColor" /> {isValidGame ? 'Start Game' : 'Invalid Match Settings'}
                </button>
              ) : (
                <p className="text-slate-400 text-sm font-medium animate-pulse py-2">Waiting for host to start...</p>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
