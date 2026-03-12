"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useGameStore, TeamId, Card } from "@/store/gameStore";
import { LogOut, RefreshCcw, Hand, Flag, Clock, Volume2, VolumeX, Trophy, BarChart2, Eye, EyeOff, History, ArrowLeftRight, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from './Modal';
import { SFX } from '@/lib/sounds';

export default function OfflineBoard() {
  const {
    cards, remaining, currentTurn, turnPhase, clue, guessesLeft, winner, numTeams,
    theme, totalCards, assassinCount, neutralEndsTurn, turnTimer, turnEndTime,
    sfxEnabled, toggleSFX, stats,
    clueHistory, offlineVerbalClues
  } = useGameStore();

  // Show/Hide spymaster color overlay — auto-follows phase, but can be toggled manually
  // In offlineVerbalClues mode, the game starts in 'guess' phase so this will default to false (hide map)
  const [showColors, setShowColors] = useState(useGameStore.getState().turnPhase === 'clue');
  const [isHandoff, setIsHandoff] = useState(false); // pass-the-device screen
  const [clueWord, setClueWord] = useState('');
  const [clueCount, setClueCount] = useState(1);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showStats, setShowStats] = useState(true);

  // Track previous turn/phase for auto-switching
  const prevTurnRef = useRef({ turn: currentTurn, phase: turnPhase });

  // Auto-switch colors + show handoff when turn/phase changes
  useEffect(() => {
    const prev = prevTurnRef.current;
    const phaseChanged = prev.phase !== turnPhase;
    const turnChanged = prev.turn !== currentTurn;
    
    if ((phaseChanged || turnChanged) && !winner) {
      if (offlineVerbalClues) {
        setIsHandoff(false);
        setShowColors(false); // Force hide map on turn swap so the next spymaster can safely receive it
      } else {
        // Show handoff screen on transitions
        if (phaseChanged || turnChanged) {
          setIsHandoff(true);
        }
        // Auto-set colors based on phase
        setShowColors(turnPhase === 'clue');
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

  useEffect(() => {
    if (winner) {
      setShowStats(true);
      setIsHandoff(false);
      if (sfxEnabled) SFX.win();
    }
  }, [winner, sfxEnabled]);

  const handleDismissHandoff = () => {
    setIsHandoff(false);
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

  const confirmNewGame = () => {
    useGameStore.getState().disconnect();
    setModalState({ isOpen: false, type: null });
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
    <div className="h-[100dvh] bg-slate-950 flex flex-col font-sans overflow-hidden">
      {/* ===== HEADER ===== */}
      <header className="flex items-center justify-between px-2 py-1.5 sm:px-4 sm:py-2 bg-slate-900 border-b border-slate-800 shrink-0 z-10 gap-2 sm:gap-3">
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
                {offlineVerbalClues ? `${currentTurn} Team` : `${currentTurn} · ${isCluePhase ? 'Giving Clue' : `Guessing (${guessesLeft})`}`}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1 sm:gap-1.5 items-center shrink-0">
          {/* Show/Hide Map toggle */}
          {!winner && (
            <button
              onClick={() => setShowColors(!showColors)}
              className={cn(
                "p-1.5 sm:p-2 rounded-lg border transition-all cursor-pointer flex items-center gap-1",
                showColors
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 hover:bg-amber-500/30'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
              )}
              title={showColors ? "Hide Map (Operative View)" : "Show Map (Spymaster View)"}
            >
              {showColors ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              <span className="hidden sm:inline text-[10px] font-bold uppercase">{showColors ? 'Map' : 'Map'}</span>
            </button>
          )}
          <button onClick={toggleSFX} className="p-1.5 text-slate-400 hover:text-white cursor-pointer" title={sfxEnabled ? "Mute" : "Unmute"}>
            {sfxEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-500" />}
          </button>
          <button onClick={handleNewGame} className="p-1.5 text-slate-400 hover:text-amber-400 cursor-pointer" title="New Game">
            <RefreshCcw className="w-4 h-4" />
          </button>
          <button onClick={handleQuit} className="p-1.5 text-slate-400 hover:text-rose-400 cursor-pointer" title="Quit">
            <LogOut className="w-4 h-4" />
          </button>
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
          </div>

          {/* Map Toggle (Desktop) */}
          {!winner && (
            <button
              onClick={() => setShowColors(!showColors)}
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
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-500">
          <div className="absolute top-10 flex flex-col items-center animate-bounce">
            <Trophy className="w-16 h-16 text-amber-500 mb-2 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
            <h1 className={cn("text-4xl font-black uppercase tracking-tighter", teamTextColor[winner === 'assassin' ? currentTurn : winner])}>
              {winner === 'assassin' ? `${currentTurn} Hit Assassin!` : `${winner} Wins!`}
            </h1>
          </div>
          
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden mt-10">
            <div className="bg-slate-800/50 p-4 border-b border-slate-700 flex justify-between items-center">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-emerald-400" /> Match Stats
              </h3>
              <button onClick={() => setShowStats(false)} className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 bg-slate-700/50 px-2 py-1 rounded cursor-pointer">
                <Eye className="w-3 h-3" /> Peek Board
              </button>
            </div>
            
            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 flex flex-col items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Turns</span>
                <span className="text-2xl font-black text-white">{stats.turns}</span>
              </div>
              <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 flex flex-col items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Clues</span>
                <span className="text-2xl font-black text-white">{stats.clues}</span>
              </div>
              <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 flex flex-col items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Correct</span>
                <span className="text-2xl font-black text-emerald-400">{stats.correctGuesses}</span>
              </div>
              <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 flex flex-col items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Wrong</span>
                <span className="text-2xl font-black text-rose-400">{stats.wrongGuesses}</span>
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

      {/* Modals */}
      <Modal isOpen={modalState.isOpen && modalState.type === 'newgame'} title="New Game?" message="Start a new game? Current progress will be lost." confirmText="New Game" type="danger" onConfirm={confirmNewGame} onCancel={() => setModalState({ isOpen: false, type: null })} />
      <Modal isOpen={modalState.isOpen && modalState.type === 'quit'} title="Quit?" message="Are you sure you want to quit and return to the main menu?" confirmText="Quit" type="danger" onConfirm={confirmQuit} onCancel={() => setModalState({ isOpen: false, type: null })} />
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
  const forceTextOnly = totalCards > 20 && typeof window !== 'undefined' && window.innerWidth < 640;
  const effectivelyTextOnly = isTextOnly || forceTextOnly;

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
