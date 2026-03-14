"use client";

import { useState } from "react";
import { useGameStore, TeamId, Card } from "@/store/gameStore";
import { themes, ThemeId, ThemeItem } from "@/lib/themes";
import { Settings, Play, AlertTriangle, WifiOff, ArrowLeft } from "lucide-react";

interface OfflineSetupProps {
  onBack: () => void;
}

export default function OfflineSetup({ onBack }: OfflineSetupProps) {
  const savedConfig = useGameStore.getState().savedSetupConfig;
  
  const [theme, setTheme] = useState<ThemeId>(useGameStore.getState().theme || 'pokemon');
  const [numTeams, setNumTeams] = useState(savedConfig.numTeams);
  const [totalCards, setTotalCards] = useState(savedConfig.totalCards);
  const [assassinCount, setAssassinCount] = useState(savedConfig.assassinCount);
  const [cardsPerTeam, setCardsPerTeam] = useState<Record<string, number>>(savedConfig.cardsPerTeam || { red: 0, blue: 0, green: 0, yellow: 0 });
  const [firstTeam, setFirstTeam] = useState<TeamId | 'random'>(savedConfig.firstTeam);
  const [neutralEndsTurn, setNeutralEndsTurn] = useState(savedConfig.neutralEndsTurn);
  const [opponentEndsTurn, setOpponentEndsTurn] = useState(savedConfig.opponentEndsTurn);
  const [assassinEndsGame, setAssassinEndsGame] = useState(savedConfig.assassinEndsGame);
  const [turnTimer, setTurnTimer] = useState(savedConfig.turnTimer);
  const [offlineVerbalClues, setOfflineVerbalClues] = useState(savedConfig.offlineVerbalClues);
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [error, setError] = useState('');
  const [tempValues, setTempValues] = useState<Record<string, string>>({});

  const selectedThemeInfo = themes[theme];
  const maxAvailable = selectedThemeInfo?.maxCards || 60;

  const totalRequired = (numTeams * 1) + 1 + assassinCount;
  
  let manualSum = 0;
  let usingManual = false;
  const teamNamesCheck = numTeams === 2 ? ['red', 'blue'] : numTeams === 3 ? ['red', 'blue', 'green'] : ['red', 'blue', 'green', 'yellow'];
  teamNamesCheck.forEach(t => {
     if (cardsPerTeam[t] && cardsPerTeam[t] > 0) {
       manualSum += cardsPerTeam[t];
       usingManual = true;
     }
  });

  const isValidGame = totalCards <= maxAvailable && 
                      totalCards >= totalRequired && 
                      assassinCount < totalCards && 
                      numTeams >= 2 && numTeams <= 4 &&
                      (!usingManual || (manualSum + assassinCount <= totalCards));

  const handleStartGame = async () => {
    if (!isValidGame) return;
    setIsLoading(true);
    setLoadingText(selectedThemeInfo.loaderText);
    setError('');

    try {
      const allItems = await selectedThemeInfo.fetchData();
      const shuffledItems = [...allItems].sort(() => 0.5 - Math.random());
      const selected = shuffledItems.slice(0, totalCards);

      // Fill roles array
      const roles: TeamId[] = [];
      const teamNames: TeamId[] = numTeams === 2 ? ['red', 'blue'] : numTeams === 3 ? ['red', 'blue', 'green'] : ['red', 'blue', 'green', 'yellow'];
      const firstTurnTeam = firstTeam === 'random' ? teamNames[Math.floor(Math.random() * teamNames.length)] : firstTeam;

      teamNames.forEach(t => {
        const autoPerTeam = Math.floor((totalCards - assassinCount - Math.max(0, 10 - numTeams)) / numTeams);
        const manualCount = cardsPerTeam[t as string];
        const count = (manualCount && manualCount > 0) ? manualCount : (t === firstTurnTeam ? autoPerTeam + 1 : autoPerTeam);
        for (let i = 0; i < count; i++) roles.push(t);
      });
      for (let i = 0; i < assassinCount; i++) roles.push('assassin');
      while (roles.length < totalCards) roles.push('neutral');

      // Shuffle roles
      roles.sort(() => 0.5 - Math.random());

      // Create cards
      const cards: Card[] = selected.map((item, i) => ({
        name: item.name,
        image: item.image,
        role: roles[i],
        revealed: false
      }));

      // Configure store for offline game
      const store = useGameStore.getState();
      store.updateSettings({ theme, numTeams, totalCards, assassinCount, cardsPerTeam, firstTeam, neutralEndsTurn, opponentEndsTurn, assassinEndsGame, turnTimer, offlineVerbalClues });
      store.startGame(cards, firstTurnTeam);
      // Mark as offline mode
      useGameStore.setState({ 
        mpStatus: 'playing',
        isHost: true,
        roomName: 'offline',
        myPlayerId: 'offline-player',
        players: []
      });

    } catch (err: any) {
      console.error("Failed to start offline game:", err);
      setError(err.message || "Failed to load theme data. Check your internet connection.");
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6">
        <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-300 text-lg font-semibold animate-pulse">{loadingText}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center p-4 sm:p-8 font-sans text-white">
      <div className="w-full max-w-lg">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={onBack}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider flex items-center gap-3">
              <WifiOff className="w-7 h-7 text-amber-400" />
              <span className="text-white">Offline Mode</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">Pass & play on one device</p>
          </div>
        </div>

        {/* Settings Card */}
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 shadow-2xl space-y-6">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Settings className="w-4 h-4" /> Game Settings
          </h3>

          {/* Theme */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Theme</label>
              <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20">Max: {maxAvailable} cards</span>
            </div>
            <select
              value={theme}
              onChange={e => {
                const newTheme = e.target.value as ThemeId;
                setTheme(newTheme);
                const newMax = themes[newTheme]?.maxCards || 60;
                if (totalCards > newMax) setTotalCards(newMax);
              }}
              className="w-full bg-slate-950 border-2 border-slate-800 hover:border-emerald-500/50 rounded-xl px-4 py-3 text-sm font-bold outline-none cursor-pointer transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 shadow-inner"
            >
              {Object.values(themes).map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Teams / Cards / Assassins */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wide text-center">Teams</label>
              <input
                type="number" min={2} max={4}
                value={tempValues.numTeams ?? numTeams}
                onChange={e => {
                  const raw = e.target.value;
                  setTempValues(prev => ({ ...prev, numTeams: raw }));
                  const val = parseInt(raw);
                  if (!isNaN(val) && val >= 2 && val <= 4) setNumTeams(val);
                }}
                onBlur={() => setTempValues(prev => { const { numTeams: _, ...rest } = prev; return rest; })}
                className="w-full bg-slate-950 border-2 border-slate-800 hover:border-emerald-500/50 rounded-xl px-4 py-3 text-base text-center font-black outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 cursor-pointer shadow-inner"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wide text-center">Cards</label>
              <input
                type="number" min={numTeams + 1} max={maxAvailable}
                value={tempValues.totalCards ?? totalCards}
                onChange={e => {
                  const raw = e.target.value;
                  setTempValues(prev => ({ ...prev, totalCards: raw }));
                  const val = parseInt(raw);
                  if (!isNaN(val) && val >= (numTeams + 1) && val <= maxAvailable) setTotalCards(val);
                }}
                onBlur={() => setTempValues(prev => { const { totalCards: _, ...rest } = prev; return rest; })}
                className="w-full bg-slate-950 border-2 border-slate-800 hover:border-emerald-500/50 rounded-xl px-4 py-3 text-base text-center font-black outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 cursor-pointer shadow-inner"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wide text-center">Assassins</label>
              <input
                type="number" min={0} max={Math.max(0, totalCards - numTeams - 1)}
                value={tempValues.assassinCount ?? assassinCount}
                onChange={e => {
                  const raw = e.target.value;
                  setTempValues(prev => ({ ...prev, assassinCount: raw }));
                  const val = parseInt(raw);
                  const max = Math.max(0, totalCards - numTeams - 1);
                  if (!isNaN(val) && val >= 0 && val <= max) setAssassinCount(val);
                }}
                onBlur={() => setTempValues(prev => { const { assassinCount: _, ...rest } = prev; return rest; })}
                className="w-full bg-slate-950 border-2 border-slate-800 hover:border-emerald-500/50 rounded-xl px-4 py-3 text-base text-center font-black outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 cursor-pointer shadow-inner"
              />
            </div>
          </div>

          {/* First Team */}
          <div className="pt-4 border-t border-slate-700/50">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">First Team</label>
            </div>
            <select
              value={firstTeam}
              onChange={e => setFirstTeam(e.target.value as any)}
              className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl px-4 py-3 text-base outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-black uppercase tracking-wider text-center cursor-pointer"
            >
              <option value="random">Random 🎲</option>
              <option value="red">Red 🔴</option>
              <option value="blue">Blue 🔵</option>
              {numTeams >= 3 && <option value="green">Green 🟢</option>}
              {numTeams >= 4 && <option value="yellow">Yellow 🟡</option>}
            </select>
          </div>

          {/* Neutral Ends Turn Toggle */}
          <div className="pt-4 border-t border-slate-700/50 flex justify-between items-center">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">Neutral Tile</label>
              <span className="text-[10px] text-slate-500">Ends turn when guessed?</span>
            </div>
            <button
              onClick={() => setNeutralEndsTurn(!neutralEndsTurn)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 cursor-pointer ${neutralEndsTurn ? 'bg-emerald-500' : 'bg-slate-700'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${neutralEndsTurn ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Opponent Ends Turn Toggle */}
          <div className="pt-4 border-t border-slate-700/50 flex justify-between items-center">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">Opponent Tile</label>
              <span className="text-[10px] text-slate-500">Ends turn when guessed?</span>
            </div>
            <button
              onClick={() => setOpponentEndsTurn(!opponentEndsTurn)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 cursor-pointer ${opponentEndsTurn ? 'bg-emerald-500' : 'bg-slate-700'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${opponentEndsTurn ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Assassin Ends Game Toggle */}
          <div className="pt-4 border-t border-slate-700/50 flex justify-between items-center">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">Assassin</label>
              <span className="text-[10px] text-slate-500">Game over for all teams?</span>
            </div>
            <button
              onClick={() => setAssassinEndsGame(!assassinEndsGame)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 cursor-pointer ${assassinEndsGame ? 'bg-emerald-500' : 'bg-slate-700'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${assassinEndsGame ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Clue Style (Offline Fast Mode) */}
          <div className="pt-4 border-t border-slate-700/50 flex flex-col gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">Clue Style</label>
              <span className="text-[10px] text-slate-500">Fast Mode bypasses Spymaster text input</span>
            </div>
            <div className="flex gap-2 bg-slate-800 p-1 rounded-xl">
              <button 
                onClick={() => setOfflineVerbalClues(true)}
                className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${offlineVerbalClues ? 'bg-emerald-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'} cursor-pointer`}
              >
                Verbal (Fast)
              </button>
              <button 
                onClick={() => setOfflineVerbalClues(false)}
                className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${!offlineVerbalClues ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'} cursor-pointer`}
              >
                Text
              </button>
            </div>
          </div>

          {/* Turn Timer */}
          <div className="pt-4 border-t border-slate-700/50 flex justify-between items-center">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">Turn Timer</label>
              <span className="text-[10px] text-slate-500">Auto-ends turns?</span>
            </div>
            <select
              value={turnTimer}
              onChange={e => setTurnTimer(parseInt(e.target.value))}
              className="bg-slate-800 border-2 border-slate-700 rounded-lg px-2 py-1 text-xs font-bold outline-none cursor-pointer focus:border-emerald-500"
            >
              <option value={0}>Off</option>
              <option value={60}>60s</option>
              <option value={90}>90s</option>
              <option value={120}>120s</option>
            </select>
          </div>

          {/* Per-Team Card Counts (Advanced) */}
          <div className="pt-4 border-t border-slate-700/50 flex flex-col gap-3">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide text-center">Cards Per Team <span className="text-slate-600">(0 = auto)</span></label>
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
                        setCardsPerTeam(prev => ({ ...prev, [team]: val }));
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

          {/* Validation Warnings */}
          {!isValidGame && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 flex gap-2 items-start">
              <AlertTriangle className="text-rose-400 w-4 h-4 mt-0.5 shrink-0" />
              <div className="text-xs text-rose-300">
                {totalCards > maxAvailable && <p>Total cards exceeds theme max ({maxAvailable}).</p>}
                {totalCards < totalRequired && <p>Need more cards! At least {totalRequired} required.</p>}
                {assassinCount >= totalCards && <p>Too many assassins!</p>}
                {(numTeams < 2 || numTeams > 4) && <p>Teams must be between 2 and 4.</p>}
                {usingManual && manualSum + assassinCount > totalCards && <p>Manual card counts ({manualSum}) + assassins ({assassinCount}) exceed total ({totalCards}).</p>}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 flex gap-2 items-start">
              <AlertTriangle className="text-rose-400 w-4 h-4 mt-0.5 shrink-0" />
              <p className="text-xs text-rose-300">{error}</p>
            </div>
          )}

          {/* Start Button */}
          <button
            onClick={handleStartGame}
            disabled={!isValidGame}
            className={`w-full mt-2 px-8 py-4 text-lg font-black tracking-wider uppercase rounded-xl shadow-2xl flex justify-center items-center gap-3 transition-all ${isValidGame ? 'bg-emerald-500 hover:bg-emerald-400 text-white cursor-pointer hover:shadow-emerald-500/30 active:scale-95' : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'}`}
          >
            <Play className="w-5 h-5" fill="currentColor" /> {isValidGame ? 'Start Game' : 'Invalid Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
