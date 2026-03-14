"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useGameStore, TeamId, Card } from "@/store/gameStore";
import { Check, XCircle, Users, Eye, EyeOff, RotateCcw, Home, Play, ArrowLeftRight, Settings, Trophy, BarChart2, ShieldAlert, Sparkles, User, Sword, Clock, Hash, Skull, X, Volume2, VolumeX, RefreshCcw, LogOut, Hand, History, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from './Modal';
import { SFX } from '@/lib/sounds';
import { themes } from '@/lib/themes';
import { Confetti } from './Confetti';

export default function OfflineBoard() {
  const {
    cards, remaining, currentTurn, turnPhase, clue, guessesLeft, winner, numTeams,
    theme, totalCards, assassinCount, neutralEndsTurn, opponentEndsTurn, assassinEndsGame, turnTimer, turnEndTime,
    sfxEnabled, toggleSFX, stats,
    clueHistory, offlineVerbalClues, eliminatedTeams
  } = useGameStore();

  // Show/Hide spymaster color overlay — auto-follows phase, but can be toggled manually
  // In offlineVerbalClues mode, the game starts in 'guess' phase so this will default to false (hide map)
  const [showColors, setShowColors] = useState(false);
  const [isHandoff, setIsHandoff] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [clueWord, setClueWord] = useState('');
  const [clueCount, setClueCount] = useState(1);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showStats, setShowStats] = useState(true);
  const [confirmShowMap, setConfirmShowMap] = useState(false);
  // Fix 4: flip animation lock — prevents overlays from appearing before flip completes
  const flipLockRef = useRef(false);
  const flipLockTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Fix 5: team-change toast
  const [teamChangeToast, setTeamChangeToast] = useState<string | null>(null);
  const prevTurnToastRef = useRef(currentTurn);
  // Track previous turn/phase for auto-switching
  const prevTurnRef = useRef({ turn: currentTurn, phase: turnPhase });

  // Fix 5: team-change toast in verbal mode
  useEffect(() => {
    if (!offlineVerbalClues || winner) return;
    if (prevTurnToastRef.current !== currentTurn && cards.length > 0) {
      setTeamChangeToast(currentTurn);
      const t = setTimeout(() => setTeamChangeToast(null), 2500);
      return () => clearTimeout(t);
    }
    prevTurnToastRef.current = currentTurn;
  }, [currentTurn, offlineVerbalClues, winner, cards.length]);

  // Auto-switch colors + show handoff when turn/phase changes (Fix 4: respects flip animation lock)
  useEffect(() => {
    const prev = prevTurnRef.current;
    const phaseChanged = prev.phase !== turnPhase;
    const turnChanged = prev.turn !== currentTurn;
    
    if ((phaseChanged || turnChanged) && !winner) {
      const doTransition = () => {
        if (offlineVerbalClues) {
          setIsHandoff(false);
          setShowColors(false);
        } else {
          setIsHandoff(true);
          setShowColors(false);
        }
      };
      if (flipLockRef.current) {
        const delay = setTimeout(doTransition, 700);
        prevTurnRef.current = { turn: currentTurn, phase: turnPhase };
        return () => clearTimeout(delay);
      } else {
        doTransition();
      }
    }
    prevTurnRef.current = { turn: currentTurn, phase: turnPhase };
  }, [currentTurn, turnPhase, winner, offlineVerbalClues]);

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'newgame' | 'quit' | null;
  }>({ isOpen: false, type: null });

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
        if (!winner) {
          useGameStore.getState().endTurn();
        }
      }
    }, 100);
    return () => clearInterval(interval);
  }, [turnEndTime, turnTimer, winner]);

  // Sound Effects
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

  // Sound Effects: New Clue Notification
  useEffect(() => {
    if (!sfxEnabled || !clue || !clue.word || winner) return;
    SFX.newClue();
  }, [clue, sfxEnabled, winner]);

  useEffect(() => {
    if (winner) {
      setTeamChangeToast(null); // Fix: hide toast if it's there
      // Fix 4: delay stats overlay to let the last card flip finish
      const delay = flipLockRef.current ? 700 : 0;
      const t = setTimeout(() => {
        setShowStats(true);
        setIsHandoff(false);
        if (sfxEnabled) SFX.win();
      }, delay);
      return () => clearTimeout(t);
    }
  }, [winner, sfxEnabled]);

  const handleDismissHandoff = () => {
    setIsHandoff(false);
    // Fix 3: in text mode, auto-trigger the map confirm dialog for the spymaster
    if (isCluePhase && !offlineVerbalClues) {
      setConfirmShowMap(true);
    }
  };

  const handleToggleMap = () => {
    if (showColors) {
      setShowColors(false);
      return;
    }
    setConfirmShowMap(true);
  };

  const confirmMapReveal = () => {
    setConfirmShowMap(false);
    setShowColors(true);
  };

  const cancelMapReveal = () => {
    setConfirmShowMap(false);
  };

  const handleGiveClue = (e: React.FormEvent) => {
    e.preventDefault();
    if (turnPhase !== 'clue' || !clueWord.trim()) return;
    useGameStore.getState().giveClue(clueWord.trim().toUpperCase(), clueCount);
    setClueWord('');
    setClueCount(1);
    // Handoff will be triggered by the useEffect on turnPhase change
  };

  const handleCardClick = (index: number) => {
    if (showColors || turnPhase !== 'guess' || cards[index].revealed || winner) return;
    
    if (sfxEnabled) SFX.cardFlip();
    
    // Fix 4: set a flip lock so overlays wait for the card animation to finish (~650ms)
    flipLockRef.current = true;
    if (flipLockTimerRef.current) clearTimeout(flipLockTimerRef.current);
    flipLockTimerRef.current = setTimeout(() => { flipLockRef.current = false; }, 650);
    useGameStore.getState().revealCard(index);
  };

  const handleEndTurn = () => {
    if (turnPhase !== 'guess' || winner) return;
    useGameStore.getState().endTurn();
    // Handoff will be triggered by the useEffect on turn change
  };

  const handleNewGame = () => {
    setModalState({ isOpen: true, type: 'newgame' });
  };

  const confirmNewGame = async () => {
    setModalState({ isOpen: false, type: null });
    // Instant Restart Logic: Re-fetch and re-start using current store config
    const store = useGameStore.getState();
    const { theme, numTeams, totalCards, assassinCount, cardsPerTeam, firstTeam, neutralEndsTurn, opponentEndsTurn, assassinEndsGame, turnTimer, offlineVerbalClues } = store;
    
    // Show a quick loader if possible, or just proceed
    try {
      const selectedThemeInfo = themes[theme];
      const allItems = await selectedThemeInfo.fetchData();
      const shuffledItems = [...allItems].sort(() => 0.5 - Math.random());
      const selected = shuffledItems.slice(0, totalCards);

      const roles: TeamId[] = [];
      const teamNames: TeamId[] = numTeams === 2 ? ['red', 'blue'] : numTeams === 3 ? ['red', 'blue', 'green'] : ['red', 'blue', 'green', 'yellow'];
      const firstTurnTeam = firstTeam === 'random' ? teamNames[Math.floor(Math.random() * teamNames.length)] : firstTeam;

      teamNames.forEach(t => {
        const autoPerTeam = Math.floor((totalCards - assassinCount - Math.max(0, 10 - numTeams)) / numTeams);
        const manualCount = cardsPerTeam[t as string];
        const count = (manualCount && manualCount > 0) ? manualCount : (t === firstTurnTeam ? autoPerTeam + 1 : autoPerTeam);
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

      store.startGame(cards, firstTurnTeam);
      setShowStats(false);
      setIsMobileMenuOpen(false);
    } catch (err) {
      console.error("Failed to instant restart:", err);
      store.disconnect(); // Fallback to menu if fetch fails
    }
  };

  const handleQuit = () => {
    setModalState({ isOpen: true, type: 'quit' });
  };

  const confirmQuit = () => {
    useGameStore.getState().disconnect();
    setModalState({ isOpen: false, type: null });
  };

  // Colors
  const teamBgColor: Record<string, string> = {
    red: 'bg-red-600', blue: 'bg-blue-600', green: 'bg-green-600', yellow: 'bg-yellow-500',
  };
  const teamTextColor: Record<string, string> = {
    red: 'text-red-400', blue: 'text-blue-400', green: 'text-green-400', yellow: 'text-yellow-400',
  };

  const getGridCols = (total: number): number => {
    const sqrt = Math.sqrt(total);
    return Math.ceil(sqrt);
  };

  const numCols = getGridCols(cards.length);
  const numRows = Math.ceil(cards.length / numCols);

  const isCluePhase = turnPhase === 'clue';
  const isGuessPhase = turnPhase === 'guess';

  // Pass-the-device handoff screen
  if (isHandoff && !winner) {
    const viewLabel = isCluePhase ? '🔍 Spymaster' : '🎯 Operatives';
    return (
      <div className="h-[100dvh] bg-slate-950 flex flex-col items-center justify-center gap-8 p-6 font-sans text-center">
        <div className="animate-pulse">
          <ArrowLeftRight className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-wider text-white">
          Pass the Device!
        </h1>
        <div className={cn(
          "text-xl sm:text-2xl font-black uppercase px-6 py-3 rounded-2xl border-2",
          currentTurn === 'red' ? 'bg-red-600/20 text-red-400 border-red-500/50' :
          currentTurn === 'blue' ? 'bg-blue-600/20 text-blue-400 border-blue-500/50' :
          currentTurn === 'green' ? 'bg-green-600/20 text-green-400 border-green-500/50' :
          'bg-yellow-600/20 text-yellow-400 border-yellow-500/50'
        )}>
          {currentTurn.toUpperCase()} TEAM
        </div>
        <p className="text-slate-400 text-sm sm:text-base max-w-sm">
          Hand the device to the <span className="font-bold text-white">{viewLabel}</span> of the <span className={cn("font-bold", teamTextColor[currentTurn])}>{currentTurn}</span> team.
        </p>
        <button
          onClick={handleDismissHandoff}
          className="mt-4 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-lg uppercase tracking-wider px-10 py-4 rounded-2xl shadow-2xl shadow-emerald-900/30 transition-all active:scale-95 cursor-pointer flex items-center gap-3"
        >
          {isCluePhase ? <Eye className="w-6 h-6" /> : <EyeOff className="w-6 h-6" />}
          I&apos;m Ready
        </button>
      </div>
    );
  }

  return (
    <div className={cn(
      "h-[100dvh] bg-slate-950 flex flex-col font-sans overflow-hidden transition-colors duration-1000",
      winner === 'assassin' ? "animate-interference bg-black" : ""
    )}>
      {winner && winner !== 'assassin' && <Confetti />}
      {/* Fix 5 & refine: Team change toast without emojis, with a close button */}
      {teamChangeToast && (
        <div className={cn(
          "fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl font-black uppercase tracking-wider text-lg shadow-2xl border-2 transition-all animate-in slide-in-from-top flex items-center gap-4",
          teamChangeToast === 'red' ? 'bg-red-600/90 text-white border-red-400' :
          teamChangeToast === 'blue' ? 'bg-blue-600/90 text-white border-blue-400' :
          teamChangeToast === 'green' ? 'bg-green-600/90 text-white border-green-400' :
          'bg-yellow-500/90 text-slate-900 border-yellow-300'
        )}>
          <span>{teamChangeToast.toUpperCase()} TEAM'S TURN!</span>
          <button onClick={() => setTeamChangeToast(null)} className="opacity-70 hover:opacity-100 hover:scale-110 transition-all p-1" title="Close"><X className="w-5 h-5" /></button>
        </div>
      )}
      {/* ===== HEADER ===== */}
      <header className="flex items-center justify-between px-2 py-1.5 sm:px-4 sm:py-2 bg-slate-900 border-b border-slate-800 shrink-0 z-10 gap-2 sm:gap-3">
        {/* Hamburger (Mobile) */}
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="lg:hidden p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 shrink-0 cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Team Scores */}
        <div className="flex gap-1 sm:gap-2 shrink-0">
          {(['red', 'blue', ...(numTeams >= 3 ? ['green'] : []), ...(numTeams >= 4 ? ['yellow'] : [])] as string[]).map(team => (
            <div key={team} className={cn(
              "flex items-center gap-1 px-1.5 py-0.5 sm:px-3 sm:py-1 rounded-md sm:rounded-lg text-white font-black text-[10px] sm:text-sm",
              teamBgColor[team],
              currentTurn === team && !winner && "ring-1 sm:ring-2 ring-white/50"
            )}>
              <span className="text-[8px] sm:text-[10px] opacity-80 uppercase font-bold">{team[0]}</span>
              <span>{(remaining as any)[team]}</span>
            </div>
          ))}
        </div>

        {/* Center: Turn info */}
        <div className="flex-1 flex flex-col items-center justify-center min-w-0 overflow-hidden px-1">
          {winner ? (
            <span className="text-amber-400 text-xs sm:text-sm font-black uppercase animate-pulse truncate">
              {winner === 'assassin' ? `💀 ${currentTurn} hit assassin!` : `🏆 ${winner} wins!`}
            </span>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              {timeLeft !== null && (
                <span className={cn("text-[9px] sm:text-xs font-black flex items-center gap-0.5 shrink-0", timeLeft <= 10 ? 'text-rose-400' : 'text-slate-400')}>
                  {timeLeft}s
                </span>
              )}
              <span className={cn("text-xs sm:text-sm font-extrabold uppercase truncate", teamTextColor[currentTurn])}>
                {offlineVerbalClues ? `${currentTurn} Team` : `${currentTurn} · ${isCluePhase ? 'Giving Clue' : `Guessing (${guessesLeft} left)`}`}
              </span>
            </div>
          )}
        </div>

        {/* Actions Area */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            onClick={handleToggleMap}
            className={cn(
              "p-2 rounded-lg border transition-all cursor-pointer flex items-center gap-1",
              showColors
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 hover:bg-amber-500/30'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
            )}
            title="Spymaster Map (Requires Confirmation)"
          >
            {showColors ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span className="hidden sm:inline text-[10px] font-bold uppercase">Map</span>
          </button>
          
          <button onClick={toggleSFX} className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 cursor-pointer" title={sfxEnabled ? "Mute" : "Unmute"}>
            {sfxEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-500" />}
          </button>

          <div className="hidden lg:flex gap-1.5 items-center ml-2 border-l border-slate-800 pl-3">
            <button onClick={handleNewGame} className="p-1.5 text-slate-400 hover:text-amber-400 cursor-pointer" title="New Game">
              <RefreshCcw className="w-4 h-4" />
            </button>
            <button onClick={handleQuit} className="p-1.5 text-slate-400 hover:text-rose-400 cursor-pointer" title="Quit">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ===== MAIN GAME AREA ===== */}
      <main className="flex-1 min-h-0 w-full flex flex-row items-stretch overflow-hidden relative">
        
        {/* Side panel (Desktop) */}
        <aside className="hidden lg:flex flex-col w-56 xl:w-64 bg-slate-900/50 border-r border-slate-800/80 p-4 gap-4 shrink-0 z-20 overflow-y-auto custom-scrollbar">
          {/* Game Info */}
          <div className="flex flex-col gap-2 bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
            <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest mb-1 flex items-center gap-2">
              📡 Offline Game
            </h3>
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
            </div>
          </div>

          {/* Map Toggle (Desktop) */}
          {!winner && (
            <button
              onClick={handleToggleMap}
              className={cn(
                "w-full p-3 rounded-xl border-2 text-center font-black uppercase tracking-wider text-sm transition-all cursor-pointer",
                showColors
                  ? 'bg-amber-500/10 border-amber-500/50 text-amber-400 hover:bg-amber-500/20'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
              )}
            >
              {showColors ? '🔍 Map Visible' : '🎯 Map Hidden'}
              <span className="block text-[10px] font-bold text-slate-500 mt-1">Click to toggle</span>
            </button>
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
        </aside>

        {/* Center Grid Area */}
        <div className="flex-1 min-w-0 flex items-stretch p-0.5 sm:p-1 lg:p-3 overflow-hidden">
          <div
            className="w-full h-full grid gap-[2px] sm:gap-1 lg:gap-1.5"
            style={{
              gridTemplateColumns: `repeat(${numCols}, 1fr)`,
              gridTemplateRows: `repeat(${numRows}, 1fr)`,
            }}
          >
            {cards.map((card, idx) => (
              <OfflineCardItem
                key={idx}
                card={card}
                isSpymaster={showColors || winner !== null}
                onClick={() => handleCardClick(idx)}
                playable={!showColors && isGuessPhase && !card.revealed && !winner}
                totalCards={cards.length}
              />
            ))}
          </div>
        </div>
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="bg-slate-900 border-t border-slate-800 px-2 py-2 sm:py-2.5 lg:py-3 flex justify-center items-center gap-2 sm:gap-3 z-10 shrink-0 min-h-[48px]">
        
        {/* Spymaster Clue Input */}
        {showColors && isCluePhase && !winner && (
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

        {/* Clue Display (for operatives) */}
        {isGuessPhase && clue && !offlineVerbalClues && (
          <div className="flex gap-2 sm:gap-3 items-center h-9 sm:h-11">
            <span className="hidden sm:inline text-slate-400 text-xs font-bold uppercase">Clue:</span>
            <span className="h-full flex items-center justify-center text-sm sm:text-lg font-black text-white bg-slate-800 px-4 rounded-lg uppercase tracking-wider border border-slate-700 leading-none">{clue.word}</span>
            <span className="h-full flex items-center justify-center text-sm sm:text-lg font-black text-emerald-400 bg-slate-800 px-3 rounded-lg border border-slate-700 leading-none">{clue.count}</span>
          </div>
        )}

        {/* End Turn */}
        {!showColors && isGuessPhase && !winner && (
          <button onClick={handleEndTurn} className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-1.5 sm:px-6 sm:py-2 rounded-lg shadow-lg flex items-center gap-1.5 text-xs sm:text-sm shrink-0 cursor-pointer">
            <Hand className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> End Turn
          </button>
        )}

        {/* Spymaster waiting hint */}
        {showColors && isGuessPhase && !winner && (
          <span className="text-slate-500 text-xs font-medium flex items-center gap-1.5">
            {offlineVerbalClues ? 'Discuss & Guess...' : 'Operatives are guessing...'} <span className="text-[10px] text-slate-600">(hide map to play)</span>
          </span>
        )}

        {/* Clue phase with map hidden — prompt to show */}
        {!showColors && isCluePhase && !winner && (
          <span className="text-slate-500 text-xs font-medium flex items-center gap-1.5">
            Spymaster: show the map to give a clue
          </span>
        )}

        {/* Winner */}
        {winner && (
          <button onClick={handleNewGame} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-1.5 sm:px-6 sm:py-2 rounded-lg text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer animate-bounce">
            <RefreshCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> New Game
          </button>
        )}
      </footer>

      {/* End Game Overlay & Stats */}
      {winner && showStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/50 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 duration-500">
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
                  <Skull className="w-20 h-20 text-red-500/80 mx-auto mb-4 animate-bounce drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]" />
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
                    {assassinEndsGame === false && currentTurn !== winner && cards.some(c => c.revealed && c.role === 'assassin')
                      ? `Other team found the assassin!`
                      : `Mission Accomplished`}
                  </p>
                </div>
              )}
            </div>
            
            <div className="bg-slate-800/50 p-4 border-b border-slate-700 flex justify-between items-center">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-emerald-400" /> Match Stats
              </h3>
              <button onClick={() => setShowStats(false)} className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 bg-slate-700/50 px-2 py-1 rounded cursor-pointer">
                <Eye className="w-3 h-3" /> Peek Board
              </button>
            </div>
            
            <div className="p-4 space-y-3">
              {/* Summary row */}
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
              {/* Per-team breakdown */}
              <div className="bg-slate-950/50 rounded-xl border border-slate-800 overflow-hidden">
                <div className="grid grid-cols-3 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-800">
                  <span>Team</span><span className="text-center text-emerald-400">✓ Correct</span><span className="text-center text-rose-400">✗ Wrong</span>
                </div>
                {(['red', 'blue', ...(numTeams >= 3 ? ['green'] : []), ...(numTeams >= 4 ? ['yellow'] : [])] as string[]).map(team => (
                  <div key={team} className="grid grid-cols-3 px-4 py-2.5 items-center border-b border-slate-800/50 last:border-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${team === 'red' ? 'bg-red-500' : team === 'blue' ? 'bg-blue-500' : team === 'green' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                      <span className={cn("text-xs font-bold uppercase", eliminatedTeams.includes(team as any) ? 'text-slate-500 line-through' : 'text-slate-300')}>
                        {team}
                      </span>
                      {eliminatedTeams.includes(team as any) && <Skull className="w-3 h-3 text-rose-500" />}
                    </div>
                    <span className="text-center text-sm font-black text-emerald-400">{stats.teamStats?.[team]?.correct ?? 0}</span>
                    <span className="text-center text-sm font-black text-rose-400">{stats.teamStats?.[team]?.wrong ?? 0}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-800 flex gap-3">
              <button onClick={confirmNewGame} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl transition-all shadow-lg shadow-emerald-900/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer">
                <RefreshCcw className="w-5 h-5" /> New Game
              </button>
              <button onClick={confirmQuit} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer">
                <LogOut className="w-5 h-5" /> Quit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Button to show stats back */}
      {winner && !showStats && (
        <button onClick={() => setShowStats(true)} className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-amber-950 font-black px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom cursor-pointer">
          <BarChart2 className="w-5 h-5" /> Show Results
        </button>
      )}

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="relative w-72 max-w-[80vw] bg-slate-900 h-full shadow-2xl border-l border-slate-700 flex flex-col animate-in slide-in-from-right overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b border-slate-800">
              <h2 className="text-sm font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                <Menu className="w-4 h-4" /> Game Menu
              </h2>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-white bg-slate-800 rounded-full p-1 border border-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 flex flex-col gap-6">
              {/* Settings */}
              <div className="flex flex-col gap-3 bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Settings</h3>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400 font-bold">Verbal Clues</span>
                  <button 
                    onClick={() => { useGameStore.getState().setOfflineVerbalClues(!offlineVerbalClues); }}
                    className={cn("px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all", offlineVerbalClues ? "bg-emerald-500 text-emerald-950" : "bg-slate-700 text-slate-400")}
                  >
                    {offlineVerbalClues ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
                {!winner && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400 font-bold">Spymaster Map</span>
                    <button 
                      onClick={() => { handleToggleMap(); setIsMobileMenuOpen(false); }}
                      className={cn("px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all", showColors ? "bg-amber-500 text-amber-950" : "bg-slate-700 text-slate-400")}
                    >
                      {showColors ? 'Showing' : 'Hidden'}
                    </button>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400 font-bold">Neutral Ends Turn</span>
                  <button 
                    onClick={() => useGameStore.getState().toggleGameRule('neutralEndsTurn')}
                    className={cn("px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all", neutralEndsTurn ? "bg-emerald-500 text-emerald-950" : "bg-slate-700 text-slate-400")}
                  >
                    {neutralEndsTurn ? 'On' : 'Off'}
                  </button>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400 font-bold">Opponent Ends Turn</span>
                  <button 
                    onClick={() => useGameStore.getState().toggleGameRule('opponentEndsTurn')}
                    className={cn("px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all", opponentEndsTurn ? "bg-emerald-500 text-emerald-950" : "bg-slate-700 text-slate-400")}
                  >
                    {opponentEndsTurn ? 'On' : 'Off'}
                  </button>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400 font-bold">Assassin Ends Game</span>
                  <button 
                    onClick={() => useGameStore.getState().toggleGameRule('assassinEndsGame')}
                    className={cn("px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all", assassinEndsGame ? "bg-emerald-500 text-emerald-950" : "bg-slate-700 text-slate-400")}
                  >
                    {assassinEndsGame ? 'On' : 'Off'}
                  </button>
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
                    <span className="text-white font-black">{remaining[team as TeamId]} Left</span>
                  </div>
                ))}
              </div>

              {/* Danger Zone */}
              <div className="flex flex-col gap-3 mt-auto">
                <button onClick={() => { setIsMobileMenuOpen(false); handleNewGame(); }} className="w-full px-4 py-3 bg-slate-800 text-slate-300 hover:text-amber-400 border border-slate-700 rounded-xl font-bold flex justify-center items-center gap-2 cursor-pointer transition-colors">
                  <RefreshCcw className="w-4 h-4" /> Start New Game
                </button>
                <button onClick={() => { setIsMobileMenuOpen(false); handleQuit(); }} className="w-full px-4 py-3 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl font-bold flex justify-center items-center gap-2 cursor-pointer transition-colors">
                  <LogOut className="w-4 h-4" /> Exit to Menu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <Modal isOpen={modalState.isOpen && modalState.type === 'newgame'} title="New Game?" message="Start a new game? Current progress will be lost." confirmText="New Game" type="danger" onConfirm={confirmNewGame} onCancel={() => setModalState({ isOpen: false, type: null })} />
      <Modal isOpen={modalState.isOpen && modalState.type === 'quit'} title="Quit?" message="Are you sure you want to quit and return to the main menu?" confirmText="Quit" type="danger" onConfirm={confirmQuit} onCancel={() => setModalState({ isOpen: false, type: null })} />
      <Modal isOpen={confirmShowMap} title="Show Map?" message="Reveal the spymaster map now? Make sure only the spymaster can see the screen." confirmText="Show Map" type="confirm" onConfirm={confirmMapReveal} onCancel={cancelMapReveal} />
    </div>
  );
}

// Offline Card Item
function OfflineCardItem({ card, isSpymaster, onClick, playable, totalCards }: {
  card: Card;
  isSpymaster: boolean;
  onClick: () => void;
  playable: boolean;
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

  const frontContent = (
    <div className="w-full h-full flex flex-col justify-center items-center p-0.5 sm:p-1 relative">
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
    </div>
  );

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
      className={cn(
        "card-container relative rounded sm:rounded-lg overflow-hidden flex items-center justify-center select-none transition-shadow duration-200 border outline-none w-full h-full min-w-0 min-h-0",
        !card.revealed && "bg-amber-50 border-amber-200/80 text-slate-900",
        card.revealed && "border-transparent",
        playable && "hover:ring-2 hover:ring-emerald-400 cursor-pointer",
        !playable && !card.revealed && "cursor-default",
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
