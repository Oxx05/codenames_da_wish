"use client";

import React, { useEffect, useState } from 'react';
import { useGameStore, TeamId, Card } from "@/store/gameStore";
import { usePeerStore } from "@/store/peerStore";
import { useMemo } from "react";
import { LogOut, RefreshCcw, Hand, Flag, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from './Modal';

export default function GameBoard() {
  const { 
    myPlayerId, players, roomName, isHost,
    cards, remaining, currentTurn, turnPhase, clue, guessesLeft, winner, numTeams 
  } = useGameStore();
  const { disconnect, broadcastAction, sendActionToHost } = usePeerStore();

  const me = players.find(p => p.id === myPlayerId);
  const myTeam = me?.team || 'red';
  const myRole = me?.role || 'operative';

  const [clueWord, setClueWord] = useState('');
  const [clueCount, setClueCount] = useState(1);

  // Computed state
  const isMyTurn = currentTurn === myTeam && !winner;
  const iAmActiveSpymaster = isMyTurn && myRole === 'spymaster' && turnPhase === 'clue';
  const iAmActiveOperative = isMyTurn && myRole === 'operative' && turnPhase === 'guess';
  const waitingForOthers = !isMyTurn && !winner;

  const handleGiveClue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!iAmActiveSpymaster || !clueWord.trim()) return;
    const action = { type: 'GIVE_CLUE', clue: clueWord.trim().toUpperCase(), count: clueCount };
    if (isHost) {
      useGameStore.getState().giveClue(clueWord.trim().toUpperCase(), clueCount);
      broadcastAction(action as any);
    } else {
      sendActionToHost(action as any);
    }
  };

  const handleCardClick = (index: number) => {
    if (!iAmActiveOperative || cards[index].revealed || winner) return;
    const action = { type: 'REVEAL_CARD', index };
    useGameStore.getState().revealCard(index);
    if (isHost) {
      const newState = useGameStore.getState();
      broadcastAction({ 
        type: 'SYNC_STATE', 
        state: { cards: newState.cards, remaining: newState.remaining, turnPhase: newState.turnPhase, currentTurn: newState.currentTurn, guessesLeft: newState.guessesLeft, winner: newState.winner }
      });
    } else {
      sendActionToHost(action as any); 
    }
  };

  const handleCardContextMenu = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    if (myRole !== 'operative' || cards[index].revealed || winner) return;
    
    const isRemoving = cards[index].marks?.includes(myTeam) || false;
    const action = { type: 'SET_MARK', index, team: myTeam, remove: isRemoving };
    
    useGameStore.getState().toggleMarkCard(index, myTeam, isRemoving);
    if (isHost) {
      broadcastAction(action as any);
    } else {
      sendActionToHost(action as any);
    }
  };

  // Modal states
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'cancel' | 'leave' | null;
  }>({ isOpen: false, type: null });

  // Add listener for turn changes to alert if it's my turn
  useEffect(() => {
    if (iAmActiveOperative && !winner) {
      if ('vibrate' in navigator) navigator.vibrate(200);
    }
  }, [currentTurn, iAmActiveOperative, winner]);

  const handleEndTurn = () => {
    if (!iAmActiveOperative || winner) return;
    const action = { type: 'END_TURN' } as any;
    useGameStore.getState().endTurn();
    if (isHost) broadcastAction(action);
    else sendActionToHost(action);
  };

  const handleResetLobby = () => {
    if (!isHost) return;
    setModalState({ isOpen: true, type: 'cancel' });
  };
  
  const confirmResetLobby = () => {
    const action = { type: 'RESET_LOBBY' } as any;
    useGameStore.getState().resetToLobby();
    broadcastAction(action);
    setModalState({ isOpen: false, type: null });
  };

  const handleLeave = () => {
    setModalState({ isOpen: true, type: 'leave' });
  };

  const confirmLeave = () => {
    setModalState({ isOpen: false, type: null });
    disconnect();
  };

  // Helper colors
  const teamColors: Record<TeamId, string> = {
    red: 'text-red-500', bgRed: 'bg-red-500',
    blue: 'text-blue-500', bgBlue: 'bg-blue-500',
    green: 'text-green-500', bgGreen: 'bg-green-500',
    yellow: 'text-yellow-500', bgYellow: 'bg-yellow-500',
    neutral: 'text-slate-400',
    assassin: 'text-slate-900',
  } as any;

  // Dynamic Grid sizing utility - Optimized for Landscape cards
  const getGridColsClass = (total: number) => {
    // On mobile we want fewer columns to keep cards "wide"
    if (total <= 12) return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
    if (total <= 20) return "grid-cols-3 sm:grid-cols-4 lg:grid-cols-5";
    if (total <= 25) return "grid-cols-4 sm:grid-cols-5 lg:grid-cols-5";
    if (total <= 36) return "grid-cols-4 sm:grid-cols-6 lg:grid-cols-6";
    if (total <= 49) return "grid-cols-5 sm:grid-cols-7 lg:grid-cols-7 xl:grid-cols-8";
    if (total <= 64) return "grid-cols-6 sm:grid-cols-8 lg:grid-cols-8 xl:grid-cols-9";
    return "grid-cols-7 sm:grid-cols-9 lg:grid-cols-9 xl:grid-cols-10";
  };
  
  const gridClasses = getGridColsClass(cards.length);

  return (
    <div className="h-[100dvh] bg-slate-950 flex flex-col font-sans overflow-hidden">
      {/* Top Bar - Ultra Compact */}
      <header className="bg-slate-900 border-b border-slate-800 p-1 sm:p-1.5 flex flex-wrap justify-between items-center z-10 shadow-lg shrink-0 gap-1 sm:gap-2">
        <div className="flex lg:hidden gap-1.5 sm:gap-2 order-2 sm:order-1 flex-1 sm:flex-none justify-center sm:justify-start">
          {(['red', 'blue', ...(numTeams >= 3 ? ['green'] : []), ...(numTeams >= 4 ? ['yellow'] : [])] as const).map(team => {
            const colors: Record<string, { bg: string; border: string; text: string; label: string }> = {
              red: { bg: 'bg-red-950/30', border: 'border-red-500/30', text: 'text-red-500', label: 'Red' },
              blue: { bg: 'bg-blue-950/30', border: 'border-blue-500/30', text: 'text-blue-500', label: 'Blue' },
              green: { bg: 'bg-green-950/30', border: 'border-green-500/30', text: 'text-green-500', label: 'Green' },
              yellow: { bg: 'bg-yellow-950/30', border: 'border-yellow-500/30', text: 'text-yellow-500', label: 'Yellow' },
            };
            const c = colors[team];
            return (
              <div key={team} className={`${c.bg} border ${c.border} px-1.5 py-0.5 sm:px-3 sm:py-1 rounded-lg flex flex-col items-center min-w-10 sm:min-w-14`}>
                <span className={`text-[6px] sm:text-[8px] uppercase font-bold ${c.text} opacity-70 tracking-widest leading-none`}>{c.label}</span>
                <span className={`text-sm sm:text-lg font-black ${c.text} leading-none mt-0.5`}>{(remaining as any)[team]}</span>
              </div>
            );
          })}
        </div>

        {/* Turn Indicator Main */}
        <div className="flex-1 w-full sm:w-auto order-1 sm:order-2 flex justify-center basis-full sm:basis-auto">
          {winner ? (
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              <div className="bg-amber-500/20 text-amber-500 px-4 py-2 sm:px-8 sm:py-3 rounded-full border border-amber-500/30 flex items-center gap-2 sm:gap-3 animate-pulse">
                <Flag className="w-4 h-4 sm:w-6 sm:h-6" />
                <span className="text-sm sm:text-xl font-black uppercase tracking-widest text-center">
                  {winner === 'assassin' ? `${currentTurn} hit assassin!` : `${winner} Wins!`}
                </span>
              </div>
              {isHost && (
                <button 
                  onClick={handleResetLobby}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 sm:px-6 sm:py-3 rounded-xl shadow-lg border border-emerald-400/50 flex items-center gap-2 transition-transform active:scale-95 text-sm sm:text-base cursor-pointer animate-bounce"
                >
                  <RefreshCcw className="w-4 h-4 sm:w-5 sm:h-5"/> Play Again
                </button>
              )}
            </div>
          ) : (
            <div className={cn("px-3 py-0.5 sm:px-6 sm:py-1.5 rounded-full border flex flex-col items-center transition-colors shadow-inner", 
              currentTurn === 'red' ? 'bg-red-950/40 border-red-500/50' : currentTurn === 'blue' ? 'bg-blue-950/40 border-blue-500/50' : currentTurn === 'green' ? 'bg-green-950/40 border-green-500/50' : 'bg-yellow-950/40 border-yellow-500/50'
            )}>
              <span className={cn("text-[10px] sm:text-base font-black uppercase tracking-widest leading-none", currentTurn === 'red' ? 'text-red-400' : currentTurn === 'blue' ? 'text-blue-400' : currentTurn === 'green' ? 'text-green-400' : 'text-yellow-400')}>
                {currentTurn} Team
              </span>
              <span className="text-[7px] sm:text-xs font-semibold text-slate-400 leading-none mt-0.5">
                {turnPhase === 'clue' ? 'Awaiting Clue' : `Guessing (${guessesLeft})`}
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-2 sm:gap-3 order-3 sm:order-3">
           {isHost && (
             <button onClick={handleResetLobby} className="px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-800 text-slate-300 hover:bg-amber-500/20 hover:text-amber-400 border border-slate-700 rounded-lg flex items-center gap-1.5 sm:gap-2 transition-colors font-semibold text-xs sm:text-sm cursor-pointer shadow-sm">
              <RefreshCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Cancel Game</span>
            </button>
           )}
           <button onClick={handleLeave} className="px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-800 text-slate-300 hover:bg-rose-500/20 hover:text-rose-400 border border-slate-700 rounded-lg flex items-center gap-1.5 sm:gap-2 transition-colors font-semibold text-xs sm:text-sm cursor-pointer shadow-sm">
            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Leave</span>
          </button>
        </div>
      </header>

      <div className={cn(
        "w-full py-1 px-3 text-center text-[9px] sm:text-xs font-black tracking-[0.2em] shadow-md shrink-0 border-b flex justify-between items-center transition-colors duration-500",
        myRole === 'spectator' ? 'bg-slate-900 text-slate-400 border-slate-700' :
        myTeam === 'red' ? 'bg-red-600 text-red-50 border-red-500 shadow-red-900/40' :
        myTeam === 'blue' ? 'bg-blue-600 text-blue-50 border-blue-500 shadow-blue-900/40' :
        myTeam === 'green' ? 'bg-green-600 text-green-50 border-green-500 shadow-green-900/40' :
        'bg-yellow-500 text-yellow-950 border-yellow-400 shadow-yellow-900/40'
      )}>
        <span className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
           {myRole === 'spectator' ? 'SPECTATING' : `${myTeam} ${myRole}`}
        </span>
        
        <span className="lg:hidden flex items-center gap-2 bg-black/20 px-3 py-1 rounded-full text-[9px]">
           <span className="opacity-70">TURN:</span> 
           <span className={cn("font-black", teamColors[currentTurn])}>{currentTurn.toUpperCase()}</span>
        </span>
      </div>

      {/* Main Game Area — Desktop Side-Panels + Center Grid */}
      <main className="flex-1 min-h-0 w-full flex flex-row items-stretch overflow-hidden relative">
        
        {/* Left Side Panel (Desktop Only) - Blue & Green Teams */}
        <aside className="hidden lg:flex flex-col w-56 xl:w-64 bg-slate-900/50 border-r border-slate-800/80 p-4 gap-6 shrink-0 z-20 overflow-y-auto custom-scrollbar">
          <TeamPanel teamId="blue" />
          {numTeams >= 3 && <TeamPanel teamId="green" />}
        </aside>

        {/* Center Grid Area */}
        <div className="flex-1 min-w-0 flex flex-col items-center justify-center p-1 sm:p-2 lg:p-4 overflow-hidden">
          <div className="w-full h-full min-h-0 bg-slate-900/20 rounded-xl border border-slate-800/30 flex items-stretch p-0.5 sm:p-1 lg:p-2">
            <div className={cn("grid h-full w-full auto-rows-fr", gridClasses, "gap-0.5 sm:gap-1 lg:gap-2")}>
              {cards.map((card, idx) => (
                <CardItem 
                  key={idx} 
                  card={card} 
                  isSpymaster={myRole === 'spymaster' || winner !== null} 
                  onClick={() => handleCardClick(idx)}
                  onContextMenu={(e) => handleCardContextMenu(e, idx)}
                  playable={iAmActiveOperative && !card.revealed && !winner}
                  markable={myRole === 'operative' && !card.revealed && !winner}
                  totalCards={cards.length}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right Side Panel (Desktop Only) - Red & Yellow Teams */}
        <aside className="hidden lg:flex flex-col w-56 xl:w-64 bg-slate-900/50 border-l border-slate-800/80 p-4 gap-6 shrink-0 z-20 overflow-y-auto custom-scrollbar">
          <TeamPanel teamId="red" />
          {numTeams >= 4 && <TeamPanel teamId="yellow" />}
          
          {/* Spectators list if any */}
          {players.some(p => p.role === 'spectator') && (
            <div className="mt-auto pt-6 border-t border-slate-800/50">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Users className="w-3 h-3" /> Spectators
              </h4>
              <div className="flex flex-wrap gap-1">
                {players.filter(p => p.role === 'spectator').map(p => (
                  <span key={p.id} className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700/50">{p.name}</span>
                ))}
              </div>
            </div>
          )}
        </aside>
      </main>

      {/* Bottom Action Bar — compact */}
      <footer className="bg-slate-900 border-t border-slate-800 p-1.5 sm:p-2 lg:p-3 flex justify-center items-center gap-2 sm:gap-3 lg:gap-4 z-10 shrink-0 flex-wrap">
        
        {/* Clue UI for Active Spymaster */}
        {iAmActiveSpymaster && (
          <form onSubmit={handleGiveClue} className="flex gap-1.5 sm:gap-3 items-center bg-slate-800 p-1 sm:p-1.5 rounded-xl border border-slate-700 shadow-xl w-full max-w-lg lg:w-auto">
            <span className="hidden sm:inline-block text-slate-400 text-xs font-black uppercase tracking-widest ml-2 shrink-0">Clue:</span>
            <input 
              type="text" 
              value={clueWord}
              onChange={e => setClueWord(e.target.value.replace(/[^a-zA-ZÀ-ÿ\s-]/g, ''))}
              placeholder="WORD" 
              className="flex-1 min-w-0 bg-slate-950 border border-slate-700 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500 font-bold uppercase text-sm sm:text-base"
              maxLength={20}
            />
            <input 
              type="number" 
              min={0} max={9}
              value={clueCount}
              onChange={e => setClueCount(parseInt(e.target.value) || 0)}
              className="w-12 sm:w-16 bg-slate-950 border border-slate-700 text-white px-1 sm:px-2 py-2 rounded-lg outline-none focus:border-emerald-500 font-bold text-center text-sm sm:text-base"
            />
            <button 
              type="submit" 
              disabled={!clueWord.trim()} 
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-black uppercase tracking-wider text-xs sm:text-sm transition-all shadow-lg active:scale-95 shrink-0"
            >
              GIVE
            </button>
          </form>
        )}

        {/* Display Clue for everyone else when in guess phase */}
        {turnPhase === 'guess' && clue && (
          <div className="flex gap-4 items-center bg-slate-800 px-6 py-3 rounded-xl border border-slate-700 shadow-xl">
            <span className="text-slate-400 text-sm font-bold uppercase tracking-widest">Current Clue:</span>
            <span className="text-2xl font-black text-white px-4 py-1 bg-slate-950 rounded-lg tracking-widest uppercase border border-slate-800">{clue.word}</span>
            <span className="text-2xl font-black text-emerald-400 px-4 py-1 bg-slate-950 rounded-lg border border-slate-800">{clue.count}</span>
          </div>
        )}

        {/* End Turn for Operatives */}
        {iAmActiveOperative && (
          <button onClick={handleEndTurn} className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-8 py-3 rounded-xl shadow-lg border border-amber-400/50 flex items-center gap-2 transition-transform active:scale-95 shrink-0 cursor-pointer">
            <Hand className="w-5 h-5"/> End Turn
          </button>
        )}

        {/* Controls Info for Operatives */}
        {myRole === 'operative' && (
          <div className="hidden lg:flex gap-4 items-center bg-slate-800 px-4 py-2 rounded-xl border border-slate-700 shadow-xl ml-4 shrink-0">
               <span className="text-slate-400 text-xs font-bold uppercase tracking-widest bg-slate-900 px-2 py-1 rounded flex items-center gap-2"><div className="px-1.5 py-0.5 border border-slate-700 rounded bg-slate-800">LC</div> <span className="text-white">Reveal</span></span>
               <span className="text-slate-400 text-xs font-bold uppercase tracking-widest bg-slate-900 px-2 py-1 rounded flex items-center gap-2"><div className="px-1.5 py-0.5 border border-slate-700 rounded bg-slate-800">RC</div> <span className="text-emerald-400">Mark</span></span>
          </div>
        )}

        {/* Wait Messages */}
        {waitingForOthers && (
          <div className="text-slate-500 font-medium animate-pulse flex items-center gap-2">
            <RefreshCcw className="w-4 h-4 animate-spin" /> Waiting for {currentTurn} team...
          </div>
        )}

      </footer>
      {/* Custom Modals */}
      <Modal
        isOpen={modalState.isOpen && modalState.type === 'cancel'}
        title="Cancel Game?"
        message="Are you sure you want to cancel the current game and return everyone to the lobby?"
        confirmText="Yes, Cancel Game"
        type="danger"
        onConfirm={confirmResetLobby}
        onCancel={() => setModalState({ isOpen: false, type: null })}
      />
      <Modal
        isOpen={modalState.isOpen && modalState.type === 'leave'}
        title="Leave Room?"
        message="Are you sure you want to disconnect and leave the room?"
        confirmText="Leave"
        type="danger"
        onConfirm={confirmLeave}
        onCancel={() => setModalState({ isOpen: false, type: null })}
      />
    </div>
  );
}

// Subcomponent: Team Side Panel
function TeamPanel({ teamId }: { teamId: TeamId }) {
  const { players, remaining, currentTurn, winner } = useGameStore();
  const teamPlayers = players.filter(p => p.team === teamId);
  const spymaster = teamPlayers.find(p => p.role === 'spymaster');
  const operatives = teamPlayers.filter(p => p.role === 'operative');
  const isActive = currentTurn === teamId && !winner;

  const colors = {
    red: { bg: 'bg-red-500', text: 'text-red-500', border: 'border-red-500/30', light: 'bg-red-500/10', dark: 'bg-red-950/20' },
    blue: { bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-500/30', light: 'bg-blue-500/10', dark: 'bg-blue-950/20' },
    green: { bg: 'bg-green-500', text: 'text-green-500', border: 'border-green-500/30', light: 'bg-green-500/10', dark: 'bg-green-950/20' },
    yellow: { bg: 'bg-yellow-500', text: 'text-yellow-500', border: 'border-yellow-500/30', light: 'bg-yellow-500/10', dark: 'bg-yellow-950/20' },
  }[teamId as 'red' | 'blue' | 'green' | 'yellow'] || { bg: 'bg-slate-500', text: 'text-slate-500', border: 'border-slate-500/30', light: 'bg-slate-500/10', dark: 'bg-slate-950/20' };

  return (
    <div className={cn(
      "flex flex-col gap-3 transition-all duration-300",
      isActive ? "opacity-100 scale-100" : "opacity-60 scale-[0.98]"
    )}>
      {/* Team Header & Score */}
      <div className={cn("p-3 rounded-xl border flex justify-between items-center shadow-lg relative overflow-hidden", colors.dark, isActive ? "border-emerald-500 ring-2 ring-emerald-500/20" : colors.border)}>
        {isActive && <div className="absolute inset-0 bg-emerald-500/5 animate-pulse" />}
        <div className="relative z-10">
          <h4 className={cn("text-[10px] font-black uppercase tracking-[0.2em]", colors.text)}>{teamId} Team</h4>
          <span className="text-2xl font-black text-white">{(remaining as any)[teamId]}</span>
        </div>
        {isActive && <div className="bg-emerald-500 text-emerald-950 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter animate-bounce">TURN</div>}
      </div>

      {/* Spymaster Card */}
      <div className={cn("border rounded-xl p-2 flex flex-col gap-1.5", colors.light, colors.border)}>
        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest pl-1">Spymaster</span>
        <div className="bg-slate-900/80 p-2 rounded-lg text-xs font-bold border border-slate-700/50 flex items-center gap-2">
          {spymaster ? (
            <>
              <div className={cn("w-2 h-2 rounded-full", colors.bg)} />
              <span className="truncate">{spymaster.name}</span>
            </>
          ) : (
            <span className="text-slate-600 italic">No Spymaster</span>
          )}
        </div>
      </div>

      {/* Operatives List */}
      <div className="flex flex-col gap-1">
        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest pl-1">Operatives</span>
        <div className="flex flex-col gap-1">
          {operatives.map(p => (
            <div key={p.id} className="bg-slate-900/40 p-2 rounded-lg text-[11px] border border-slate-700/30 flex items-center gap-2">
              <div className={cn("w-1.5 h-1.5 rounded-full", colors.bg, "opacity-70")} />
              <span className="text-slate-300 truncate">{p.name}</span>
            </div>
          ))}
          {operatives.length === 0 && <span className="text-[10px] text-slate-700 italic pl-1">Empty</span>}
        </div>
      </div>
    </div>
  );
}

// Subcomponent: Card
function CardItem({ card, isSpymaster, onClick, onContextMenu, playable, markable, totalCards }: { 
  card: Card; 
  isSpymaster: boolean; 
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  playable: boolean;
  markable: boolean;
  totalCards: number;
}) {
  
  const roleColors: Record<TeamId, string> = {
    red: 'bg-red-600 border-red-500',
    blue: 'bg-blue-600 border-blue-500',
    green: 'bg-green-600 border-green-500',
    yellow: 'bg-yellow-600 border-yellow-500',
    neutral: 'bg-stone-300 border-stone-200 text-slate-800',
    assassin: 'bg-slate-900 border-slate-800 text-white',
  } as any;

  // The mathematical formula for scalable text (from legacy script.js)
  const calculateFontSize = (text: string, isMain: boolean) => {
    const len = text.length;
    const maxFit = Math.floor(95 / (len * 0.65));
    if (isMain) return Math.min(32, Math.max(8, maxFit));
    return Math.round(Math.min(32, Math.max(8, maxFit)) * 0.6);
  };

  const isTextOnly = !card.image;
  // Automatic "High Density" mode: hide images to prioritize text legibility
  const forceTextOnly = totalCards > 49 || (totalCards > 25 && typeof window !== 'undefined' && window.innerWidth < 640);
  const effectivelyTextOnly = isTextOnly || forceTextOnly;

  return (
    <button 
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={cn(
        "relative rounded-md sm:rounded-lg lg:rounded-xl overflow-hidden shadow-md flex flex-col justify-center items-center select-none transition-all duration-300 border-[1px] md:border-2 outline-none w-full aspect-[3/2] min-w-0 min-h-0",
        // Base unrevealed state
        !card.revealed && "bg-amber-50 border-amber-200/80 shadow-[inset_0_-4px_0_rgba(0,0,0,0.08)] sm:shadow-[inset_0_-6px_0_rgba(0,0,0,0.08)] text-slate-900",
        // Hover state for playable operatives
        playable && "hover:-translate-y-1.5 hover:shadow-2xl hover:border-emerald-400 cursor-pointer",
        markable && !playable && "hover:-translate-y-1 hover:shadow-xl hover:border-emerald-400/50 cursor-context-menu",
        // Disabled state
        (!playable && !markable && !card.revealed) && "cursor-default",
        // Revealed state
        card.revealed && roleColors[card.role],
        card.revealed && "shadow-inner border-transparent"
      )}
    >
      {/* Spymaster overlay (shows roles without revealing) */}
      {isSpymaster && !card.revealed && (
        <div className={cn("absolute inset-1 sm:inset-1.5 border-2 sm:border-[3px] rounded-md sm:rounded-lg opacity-50 pointer-events-none", roleColors[card.role])} />
      )}

      {/* Card Text Content */}
      <div className={cn("relative z-10 w-full h-full flex flex-col justify-center items-center p-1 sm:p-2", card.revealed ? "opacity-100" : "opacity-100")}>
         {effectivelyTextOnly ? (
            <svg viewBox="0 0 100 40" preserveAspectRatio="xMidYMid meet" className="w-[94%] h-full overflow-visible">
                <text x="50" y="22" fontSize={calculateFontSize(card.name, true)} fontWeight="900" textAnchor="middle" dominantBaseline="central" fill={card.revealed ? 'white' : '#1e293b'} stroke={card.revealed ? 'none' : 'rgba(30,41,59,0.1)'} strokeWidth="0.3" className="uppercase" style={{ letterSpacing: '0.04em' }}>{card.name}</text>
            </svg>
         ) : (
            <>
              {card.image && <img src={card.image} alt={card.name} className={cn("w-auto max-w-[80%] h-[45%] sm:h-[50%] object-contain drop-shadow-xl", card.revealed && "opacity-50 grayscale mix-blend-luminosity")} />}
              <div className="w-[94%] min-h-[30px] sm:min-h-[36px] bg-slate-900/85 backdrop-blur-md rounded-md flex items-center justify-center px-2 py-1 absolute bottom-1 sm:bottom-1.5 border border-white/10">
                <svg viewBox="0 0 100 22" preserveAspectRatio="xMidYMid meet" className="w-full h-full overflow-visible">
                    <text x="50" y="12" fontSize={calculateFontSize(card.name, true)} fontWeight="900" textAnchor="middle" dominantBaseline="central" fill="white" stroke="rgba(0,0,0,0.4)" strokeWidth="0.5" className="uppercase" style={{ letterSpacing: '0.05em' }}>{card.name}</text>
                </svg>
              </div>
            </>
         )}
      </div>

      {/* Revealed assassin overlay */}
      {card.revealed && card.role === 'assassin' && (
        <div className="absolute inset-0 bg-red-600/20 mix-blend-overlay pointer-events-none flex items-center justify-center">
            <span className="text-4xl">❌</span>
        </div>
      )}

      {/* Team marks overlay */}
      {card.marks && card.marks.length > 0 && !card.revealed && (
        <div className="absolute top-2 right-2 flex gap-1 z-20 pointer-events-none">
          {card.marks.map(team => (
            <div key={team} className={cn("w-3.5 h-3.5 rounded-full border border-white shadow-xl shadow-black/50 ring-2 ring-black/20", roleColors[team]?.split(' ')[0] || 'bg-slate-500')} />
          ))}
        </div>
      )}

    </button>
  );
}
