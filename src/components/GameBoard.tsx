"use client";

import React, { useEffect, useState } from 'react';
import { useGameStore, TeamId, Card } from "@/store/gameStore";
import { usePeerStore } from "@/store/peerStore";
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

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'cancel' | 'leave' | null;
  }>({ isOpen: false, type: null });

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

  // Colors
  const teamBgColor: Record<string, string> = {
    red: 'bg-red-600', blue: 'bg-blue-600', green: 'bg-green-600', yellow: 'bg-yellow-500',
  };
  const teamTextColor: Record<string, string> = {
    red: 'text-red-400', blue: 'text-blue-400', green: 'text-green-400', yellow: 'text-yellow-400',
  };

  // Grid columns: the key insight is to match rows to fill the screen.
  // For a standard 5x5 = 25 cards, we want 5 columns. For 4x5=20, 5 cols. For 6x6=36, 6 cols.
  // On mobile (portrait), we compute the ideal number of columns so that:
  //   - Cards fill the available width & height evenly
  //   - No scrolling needed
  const getGridCols = (total: number): number => {
    // Classic Codenames is 5x5. We aim for near-square grids.
    const sqrt = Math.sqrt(total);
    // Prefer slightly more columns than rows for landscape cards
    const cols = Math.ceil(sqrt);
    return cols;
  };

  const numCols = getGridCols(cards.length);
  const numRows = Math.ceil(cards.length / numCols);

  return (
    <div className="h-[100dvh] bg-slate-950 flex flex-col font-sans overflow-hidden">
      {/* ===== MOBILE HEADER: Single ultra-compact bar ===== */}
      <header className="lg:hidden flex items-center justify-between px-2 py-1 bg-slate-900 border-b border-slate-800 shrink-0 z-10 gap-1">
        {/* Scores */}
        <div className="flex gap-1">
          {(['red', 'blue', ...(numTeams >= 3 ? ['green'] : []), ...(numTeams >= 4 ? ['yellow'] : [])] as string[]).map(team => (
            <div key={team} className={cn(
              "flex items-center gap-1 px-1.5 py-0.5 rounded-md text-white font-black text-xs",
              teamBgColor[team],
              currentTurn === team && !winner && "ring-1 ring-white/50"
            )}>
              <span className="text-[8px] opacity-80 uppercase">{team[0]}</span>
              <span>{(remaining as any)[team]}</span>
            </div>
          ))}
        </div>
        
        {/* Center: Turn info + role badge */}
        <div className="flex items-center gap-1.5">
          {winner ? (
            <span className="text-amber-400 text-[10px] font-black uppercase animate-pulse">
              {winner === 'assassin' ? `💀 ${currentTurn}` : `🏆 ${winner}`}
            </span>
          ) : (
            <span className={cn("text-[10px] font-bold uppercase", teamTextColor[currentTurn])}>
              {currentTurn} · {turnPhase === 'clue' ? 'Clue' : `Guess (${guessesLeft})`}
            </span>
          )}
          <span className={cn(
            "text-[8px] font-bold uppercase px-1.5 py-0.5 rounded flex items-center gap-0.5",
            myRole === 'spymaster' ? 'bg-purple-600/30 text-purple-300' : 
            myRole === 'spectator' ? 'bg-slate-700 text-slate-400' :
            'bg-emerald-600/30 text-emerald-300'
          )}>
            {myRole === 'spymaster' ? '🔍 spy' : myRole === 'spectator' ? '👁 spec' : '🎯 op'}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-1">
          {isHost && (
            <button onClick={handleResetLobby} className="p-1.5 text-slate-400 hover:text-amber-400 cursor-pointer">
              <RefreshCcw className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={handleLeave} className="p-1.5 text-slate-400 hover:text-rose-400 cursor-pointer">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ===== DESKTOP HEADER: Full bar ===== */}
      <header className="hidden lg:flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 shrink-0 z-10 gap-4">
        <div className="flex gap-2">
          {(['red', 'blue', ...(numTeams >= 3 ? ['green'] : []), ...(numTeams >= 4 ? ['yellow'] : [])] as string[]).map(team => (
            <div key={team} className={cn(
              "flex flex-col items-center px-3 py-1 rounded-lg border",
              currentTurn === team && !winner ? "ring-2 ring-emerald-500/40 border-emerald-500/50" : "border-slate-700",
              `bg-${team === 'red' ? 'red' : team === 'blue' ? 'blue' : team === 'green' ? 'green' : 'yellow'}-950/30`
            )}>
              <span className={cn("text-[8px] uppercase font-bold tracking-widest opacity-70", teamTextColor[team])}>{team}</span>
              <span className={cn("text-lg font-black", teamTextColor[team])}>{(remaining as any)[team]}</span>
            </div>
          ))}
        </div>

        {winner ? (
          <div className="flex items-center gap-4">
            <div className="bg-amber-500/20 text-amber-500 px-8 py-2 rounded-full border border-amber-500/30 flex items-center gap-3 animate-pulse">
              <Flag className="w-5 h-5" />
              <span className="text-lg font-black uppercase tracking-widest">
                {winner === 'assassin' ? `${currentTurn} hit assassin!` : `${winner} Wins!`}
              </span>
            </div>
            {isHost && (
              <button onClick={handleResetLobby} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2 rounded-xl shadow-lg border border-emerald-400/50 flex items-center gap-2 cursor-pointer animate-bounce">
                <RefreshCcw className="w-4 h-4"/> Play Again
              </button>
            )}
          </div>
        ) : (
          <div className={cn("px-6 py-1.5 rounded-full border flex flex-col items-center",
            currentTurn === 'red' ? 'bg-red-950/40 border-red-500/50' : currentTurn === 'blue' ? 'bg-blue-950/40 border-blue-500/50' : currentTurn === 'green' ? 'bg-green-950/40 border-green-500/50' : 'bg-yellow-950/40 border-yellow-500/50'
          )}>
            <span className={cn("text-base font-black uppercase tracking-widest", teamTextColor[currentTurn])}>{currentTurn} Team</span>
            <span className="text-xs font-semibold text-slate-400">{turnPhase === 'clue' ? 'Awaiting Clue' : `Guessing (${guessesLeft} left)`}</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <span className={cn(
            "text-xs font-bold uppercase px-3 py-1 rounded-lg border",
            myRole === 'spymaster' ? 'bg-purple-600/20 text-purple-300 border-purple-500/30' : 
            'bg-emerald-600/20 text-emerald-300 border-emerald-500/30'
          )}>
            {myTeam} {myRole}
          </span>
          {isHost && (
            <button onClick={handleResetLobby} className="px-4 py-1.5 bg-slate-800 text-slate-300 hover:text-amber-400 border border-slate-700 rounded-lg text-sm cursor-pointer">
              <RefreshCcw className="w-4 h-4 inline mr-1" /> Cancel
            </button>
          )}
          <button onClick={handleLeave} className="px-4 py-1.5 bg-slate-800 text-slate-300 hover:text-rose-400 border border-slate-700 rounded-lg text-sm cursor-pointer">
            <LogOut className="w-4 h-4 inline mr-1" /> Leave
          </button>
        </div>
      </header>

      {/* ===== MAIN GAME AREA ===== */}
      <main className="flex-1 min-h-0 w-full flex flex-row items-stretch overflow-hidden relative">
        
        {/* Left Side Panel (Desktop Only) */}
        <aside className="hidden lg:flex flex-col w-56 xl:w-64 bg-slate-900/50 border-r border-slate-800/80 p-4 gap-6 shrink-0 z-20 overflow-y-auto">
          <TeamPanel teamId="blue" />
          {numTeams >= 3 && <TeamPanel teamId="green" />}
        </aside>

        {/* Center Grid Area — THIS IS THE KEY: The grid must fill ALL remaining space */}
        <div className="flex-1 min-w-0 flex items-stretch p-0.5 sm:p-1 lg:p-3 overflow-hidden">
          <div 
            className="w-full h-full grid gap-[2px] sm:gap-1 lg:gap-1.5"
            style={{
              gridTemplateColumns: `repeat(${numCols}, 1fr)`,
              gridTemplateRows: `repeat(${numRows}, 1fr)`,
            }}
          >
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

        {/* Right Side Panel (Desktop Only) */}
        <aside className="hidden lg:flex flex-col w-56 xl:w-64 bg-slate-900/50 border-l border-slate-800/80 p-4 gap-6 shrink-0 z-20 overflow-y-auto">
          <TeamPanel teamId="red" />
          {numTeams >= 4 && <TeamPanel teamId="yellow" />}
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

      {/* ===== FOOTER: Ultra compact on mobile ===== */}
      <footer className="bg-slate-900 border-t border-slate-800 px-2 py-1 sm:p-2 lg:p-3 flex justify-center items-center gap-2 sm:gap-3 z-10 shrink-0">
        
        {/* Spymaster Clue Input */}
        {iAmActiveSpymaster && (
          <form onSubmit={handleGiveClue} className="flex gap-1 sm:gap-2 items-center w-full max-w-lg">
            <input 
              type="text" 
              value={clueWord}
              onChange={e => setClueWord(e.target.value.replace(/[^a-zA-ZÀ-ÿ\s-]/g, ''))}
              placeholder="CLUE" 
              className="flex-1 min-w-0 bg-slate-800 border border-slate-700 text-white px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg outline-none focus:border-emerald-500 font-bold uppercase text-xs sm:text-sm"
              maxLength={20}
            />
            <input 
              type="number" min={0} max={9}
              value={clueCount}
              onChange={e => setClueCount(parseInt(e.target.value) || 0)}
              className="w-10 sm:w-14 bg-slate-800 border border-slate-700 text-white px-1 py-1.5 sm:py-2 rounded-lg outline-none focus:border-emerald-500 font-bold text-center text-xs sm:text-sm"
            />
            <button 
              type="submit" disabled={!clueWord.trim()} 
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-black uppercase text-[10px] sm:text-xs shrink-0"
            >
              GIVE
            </button>
          </form>
        )}

        {/* Clue Display */}
        {turnPhase === 'guess' && clue && (
          <div className="flex gap-2 sm:gap-3 items-center">
            <span className="hidden sm:inline text-slate-400 text-xs font-bold uppercase">Clue:</span>
            <span className="text-sm sm:text-lg font-black text-white bg-slate-800 px-3 py-1 rounded-lg uppercase tracking-wider border border-slate-700">{clue.word}</span>
            <span className="text-sm sm:text-lg font-black text-emerald-400 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">{clue.count}</span>
          </div>
        )}

        {/* End Turn */}
        {iAmActiveOperative && (
          <button onClick={handleEndTurn} className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-1.5 sm:px-6 sm:py-2 rounded-lg shadow-lg flex items-center gap-1.5 text-xs sm:text-sm shrink-0 cursor-pointer">
            <Hand className="w-3.5 h-3.5 sm:w-4 sm:h-4"/> End Turn
          </button>
        )}

        {/* Desktop controls hint */}
        {myRole === 'operative' && (
          <div className="hidden lg:flex gap-3 items-center text-slate-500 text-[10px] uppercase ml-4">
            <span><kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">LC</kbd> Reveal</span>
            <span><kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">RC</kbd> Mark</span>
          </div>
        )}

        {/* Waiting */}
        {waitingForOthers && (
          <span className="text-slate-500 text-xs font-medium animate-pulse flex items-center gap-1.5">
            <RefreshCcw className="w-3 h-3 animate-spin" /> Waiting for {currentTurn}...
          </span>
        )}

        {/* Winner: Play Again on mobile */}
        {winner && isHost && (
          <button onClick={handleResetLobby} className="lg:hidden bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer animate-bounce">
            <RefreshCcw className="w-3.5 h-3.5"/> Play Again
          </button>
        )}
      </footer>

      {/* Modals */}
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

// Subcomponent: Team Side Panel (Desktop only)
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
    <div className={cn("flex flex-col gap-3 transition-all duration-300", isActive ? "opacity-100" : "opacity-60")}>
      <div className={cn("p-3 rounded-xl border flex justify-between items-center shadow-lg relative overflow-hidden", colors.dark, isActive ? "border-emerald-500 ring-2 ring-emerald-500/20" : colors.border)}>
        {isActive && <div className="absolute inset-0 bg-emerald-500/5 animate-pulse" />}
        <div className="relative z-10">
          <h4 className={cn("text-[10px] font-black uppercase tracking-[0.2em]", colors.text)}>{teamId} Team</h4>
          <span className="text-2xl font-black text-white">{(remaining as any)[teamId]}</span>
        </div>
        {isActive && <div className="bg-emerald-500 text-emerald-950 px-2 py-0.5 rounded text-[8px] font-black uppercase animate-bounce">TURN</div>}
      </div>
      <div className={cn("border rounded-xl p-2 flex flex-col gap-1.5", colors.light, colors.border)}>
        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest pl-1">Spymaster</span>
        <div className="bg-slate-900/80 p-2 rounded-lg text-xs font-bold border border-slate-700/50 flex items-center gap-2">
          {spymaster ? (
            <><div className={cn("w-2 h-2 rounded-full", colors.bg)} /><span className="truncate">{spymaster.name}</span></>
          ) : (
            <span className="text-slate-600 italic">None</span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest pl-1">Operatives</span>
        {operatives.map(p => (
          <div key={p.id} className="bg-slate-900/40 p-2 rounded-lg text-[11px] border border-slate-700/30 flex items-center gap-2">
            <div className={cn("w-1.5 h-1.5 rounded-full", colors.bg, "opacity-70")} />
            <span className="text-slate-300 truncate">{p.name}</span>
          </div>
        ))}
        {operatives.length === 0 && <span className="text-[10px] text-slate-700 italic pl-1">Empty</span>}
      </div>
    </div>
  );
}

// Subcomponent: Card — NO fixed aspect ratio. Let the grid rows stretch them to fill.
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

  const calculateFontSize = (text: string, isMain: boolean) => {
    const len = text.length;
    const maxFit = Math.floor(95 / (len * 0.65));
    if (isMain) return Math.min(32, Math.max(8, maxFit));
    return Math.round(Math.min(32, Math.max(8, maxFit)) * 0.6);
  };

  const isTextOnly = !card.image;
  // Hide images on small screens for dense grids
  const forceTextOnly = totalCards > 20 && typeof window !== 'undefined' && window.innerWidth < 640;
  const effectivelyTextOnly = isTextOnly || forceTextOnly;

  return (
    <button 
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={cn(
        "relative rounded sm:rounded-lg overflow-hidden flex items-center justify-center select-none transition-all duration-200 border outline-none w-full h-full min-w-0 min-h-0",
        !card.revealed && "bg-amber-50 border-amber-200/80 text-slate-900",
        playable && "hover:ring-2 hover:ring-emerald-400 cursor-pointer active:scale-95",
        markable && !playable && "hover:ring-1 hover:ring-emerald-400/50 cursor-context-menu",
        (!playable && !markable && !card.revealed) && "cursor-default",
        card.revealed && roleColors[card.role],
        card.revealed && "border-transparent"
      )}
    >
      {/* Spymaster overlay */}
      {isSpymaster && !card.revealed && (
        <div className={cn("absolute inset-0.5 sm:inset-1 border sm:border-2 rounded sm:rounded-md opacity-50 pointer-events-none", roleColors[card.role])} />
      )}

      {/* Card content */}
      <div className="relative z-10 w-full h-full flex flex-col justify-center items-center p-0.5 sm:p-1">
        {effectivelyTextOnly ? (
          <svg viewBox="0 0 100 40" preserveAspectRatio="xMidYMid meet" className="w-[94%] h-full overflow-visible">
            <text x="50" y="22" fontSize={calculateFontSize(card.name, true)} fontWeight="900" textAnchor="middle" dominantBaseline="central" fill={card.revealed ? 'white' : '#1e293b'} stroke={card.revealed ? 'none' : 'rgba(30,41,59,0.1)'} strokeWidth="0.3" className="uppercase" style={{ letterSpacing: '0.04em' }}>{card.name}</text>
          </svg>
        ) : (
          <>
            {card.image && <img src={card.image} alt={card.name} className={cn("w-auto max-w-[80%] h-[40%] sm:h-[50%] object-contain", card.revealed && "opacity-50 grayscale")} />}
            <div className="w-[94%] bg-slate-900/85 rounded flex items-center justify-center px-1 py-0.5 absolute bottom-0.5 sm:bottom-1 border border-white/10">
              <svg viewBox="0 0 100 22" preserveAspectRatio="xMidYMid meet" className="w-full h-full overflow-visible">
                <text x="50" y="12" fontSize={calculateFontSize(card.name, true)} fontWeight="900" textAnchor="middle" dominantBaseline="central" fill="white" stroke="rgba(0,0,0,0.4)" strokeWidth="0.5" className="uppercase" style={{ letterSpacing: '0.05em' }}>{card.name}</text>
              </svg>
            </div>
          </>
        )}
      </div>

      {/* Assassin overlay */}
      {card.revealed && card.role === 'assassin' && (
        <div className="absolute inset-0 bg-red-600/20 mix-blend-overlay pointer-events-none flex items-center justify-center">
          <span className="text-2xl sm:text-4xl">❌</span>
        </div>
      )}

      {/* Team marks */}
      {card.marks && card.marks.length > 0 && !card.revealed && (
        <div className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 flex gap-0.5 z-20 pointer-events-none">
          {card.marks.map(team => (
            <div key={team} className={cn("w-2 h-2 sm:w-3 sm:h-3 rounded-full border border-white", roleColors[team]?.split(' ')[0] || 'bg-slate-500')} />
          ))}
        </div>
      )}
    </button>
  );
}
