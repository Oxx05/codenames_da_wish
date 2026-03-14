"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useGameStore, TeamId, Card } from "@/store/gameStore";
import { usePeerStore } from "@/store/peerStore";
import { Check, Send, Users, LogOut, ArrowLeftRight, RefreshCcw, Eye, Play, Crown, Ban, EyeOff, Clock, ShieldAlert, XCircle, BarChart2, Trophy, ArrowUpRight, Copy, CheckCircle, Skull, Menu, X, Volume2, VolumeX, Flag, Hash, Hand, History, MessageCircle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from './Modal';
import { SFX } from '@/lib/sounds';
import { themes } from '@/lib/themes';
import { Confetti } from './Confetti';

export default function GameBoard() {
  const { 
    myPlayerId, players, roomName, isHost,
    cards, remaining, currentTurn, turnPhase, clue, guessesLeft, winner, numTeams,
    theme, totalCards, assassinCount, neutralEndsTurn, opponentEndsTurn, assassinEndsGame, turnTimer, turnEndTime,
    sfxEnabled, toggleSFX, stats,
    chatMessages, clueHistory, addChatMessage, eliminatedTeams
  } = useGameStore();
  const { disconnect, broadcastAction, sendActionToHost } = usePeerStore();

  const me = players.find(p => p.id === myPlayerId);
  const myTeam = me?.team || 'red';
  const myRole = me?.role || 'operative';

  const [clueWord, setClueWord] = useState('');
  const [clueCount, setClueCount] = useState(1);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showStats, setShowStats] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  // Fix 4: flip animation lock
  const flipLockRef = useRef(false);
  const flipLockTimerRef = useRef<NodeJS.Timeout | null>(null);

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
    
    if (sfxEnabled) SFX.cardFlip();

    // Fix 4: flip lock — delay overlay transitions until animation completes
    flipLockRef.current = true;
    if (flipLockTimerRef.current) clearTimeout(flipLockTimerRef.current);
    flipLockTimerRef.current = setTimeout(() => { flipLockRef.current = false; }, 650);
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

  // Turn Timer Loop
  useEffect(() => {
    if (!turnEndTime || turnTimer === 0 || winner) {
      setTimeLeft(null);
      return;
    }

    const interval = setInterval(() => {
      const remainingMs = Math.max(0, turnEndTime - Date.now());
      setTimeLeft(Math.ceil(remainingMs / 1000));

      if (remainingMs <= 0) {
        clearInterval(interval);
        if (isHost && !winner) {
          useGameStore.getState().endTurn();
          broadcastAction({ type: 'END_TURN' } as any);
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [turnEndTime, turnTimer, winner, isHost, broadcastAction]);

  // Sound Effects: Track previously revealed cards with a ref
  const prevCardsRef = useRef(cards);
  
  useEffect(() => {
    if (!sfxEnabled || prevCardsRef.current.length === 0) {
      prevCardsRef.current = cards;
      return;
    }

    const revealedIdx = cards.findIndex((c, i) => c.revealed && !prevCardsRef.current[i]?.revealed);
    if (revealedIdx !== -1) {
      const card = cards[revealedIdx];
      if (card.role === 'assassin') SFX.assassin();
      else if (card.role === 'neutral') SFX.neutral();
      else SFX.correct();
    }
    prevCardsRef.current = cards;
  }, [cards, sfxEnabled]);

  useEffect(() => {
    if (winner) {
      const delay = flipLockRef.current ? 700 : 0;
      const t = setTimeout(() => {
        setShowStats(true);
        if (sfxEnabled) SFX.win();
      }, delay);
      return () => clearTimeout(t);
    }
  }, [winner, sfxEnabled]);

  // Sound Effects: New Clue Notification
  useEffect(() => {
    if (!sfxEnabled || !clue || !clue.word || winner) return;
    SFX.newClue();
  }, [clue, sfxEnabled, winner]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !me) return;
    const msg = {
      id: Date.now().toString(),
      sender: me.name,
      team: me.team,
      text: chatInput.trim(),
      timestamp: Date.now()
    };
    addChatMessage(msg);
    if (isHost) {
      broadcastAction({ type: 'CHAT_MESSAGE', msg } as any);
    } else {
      sendActionToHost({ type: 'CHAT_MESSAGE', msg } as any);
    }
    setChatInput('');
  };

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
  
  const confirmResetLobby = async () => {
    setModalState({ isOpen: false, type: null });
    if (!isHost) return;

    // Instant Restart Logic for Multiplayer (Host only)
    try {
      const store = useGameStore.getState();
      const selectedThemeInfo = themes[theme];
      const allItems = await selectedThemeInfo.fetchData();
      const shuffledItems = [...allItems].sort(() => 0.5 - Math.random());
      const selected = shuffledItems.slice(0, totalCards);

      const roles: TeamId[] = [];
      const teamNames: TeamId[] = numTeams === 2 ? ['red', 'blue'] : numTeams === 3 ? ['red', 'blue', 'green'] : ['red', 'blue', 'green', 'yellow'];
      const firstTurnTeam = (theme === 'pokemon' || !store.savedSetupConfig) ? teamNames[Math.floor(Math.random() * teamNames.length)] : (store.savedSetupConfig.firstTeam === 'random' ? teamNames[Math.floor(Math.random() * teamNames.length)] : store.savedSetupConfig.firstTeam);

      teamNames.forEach(t => {
        const autoPerTeam = Math.floor((totalCards - assassinCount - Math.max(0, 10 - numTeams)) / numTeams);
        const manualCount = store.savedSetupConfig?.cardsPerTeam?.[t as string] || 0;
        const count = (manualCount > 0) ? manualCount : (t === firstTurnTeam ? autoPerTeam + 1 : autoPerTeam);
        for (let i = 0; i < count; i++) roles.push(t as TeamId);
      });
      for (let i = 0; i < assassinCount; i++) roles.push('assassin');
      while (roles.length < totalCards) roles.push('neutral');
      roles.sort(() => 0.5 - Math.random());

      const cards: Card[] = selected.map((item, i) => ({
        name: item.name,
        image: item.image,
        role: roles[i],
        revealed: false
      }));

      store.startGame(cards, firstTurnTeam as TeamId);
      const newState = useGameStore.getState();
      broadcastAction({
        type: 'SYNC_STATE',
        state: { ...newState, mpStatus: 'playing' }
      });
      setShowStats(false);
    } catch (err) {
      console.error("Failed to instant restart lobby:", err);
      // Fallback: traditional reset
      useGameStore.getState().resetLobby();
      broadcastAction({ type: 'RESET_LOBBY' });
    }
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
    <div className={cn(
      "h-[100dvh] bg-slate-950 flex flex-col font-sans overflow-hidden transition-colors duration-1000",
      winner === 'assassin' ? "animate-interference bg-black" : ""
    )}>
      {winner && winner !== 'assassin' && <Confetti />}
      {/* ===== MOBILE HEADER: Single ultra-compact bar ===== */}
      <header className="lg:hidden flex items-center justify-between px-2 py-1 bg-slate-900 border-b border-slate-800 shrink-0 z-10 gap-1.5">
        {/* 1. Hamburger Menu (Far Left) */}
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-1 px-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* 2. Team Scores */}
        <div className="flex gap-1 shrink-0">
          {(['red', 'blue', ...(numTeams >= 3 ? ['green'] : []), ...(numTeams >= 4 ? ['yellow'] : [])] as string[]).map(team => (
            <div key={team} className={cn(
              "flex items-center gap-1 px-1.5 py-0.5 rounded-md text-white font-black text-[10px]",
              teamBgColor[team],
              currentTurn === team && !winner && "ring-1 ring-white/50"
            )}>
              <span className="text-[8px] opacity-80 uppercase font-bold">{team[0]}</span>
              <span>{(remaining as any)[team]}</span>
            </div>
          ))}
        </div>
        
        {/* 3. Center: Role Badge + Turn info (Middle) */}
        <div className="flex-1 flex flex-col items-center justify-center min-w-0 overflow-hidden px-1">
          <span className={cn(
            "text-[7px] font-black uppercase px-1.5 py-0 rounded-sm flex items-center gap-0.5 mb-0.5 shrink-0",
            myTeam === 'red' ? 'bg-red-600/30 text-red-300' :
            myTeam === 'blue' ? 'bg-blue-600/30 text-blue-300' :
            myTeam === 'green' ? 'bg-green-600/30 text-green-300' :
            myTeam === 'yellow' ? 'bg-yellow-600/30 text-yellow-300' :
            'bg-slate-700 text-slate-400'
          )}>
            {myRole === 'spymaster' ? '🔍 spy' : myRole === 'spectator' ? '👁 spec' : '🎯 op'}
          </span>
          {winner ? (
            <span className="text-amber-400 text-[10px] font-black uppercase animate-pulse truncate">
              {winner === 'assassin' ? `💀 ${currentTurn}` : `🏆 ${winner}`}
            </span>
          ) : (
            <div className="flex items-center gap-1 min-w-0">
              {timeLeft !== null && (
                <span className={cn("text-[9px] font-black uppercase flex items-center gap-0.5 shrink-0", timeLeft <= 10 ? 'text-rose-400' : 'text-slate-400')}>
                  {timeLeft}s
                </span>
              )}
              <span className={cn("text-[10px] font-extrabold uppercase truncate", teamTextColor[currentTurn])}>
                {currentTurn} · {turnPhase === 'clue' ? 'Giving Clue' : `Guessing (${guessesLeft} left)`}
              </span>
            </div>
          )}
        </div>

        {/* 4. Actions (Far Right) */}
        <div className="flex gap-0.5 items-center shrink-0">
          <button 
            onClick={toggleSFX}
            className="p-1 text-slate-400 hover:text-white cursor-pointer"
            title={sfxEnabled ? "Mute Sounds" : "Unmute Sounds"}
          >
            {sfxEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-500" />}
          </button>
          {isHost && (
            <button onClick={handleResetLobby} className="p-1 text-slate-400 hover:text-amber-400 cursor-pointer">
              <RefreshCcw className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={handleLeave} className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer">
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
          <div className={cn("px-6 py-1.5 rounded-full border flex flex-col items-center relative",
            currentTurn === 'red' ? 'bg-red-950/40 border-red-500/50' : currentTurn === 'blue' ? 'bg-blue-950/40 border-blue-500/50' : currentTurn === 'green' ? 'bg-green-950/40 border-green-500/50' : 'bg-yellow-950/40 border-yellow-500/50'
          )}>
            <div className="flex items-center gap-2">
              <span className={cn("text-base font-black uppercase tracking-widest", teamTextColor[currentTurn])}>{currentTurn} Team</span>
              {timeLeft !== null && (
                <span className={cn("text-sm font-black flex items-center gap-1 bg-slate-900/50 px-2 py-0.5 rounded-md border border-slate-700/50", timeLeft <= 10 ? 'text-rose-400 animate-pulse border-rose-500/50' : 'text-slate-300')}>
                  <Clock className="w-4 h-4" /> {timeLeft}
                </span>
              )}
            </div>
            <span className="text-xs font-semibold text-slate-400">{turnPhase === 'clue' ? 'Giving Clue' : `Guessing (${guessesLeft} left)`}</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button 
            onClick={toggleSFX}
            className="p-2 text-slate-400 hover:text-white rounded-lg border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
            title={sfxEnabled ? "Mute Sounds" : "Unmute Sounds"}
          >
            {sfxEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-rose-500" />}
          </button>
          <span className={cn(
            "text-xs font-bold uppercase px-3 py-1 rounded-lg border",
            myTeam === 'red' ? 'bg-red-600/20 text-red-300 border-red-500/30' :
            myTeam === 'blue' ? 'bg-blue-600/20 text-blue-300 border-blue-500/30' :
            myTeam === 'green' ? 'bg-green-600/20 text-green-300 border-green-500/30' :
            myTeam === 'yellow' ? 'bg-yellow-600/20 text-yellow-300 border-yellow-500/30' :
            'bg-slate-600/20 text-slate-300 border-slate-500/30'
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
        <aside className="hidden lg:flex flex-col w-56 xl:w-64 bg-slate-900/50 border-r border-slate-800/80 p-4 gap-6 shrink-0 z-20 overflow-y-auto custom-scrollbar">
          <TeamPanel teamId="red" />
          <TeamPanel teamId="blue" />
          {numTeams >= 3 && <TeamPanel teamId="green" />}
          {numTeams >= 4 && <TeamPanel teamId="yellow" />}
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

        {/* Right Side Panel: Room Info & Spectators (Desktop Only) */}
        <aside className="hidden lg:flex flex-col w-56 xl:w-64 bg-slate-900/50 border-l border-slate-800/80 p-4 gap-4 shrink-0 z-20 overflow-y-auto custom-scrollbar">
          <div className="flex flex-col gap-2 bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
            <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest mb-1 flex items-center gap-2">
              <Hash className="w-4 h-4 text-emerald-400" /> Room Info
            </h3>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Room ID</span>
              <span className="text-slate-200 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-700">{roomName}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Teams</span>
              <span className="text-slate-200 font-bold">{numTeams}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Total Cards</span>
              <span className="text-slate-200 font-bold">{totalCards}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium flex items-center gap-1"><ShieldAlert className="w-3 h-3 text-rose-400" /> Assassins</span>
              <span className="text-rose-400 font-bold">{assassinCount}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Theme</span>
              <span className="text-slate-200 font-bold uppercase">{theme}</span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-700/50 flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold">Neutral Ends Turn</span>
                <span className={cn("font-bold px-1.5 py-0.5 rounded text-[10px] uppercase", neutralEndsTurn ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400")}>
                  {neutralEndsTurn ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold">Opponent Ends Turn</span>
                <span className={cn("font-bold px-1.5 py-0.5 rounded text-[10px] uppercase", opponentEndsTurn ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400")}>
                  {opponentEndsTurn ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold">Assassin Ends Game</span>
                <span className={cn("font-bold px-1.5 py-0.5 rounded text-[10px] uppercase", assassinEndsGame ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400")}>
                  {assassinEndsGame ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold">Turn Timer</span>
                <span className="text-slate-200 font-bold">{turnTimer === 0 ? 'Off' : `${turnTimer}s`}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold">Sound Effects</span>
                <span className={cn("font-bold", sfxEnabled ? "text-emerald-400" : "text-slate-500")}>{sfxEnabled ? 'On' : 'Off'}</span>
              </div>
            </div>
          </div>

          {players.some(p => p.role === 'spectator') && (
            <div className="mt-auto pt-6 border-t border-slate-800/50">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Users className="w-3 h-3" /> Spectators
              </h4>
              <div className="flex flex-col gap-1">
                {players.filter(p => p.role === 'spectator').map(p => (
                  <div key={p.id} className="group flex justify-between items-center bg-slate-800/80 text-slate-300 px-2 py-1.5 rounded border border-slate-700/50 text-xs">
                    <span className="truncate">{p.name} {p.id === myPlayerId && <span className="opacity-50 text-[10px]">(You)</span>} {p.isHost && <span className="text-[10px] text-amber-500 font-bold ml-1">★ Host</span>}</span>
                    {isHost && p.id !== myPlayerId && (
                      <div className="hidden group-hover:flex gap-1 shrink-0 ml-2">
                        <button onClick={() => usePeerStore.getState().transferHost(p.name, false)} className="p-1 hover:bg-amber-500/20 text-amber-500 rounded" title="Make Host"><Crown className="w-3 h-3"/></button>
                        <button onClick={() => usePeerStore.getState().kickPlayer(p.id)} className="p-1 hover:bg-rose-500/20 text-rose-500 rounded" title="Kick"><Ban className="w-3 h-3"/></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Clue History */}
          {clueHistory.length > 0 && (
            <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                <History className="w-3 h-3" /> Clue Log
              </h4>
              <div className="flex flex-col gap-1 max-h-32 overflow-y-auto custom-scrollbar">
                {clueHistory.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className={cn("w-2 h-2 rounded-full shrink-0", c.team === 'red' ? 'bg-red-500' : c.team === 'blue' ? 'bg-blue-500' : c.team === 'green' ? 'bg-green-500' : 'bg-yellow-500')} />
                    <span className="font-black text-slate-200 uppercase">{c.word}</span>
                    <span className="text-slate-500 font-bold">{c.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chat */}
          <div className="flex flex-col bg-slate-800/40 rounded-xl border border-slate-700/50 overflow-hidden" style={{ minHeight: '120px', maxHeight: '200px' }}>
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest p-3 pb-1 flex items-center gap-2">
              <MessageCircle className="w-3 h-3" /> Chat
            </h4>
            <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1 custom-scrollbar">
              {chatMessages.length === 0 && <p className="text-[10px] text-slate-600 italic">No messages yet.</p>}
              {chatMessages.map(m => (
                <div key={m.id} className="text-xs">
                  <span className={cn("font-bold", teamTextColor[m.team] || 'text-slate-400')}>{m.sender}: </span>
                  <span className="text-slate-300">{m.text}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSendChat} className="flex border-t border-slate-700/50">
              <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Type..." className="flex-1 bg-transparent text-xs text-slate-200 px-3 py-2 outline-none" maxLength={120} />
              <button type="submit" className="px-3 text-emerald-400 hover:text-emerald-300"><Send className="w-3.5 h-3.5" /></button>
            </form>
          </div>
        </aside>
      </main>

      {/* ===== FOOTER: Ultra compact on mobile ===== */}
      <footer className="bg-slate-900 border-t border-slate-800 px-2 py-1 sm:p-2 lg:p-3 flex justify-center items-center gap-2 sm:gap-3 z-10 shrink-0">
        
        {/* Spymaster Clue Input */}
        {iAmActiveSpymaster && (
          <form onSubmit={handleGiveClue} className="flex gap-1 sm:gap-2 items-center w-full max-w-lg h-9 sm:h-11">
            <input 
              type="text" 
              value={clueWord}
              onChange={e => setClueWord(e.target.value.replace(/[^a-zA-ZÀ-ÿ\s-]/g, ''))}
              placeholder="CLUE" 
              className="flex-1 min-w-0 h-full bg-slate-800 border border-slate-700 text-white px-2 sm:px-3 rounded-lg outline-none focus:border-emerald-500 font-bold uppercase text-xs sm:text-sm"
              maxLength={20}
            />
            <input 
              type="number" min={0} max={cards.length}
              value={clueCount}
              onChange={e => setClueCount(parseInt(e.target.value) || 0)}
              className="w-12 sm:w-16 h-full bg-slate-800 border border-slate-700 text-white px-1 rounded-lg outline-none focus:border-emerald-500 font-bold text-center text-xs sm:text-sm"
            />
            <button 
              type="submit" disabled={!clueWord.trim()} 
              className="h-full bg-emerald-600 hover:bg-emerald-500 text-white px-3 sm:px-5 rounded-lg font-black uppercase text-[10px] sm:text-xs shrink-0 cursor-pointer disabled:opacity-50 flex flex-col items-center justify-center leading-none"
            >
              GIVE
            </button>
          </form>
        )}

        {/* Clue Display */}
        {turnPhase === 'guess' && clue && (
          <div className="flex gap-2 sm:gap-3 items-center h-9 sm:h-11">
            <span className="hidden sm:inline text-slate-400 text-xs font-bold uppercase">Clue:</span>
            <span className="h-full flex items-center justify-center text-sm sm:text-lg font-black text-white bg-slate-800 px-4 rounded-lg uppercase tracking-wider border border-slate-700 leading-none">{clue.word}</span>
            <span className="h-full flex items-center justify-center text-sm sm:text-lg font-black text-emerald-400 bg-slate-800 px-3 rounded-lg border border-slate-700 leading-none">{clue.count}</span>
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
          <div className="hidden lg:flex gap-4 items-center">
            <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 shadow-sm text-xs font-bold uppercase text-slate-300">
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-md border border-emerald-500/30 font-mono shadow-inner shadow-emerald-500/10">LC</kbd> Reveal</span>
              <span className="text-slate-600">/</span>
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded-md border border-amber-500/30 font-mono shadow-inner shadow-amber-500/10">RC</kbd> Mark</span>
            </div>
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

      {/* End Game Overlay & Stats */}
      {winner && showStats && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-700" />
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/50 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 duration-500 flex flex-col">
            
            {/* Header / Winner Banner */}
            <div className={cn(
              "p-8 sm:p-10 text-center relative border-b overflow-hidden",
              winner === 'red' ? 'bg-gradient-to-b from-red-600/40 to-slate-900 border-red-500/50' :
              winner === 'blue' ? 'bg-gradient-to-b from-blue-600/40 to-slate-900 border-blue-500/50' :
              winner === 'green' ? 'bg-gradient-to-b from-green-600/40 to-slate-900 border-green-500/50' :
              winner === 'yellow' ? 'bg-gradient-to-b from-yellow-500/40 to-slate-900 border-yellow-500/50' :
              'bg-gradient-to-b from-rose-950 to-black border-rose-900' // Assassin
            )}>
              {winner === 'assassin' && <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-20 pointer-events-none"></div>}
              {winner !== 'assassin' && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-white/5 blur-3xl rounded-full"></div>}

              {winner === 'assassin' ? (
                <div className="relative z-10">
                  <Zap className="w-20 h-20 text-red-500/80 mx-auto mb-4 animate-bounce drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]" />
                  <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-[0.2em] text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,1)] mb-2">Game Over</h2>
                  <p className="font-bold text-lg text-red-200/80 bg-red-950/50 inline-block px-4 py-1.5 rounded-full border border-red-900 mt-2">
                    The Assassin was found
                  </p>
                </div>
              ) : (
                <div className="relative z-10">
                  <h2 className={cn("text-5xl sm:text-6xl font-black uppercase tracking-[0.15em] mb-4 drop-shadow-md", 
                      winner === 'yellow' ? 'text-yellow-400' : 
                      winner === 'red' ? 'text-red-400' :
                      winner === 'blue' ? 'text-blue-400' :
                      'text-green-400'
                    )}>
                    {winner} Wins!
                  </h2>
                  <p className={cn("font-bold text-lg shadow-inner inline-block px-4 py-1.5 rounded-full border", 
                      winner === 'yellow' ? 'text-slate-900 bg-yellow-400 border-yellow-500' : 
                      'text-white bg-slate-800 border-slate-600'
                    )}>
                    {assassinEndsGame === false && cards.some(c => c.revealed && c.role === 'assassin')
                      ? `Other team found the assassin!`
                      : `Mission Accomplished`}
                  </p>
                </div>
              )}
            </div>
          
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden mt-10">
            <div className="bg-slate-800/50 p-4 border-b border-slate-700 flex justify-between items-center">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-emerald-400" /> Match Stats
              </h3>
              <button 
                onClick={() => setShowStats(false)}
                className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 bg-slate-700/50 px-2 py-1 rounded"
              >
                <Eye className="w-3 h-3" /> Peek Board
              </button>
            </div>
            
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 flex flex-col items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Turns</span>
                  <span className="text-2xl font-black text-white">{stats.turns}</span>
                </div>
                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 flex flex-col items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Clues</span>
                  <span className="text-2xl font-black text-white">{stats.clues}</span>
                </div>
              </div>
              <div className="bg-slate-950/50 rounded-xl border border-slate-800 overflow-hidden">
                <div className="grid grid-cols-3 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-800">
                  <span>Team</span><span className="text-center text-emerald-400">✓ Correct</span><span className="text-center text-rose-400">✗ Wrong</span>
                </div>
                {(['red', 'blue', ...(numTeams >= 3 ? ['green'] : []), ...(numTeams >= 4 ? ['yellow'] : [])] as string[]).map(team => (
                  <div key={team} className="grid grid-cols-3 px-4 py-2.5 items-center border-b border-slate-800/50 last:border-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${team === 'red' ? 'bg-red-500' : team === 'blue' ? 'bg-blue-500' : team === 'green' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                      <span className={cn("text-xs font-bold uppercase tracking-wider", eliminatedTeams.includes(team as any) ? 'text-slate-500 line-through' : 'text-slate-300')}>
                        {team}
                      </span>
                      {eliminatedTeams.includes(team as any) && <Skull className="w-3 h-3 text-rose-500 animate-pulse" />}
                    </div>
                    <span className="text-center text-sm font-black text-emerald-400">{stats.teamStats?.[team]?.correct ?? 0}</span>
                    <span className="text-center text-sm font-black text-rose-400">{stats.teamStats?.[team]?.wrong ?? 0}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-800 flex gap-3">
              {isHost && (
                <button 
                  onClick={handleResetLobby}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl transition-all shadow-lg shadow-emerald-900/20 active:scale-95 flex items-center justify-center gap-2"
                >
                  <RefreshCcw className="w-5 h-5" /> Play Again
                </button>
              )}
              <button 
                onClick={handleLeave}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <LogOut className="w-5 h-5" /> Leave Room
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

      {/* Button to show stats back after peaking */}
      {winner && !showStats && (
        <button 
          onClick={() => setShowStats(true)}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-amber-950 font-black px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom"
        >
          <BarChart2 className="w-5 h-5" /> Show Results
        </button>
      )}

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

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="relative w-72 max-w-[80vw] bg-slate-900 h-full shadow-2xl border-l border-slate-700 flex flex-col animate-in slide-in-from-right overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b border-slate-800">
              <h2 className="text-sm font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                <Hash className="w-4 h-4" /> Room Info
              </h2>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-white bg-slate-800 rounded-full p-1 border border-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 flex flex-col gap-6">
              <div className="flex flex-col gap-3 bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">Room ID</span>
                  <span className="text-slate-200 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-700">{roomName}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">Teams</span>
                  <span className="text-slate-200 font-bold">{numTeams}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">Total Cards</span>
                  <span className="text-slate-200 font-bold">{totalCards}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Assassins</span>
                  <span className="text-rose-400 font-bold">{assassinCount}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">Theme</span>
                  <span className="text-slate-200 font-bold uppercase">{theme}</span>
                </div>
                <div className="mt-1 pt-3 border-t border-slate-700/50 flex flex-col gap-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400 font-bold">Neutral Ends Turn</span>
                    <span className={cn("font-bold px-2 py-1 rounded text-xs uppercase", neutralEndsTurn ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400")}>
                      {neutralEndsTurn ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400 font-bold">Opponent Ends Turn</span>
                    <span className={cn("font-bold px-2 py-1 rounded text-xs uppercase", opponentEndsTurn ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400")}>
                      {opponentEndsTurn ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400 font-bold">Assassin Ends Game</span>
                    <span className={cn("font-bold px-2 py-1 rounded text-xs uppercase", assassinEndsGame ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400")}>
                      {assassinEndsGame ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400 font-bold">Turn Timer</span>
                    <span className="text-slate-200 font-bold">{turnTimer === 0 ? 'Off' : `${turnTimer}s`}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400 font-bold">Sound Effects</span>
                    <button 
                      onClick={toggleSFX}
                      className={cn("px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all", sfxEnabled ? "bg-emerald-500 text-emerald-950" : "bg-slate-700 text-slate-400")}
                    >
                      {sfxEnabled ? 'On' : 'Off'}
                    </button>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400 font-bold">Neutral Ends Turn</span>
                    <button 
                      onClick={() => {
                        if (!isHost) return;
                        useGameStore.getState().toggleGameRule('neutralEndsTurn');
                        broadcastAction({ type: 'SYNC_STATE', state: { neutralEndsTurn: !neutralEndsTurn } });
                      }}
                      className={cn("px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all", neutralEndsTurn ? "bg-emerald-500 text-emerald-950" : "bg-slate-700 text-slate-400", !isHost && "opacity-50 cursor-not-allowed")}
                    >
                      {neutralEndsTurn ? 'On' : 'Off'}
                    </button>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400 font-bold">Opponent Ends Turn</span>
                    <button 
                      onClick={() => {
                        if (!isHost) return;
                        useGameStore.getState().toggleGameRule('opponentEndsTurn');
                        broadcastAction({ type: 'SYNC_STATE', state: { opponentEndsTurn: !opponentEndsTurn } });
                      }}
                      className={cn("px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all", opponentEndsTurn ? "bg-emerald-500 text-emerald-950" : "bg-slate-700 text-slate-400", !isHost && "opacity-50 cursor-not-allowed")}
                    >
                      {opponentEndsTurn ? 'On' : 'Off'}
                    </button>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400 font-bold">Assassin Ends Game</span>
                    <button 
                      onClick={() => {
                        if (!isHost) return;
                        useGameStore.getState().toggleGameRule('assassinEndsGame');
                        broadcastAction({ type: 'SYNC_STATE', state: { assassinEndsGame: !assassinEndsGame } });
                      }}
                      className={cn("px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all", assassinEndsGame ? "bg-emerald-500 text-emerald-950" : "bg-slate-700 text-slate-400", !isHost && "opacity-50 cursor-not-allowed")}
                    >
                      {assassinEndsGame ? 'On' : 'Off'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Match Info */}
              <div className="flex flex-col gap-3 bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Match Info</h3>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Theme</span>
                  <span className="text-white font-black uppercase tracking-wider">{theme}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Assassins</span>
                  <span className="text-rose-500 font-black">{assassinCount}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Total Cards</span>
                  <span className="text-white font-black">{totalCards}</span>
                </div>
              </div>

              {/* Team Progress */}
              <div className="flex flex-col gap-3 bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Progress</h3>
                {(['red', 'blue', ...(numTeams >= 3 ? ['green'] : []), ...(numTeams >= 4 ? ['yellow'] : [])] as string[]).map(team => (
                  <div key={team} className="flex justify-between items-center text-xs">
                     <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${team === 'red' ? 'bg-red-500' : team === 'blue' ? 'bg-blue-500' : team === 'green' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                      <span className="text-slate-400 uppercase font-bold">{team}</span>
                    </div>
                    <span className="text-white font-black">{(remaining as any)[team]} Left</span>
                  </div>
                ))}
              </div>

              {players.some(p => p.role === 'spectator') && (
                <div className="flex flex-col gap-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Users className="w-4 h-4" /> Spectators
                  </h4>
                  <div className="flex flex-col gap-2">
                    {players.filter(p => p.role === 'spectator').map(p => (
                      <div key={p.id} className="flex justify-between items-center bg-slate-800/80 text-slate-300 px-3 py-2.5 rounded-lg border border-slate-700/50 text-sm">
                        <span className="truncate">{p.name} {p.id === myPlayerId && <span className="opacity-50 text-[10px]">(You)</span>} {p.isHost && <span className="text-xs text-amber-500 font-bold ml-1">★ Host</span>}</span>
                        {isHost && p.id !== myPlayerId && (
                          <div className="flex gap-2 ml-2 shrink-0">
                            <button onClick={async () => { await usePeerStore.getState().transferHost(p.name, false); setIsMobileMenuOpen(false); }} className="p-1.5 hover:bg-amber-500/20 text-amber-500 bg-amber-500/10 rounded" title="Make Host"><Crown className="w-4 h-4"/></button>
                            <button onClick={() => { usePeerStore.getState().kickPlayer(p.id); }} className="p-1.5 hover:bg-rose-500/20 text-rose-500 bg-rose-500/10 rounded" title="Kick"><Ban className="w-4 h-4"/></button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Clue History (Mobile) */}
              {clueHistory.length > 0 && (
                <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <History className="w-3.5 h-3.5" /> Clue Log
                  </h4>
                  <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                    {clueHistory.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", c.team === 'red' ? 'bg-red-500' : c.team === 'blue' ? 'bg-blue-500' : c.team === 'green' ? 'bg-green-500' : 'bg-yellow-500')} />
                        <span className="font-black text-slate-200 uppercase">{c.word}</span>
                        <span className="text-slate-500 font-bold">{c.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat (Mobile) */}
              <div className="flex flex-col bg-slate-800/40 rounded-xl border border-slate-700/50 overflow-hidden" style={{ minHeight: '140px', maxHeight: '220px' }}>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest p-3 pb-1 flex items-center gap-2">
                  <MessageCircle className="w-3.5 h-3.5" /> Chat
                </h4>
                <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1 custom-scrollbar">
                  {chatMessages.length === 0 && <p className="text-xs text-slate-600 italic">No messages yet.</p>}
                  {chatMessages.map(m => (
                    <div key={m.id} className="text-sm">
                      <span className={cn("font-bold", teamTextColor[m.team] || 'text-slate-400')}>{m.sender}: </span>
                      <span className="text-slate-300">{m.text}</span>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSendChat} className="flex border-t border-slate-700/50">
                  <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Type a message..." className="flex-1 bg-transparent text-sm text-slate-200 px-3 py-2.5 outline-none" maxLength={120} />
                  <button type="submit" className="px-3 text-emerald-400 hover:text-emerald-300"><Send className="w-4 h-4" /></button>
                </form>
              </div>
            </div>
            
            <div className="mt-auto p-4 border-t border-slate-800">
                {isHost && (
                  <button onClick={() => { setIsMobileMenuOpen(false); handleResetLobby(); }} className="w-full mb-3 px-4 py-3 bg-slate-800 text-slate-300 hover:text-amber-400 border border-slate-700 rounded-xl font-bold flex justify-center items-center gap-2 cursor-pointer shadow-sm">
                    <RefreshCcw className="w-4 h-4" /> Cancel Game
                  </button>
                )}
                <button onClick={() => { setIsMobileMenuOpen(false); handleLeave(); }} className="w-full px-4 py-3 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl font-bold flex justify-center items-center gap-2 cursor-pointer shadow-sm">
                  <LogOut className="w-4 h-4" /> Leave Room
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponent: Team Side Panel (Desktop only)
function TeamPanel({ teamId }: { teamId: TeamId }) {
  const { players, remaining, currentTurn, winner, isHost, myPlayerId } = useGameStore();
  const { kickPlayer, transferHost } = usePeerStore();
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
        <div className="bg-slate-900/80 p-2 rounded-lg text-xs font-bold border border-slate-700/50 flex flex-col gap-2">
          {spymaster ? (
            <div className="group flex justify-between items-center w-full">
              <div className="flex items-center gap-2 truncate">
                <div className={cn("w-2 h-2 rounded-full shrink-0", colors.bg)} />
                <span className="truncate">{spymaster.name} {spymaster.id === myPlayerId && <span className="opacity-50 font-normal">(You)</span>} {spymaster.isHost && <span className="text-[10px] text-amber-500 font-bold ml-1">★ Host</span>}</span>
              </div>
              {isHost && spymaster.id !== myPlayerId && (
                <div className="hidden group-hover:flex gap-1 shrink-0 ml-2">
                  <button onClick={() => transferHost(spymaster.name, false)} className="p-1 hover:bg-amber-500/20 text-amber-500 rounded" title="Make Host"><Crown className="w-3 h-3"/></button>
                  <button onClick={() => kickPlayer(spymaster.id)} className="p-1 hover:bg-rose-500/20 text-rose-500 rounded" title="Kick"><Ban className="w-3 h-3"/></button>
                </div>
              )}
            </div>
          ) : (
            <span className="text-slate-600 italic">None</span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest pl-1">Operatives</span>
        {operatives.map(p => (
          <div key={p.id} className="group bg-slate-900/40 p-2 rounded-lg text-[11px] border border-slate-700/30 flex justify-between items-center">
            <div className="flex items-center gap-2 truncate">
              <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", colors.bg, "opacity-70")} />
              <span className="text-slate-300 truncate">{p.name} {p.id === myPlayerId && <span className="opacity-50">(You)</span>} {p.isHost && <span className="text-[10px] text-amber-500 font-bold ml-1">★ Host</span>}</span>
            </div>
            {isHost && p.id !== myPlayerId && (
              <div className="hidden group-hover:flex gap-1 ml-2 shrink-0">
                <button onClick={() => transferHost(p.name, false)} className="p-1 hover:bg-amber-500/20 text-amber-500 rounded" title="Make Host"><Crown className="w-3 h-3"/></button>
                <button onClick={() => kickPlayer(p.id)} className="p-1 hover:bg-rose-500/20 text-rose-500 rounded" title="Kick"><Ban className="w-3 h-3"/></button>
              </div>
            )}
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
    assassin: 'bg-black border-slate-700 text-white',
  } as any;

  const calculateFontSize = (text: string, isMain: boolean) => {
    const len = text.length;
    const maxFit = Math.floor(95 / (len * 0.65));
    if (isMain) return Math.min(32, Math.max(8, maxFit));
    return Math.round(Math.min(32, Math.max(8, maxFit)) * 0.6);
  };

  const isTextOnly = !card.image;
  const effectivelyTextOnly = isTextOnly;

  // Front face content (unrevealed side)
  const frontContent = (
    <div className="w-full h-full flex flex-col justify-center items-center p-0.5 sm:p-1 relative">
      {/* Spymaster overlay */}
      {isSpymaster && !card.revealed && (
        <div className={cn("absolute inset-0.5 sm:inset-1 border sm:border-2 rounded sm:rounded-md opacity-50 pointer-events-none", roleColors[card.role])} />
      )}
      
      {effectivelyTextOnly ? (
        <svg viewBox="0 0 100 40" preserveAspectRatio="xMidYMid meet" className="w-[94%] h-full overflow-visible">
          <text x="50" y="22" fontSize={calculateFontSize(card.name, true)} fontWeight="900" textAnchor="middle" dominantBaseline="central" fill="#1e293b" stroke="rgba(30,41,59,0.1)" strokeWidth="0.3" className="uppercase" style={{ letterSpacing: '0.04em' }}>{card.name}</text>
        </svg>
      ) : (
        <>
          {card.image && <img src={card.image} alt={card.name} className="w-auto max-w-[80%] h-[40%] sm:h-[50%] object-contain" />}
          <div className="w-[94%] bg-slate-900/85 rounded flex items-center justify-center px-1 py-0.5 absolute bottom-0.5 sm:bottom-1 border border-white/10">
            <svg viewBox="0 0 100 22" preserveAspectRatio="xMidYMid meet" className="w-full h-full overflow-visible">
              <text x="50" y="12" fontSize={calculateFontSize(card.name, true)} fontWeight="900" textAnchor="middle" dominantBaseline="central" fill="white" stroke="rgba(0,0,0,0.4)" strokeWidth="0.5" className="uppercase" style={{ letterSpacing: '0.05em' }}>{card.name}</text>
            </svg>
          </div>
        </>
      )}

      {/* Team marks */}
      {card.marks && card.marks.length > 0 && !card.revealed && (
        <div className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 flex gap-0.5 z-20 pointer-events-none">
          {card.marks.map(team => (
            <div key={team} className={cn("w-2 h-2 sm:w-3 sm:h-3 rounded-full border border-white", roleColors[team]?.split(' ')[0] || 'bg-slate-500')} />
          ))}
        </div>
      )}
    </div>
  );

  // Back face content (revealed side)
  const backContent = (
    <div className={cn("w-full h-full flex flex-col justify-center items-center p-0.5 sm:p-1 relative", roleColors[card.role])}>
      {effectivelyTextOnly ? (
        <svg viewBox="0 0 100 40" preserveAspectRatio="xMidYMid meet" className="w-[94%] h-full overflow-visible">
          <text x="50" y="22" fontSize={calculateFontSize(card.name, true)} fontWeight="900" textAnchor="middle" dominantBaseline="central" fill="white" className="uppercase" style={{ letterSpacing: '0.04em' }}>{card.name}</text>
        </svg>
      ) : (
        <>
          {card.image && <img src={card.image} alt={card.name} className="w-auto max-w-[80%] h-[40%] sm:h-[50%] object-contain opacity-50 grayscale" />}
          <div className="w-[94%] bg-slate-900/85 rounded flex items-center justify-center px-1 py-0.5 absolute bottom-0.5 sm:bottom-1 border border-white/10">
            <svg viewBox="0 0 100 22" preserveAspectRatio="xMidYMid meet" className="w-full h-full overflow-visible">
              <text x="50" y="12" fontSize={calculateFontSize(card.name, true)} fontWeight="900" textAnchor="middle" dominantBaseline="central" fill="white" stroke="rgba(0,0,0,0.4)" strokeWidth="0.5" className="uppercase" style={{ letterSpacing: '0.05em' }}>{card.name}</text>
            </svg>
          </div>
        </>
      )}

      {/* Assassin overlay */}
      {card.role === 'assassin' && (
        <div className="absolute inset-0 bg-red-600/20 mix-blend-overlay pointer-events-none flex items-center justify-center">
          <span className="text-2xl sm:text-4xl">❌</span>
        </div>
      )}
    </div>
  );

  return (
    <button 
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={cn(
        "card-container relative rounded sm:rounded-lg overflow-hidden flex items-center justify-center select-none transition-shadow duration-200 border outline-none w-full h-full min-w-0 min-h-0",
        !card.revealed && "bg-amber-50 border-amber-200/80 text-slate-900",
        card.revealed && "border-transparent",
        playable && "hover:ring-2 hover:ring-emerald-400 cursor-pointer",
        markable && !playable && "hover:ring-1 hover:ring-emerald-400/50 cursor-context-menu",
        (!playable && !markable && !card.revealed) && "cursor-default",
      )}
    >
      <div className={cn("card-inner", card.revealed && "flipped")}>
        <div className="card-face bg-amber-50 rounded sm:rounded-lg">
          {frontContent}
        </div>
        <div className={cn("card-face card-back rounded sm:rounded-lg", roleColors[card.role])}>
          {backContent}
        </div>
      </div>
    </button>
  );
}
