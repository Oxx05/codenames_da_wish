import { create } from 'zustand';
import { ThemeId } from '@/lib/themes';

export type TeamId = 'red' | 'blue' | 'green' | 'yellow' | 'neutral' | 'assassin';
export type PlayerRole = 'spymaster' | 'operative' | 'spectator';

export interface Player {
  id: string; // PeerJS connection ID
  name: string;
  team: TeamId;
  role: PlayerRole;
  isHost: boolean;
}

export interface Card {
  name: string;
  image: string | null;
  role: TeamId;
  revealed: boolean;
  marks?: TeamId[];
}

export interface Clue {
  word: string;
  count: number;
}

export interface ChatMessage {
  id: string;
  sender: string;
  team: TeamId;
  text: string;
  timestamp: number;
}

export interface ClueHistoryEntry {
  team: TeamId;
  word: string;
  count: number;
  turn: number;
}

interface GameState {
  // Multiplayer Connection State
  mpStatus: 'disconnected' | 'connecting' | 'lobby' | 'playing';
  loadingMessage: string;
  isHost: boolean;
  roomName: string | null;
  players: Player[];
  myPlayerId: string | null;

  // Game Settings
  theme: ThemeId;
  numTeams: number;
  totalCards: number;
  assassinCount: number;
  cardsPerTeam: Record<string, number>;
  firstTeam: TeamId | 'random';
  neutralEndsTurn: boolean;
  opponentEndsTurn: boolean;
  assassinEndsGame: boolean; // true = game over for all, false = only eliminates current team
  turnTimer: number; // 0 for disabled, or seconds (e.g. 60, 90, 120)
  offlineVerbalClues: boolean; // Fast mode for offline: skip clue typing

  // Active Game State
  cards: Card[];
  remaining: Record<TeamId, number>;
  currentTurn: TeamId;
  turnPhase: 'clue' | 'guess';
  turnEndTime: number | null; // Timestamp for when the current turn must end
  clue: Clue | null;
  guessesLeft: number;
  winner: TeamId | 'assassin' | null;
  eliminatedTeams: TeamId[];

  stats: {
    turns: number;
    clues: number;
    correctGuesses: number;
    wrongGuesses: number;
    teamStats: Record<string, { correct: number; wrong: number }>;
  };

  sfxEnabled: boolean;

  chatMessages: ChatMessage[];
  clueHistory: ClueHistoryEntry[];
  
  // Persisted setup config so Play Again remembers your settings
  savedSetupConfig: {
    numTeams: number;
    totalCards: number;
    assassinCount: number;
    cardsPerTeam: Record<string, number>;
    firstTeam: TeamId | 'random';
    offlineVerbalClues: boolean;
    neutralEndsTurn: boolean;
    opponentEndsTurn: boolean;
    assassinEndsGame: boolean;
    turnTimer: number;
  };

  // Actions
  setRoomDetails: (roomName: string, isHost: boolean, myPlayerId: string) => void;
  updatePlayers: (players: Player[]) => void;
  updateSettings: (settings: Partial<Pick<GameState, 'theme' | 'numTeams' | 'totalCards' | 'assassinCount' | 'firstTeam' | 'cardsPerTeam' | 'neutralEndsTurn' | 'opponentEndsTurn' | 'assassinEndsGame' | 'turnTimer' | 'offlineVerbalClues'>>) => void;
  toggleSFX: () => void;
  setOfflineVerbalClues: (val: boolean) => void;
  startGame: (cards: Card[], firstTurn: TeamId) => void;
  giveClue: (word: string, count: number) => void;
  revealCard: (index: number) => void;
  toggleMarkCard: (index: number, team: TeamId, forceRemove?: boolean) => void;
  endTurn: () => void;
  endGame: (winner: TeamId | 'assassin') => void;
  resetLobby: () => void;
  disconnect: () => void;
  addChatMessage: (msg: ChatMessage) => void;
  toggleGameRule: (rule: 'neutralEndsTurn' | 'opponentEndsTurn' | 'assassinEndsGame') => void;
  applyFullState: (state: Partial<GameState>) => void; // For host -> guest major syncs
}

export const useGameStore = create<GameState>((set, get) => ({
  mpStatus: 'disconnected',
  loadingMessage: 'Loading game...',
  isHost: false,
  roomName: null,
  players: [],
  myPlayerId: null,

  theme: 'pokemon',
  numTeams: 2,
  totalCards: 25,
  assassinCount: 1,
  cardsPerTeam: { red: 0, blue: 0, green: 0, yellow: 0 }, // 0 means auto-calculate
  firstTeam: 'random',
  neutralEndsTurn: true,
  opponentEndsTurn: true,
  assassinEndsGame: true,
  turnTimer: 0,
  offlineVerbalClues: false,
  eliminatedTeams: [], // New: track teams out of game (e.g. hit assassin)

  cards: [],
  remaining: { red: 0, blue: 0, green: 0, yellow: 0, neutral: 0, assassin: 0 },
  currentTurn: 'red',
  turnPhase: 'clue',
  turnEndTime: null,
  clue: null,
  guessesLeft: 0,
  winner: null,

  stats: {
    turns: 1,
    clues: 0,
    correctGuesses: 0,
    wrongGuesses: 0,
    teamStats: { red: { correct: 0, wrong: 0 }, blue: { correct: 0, wrong: 0 }, green: { correct: 0, wrong: 0 }, yellow: { correct: 0, wrong: 0 } },
  },

  chatMessages: [],
  clueHistory: [],

  savedSetupConfig: {
    numTeams: 2,
    totalCards: 25,
    assassinCount: 1,
    cardsPerTeam: { red: 9, blue: 8, green: 7, yellow: 6 },
    firstTeam: 'random',
    offlineVerbalClues: false,
    neutralEndsTurn: true,
    opponentEndsTurn: true,
    assassinEndsGame: true,
    turnTimer: 0,
  },

  sfxEnabled: true,

  setRoomDetails: (roomName, isHost, myPlayerId) => set({
    mpStatus: 'lobby',
    roomName,
    isHost,
    myPlayerId
  }),

  updatePlayers: (players) => set({ players }),

  updateSettings: (settings) => set((state) => {
    // Only host changes settings normally, but we apply to state for guests too
    return { ...state, ...settings };
  }),

  toggleSFX: () => set((state) => ({ sfxEnabled: !state.sfxEnabled })),
  
  setOfflineVerbalClues: (offlineVerbalClues: boolean) => set((state) => ({ 
    offlineVerbalClues,
    savedSetupConfig: { ...state.savedSetupConfig, offlineVerbalClues }
  })),

  startGame: (cards, startingTurn) => set((state) => {
    const remaining = { red: 0, blue: 0, green: 0, yellow: 0, neutral: 0, assassin: 0 };
    cards.forEach(c => remaining[c.role]++);
    
    // Fix 13: First Turn Validation Override
    // Check if the designated starting turn actually has cards (relevant when manual cards are set to 0)
    let validStartingTurn = startingTurn;
    if (remaining[validStartingTurn] === 0) {
      const activeTeams: TeamId[] = state.numTeams === 2 ? ['red', 'blue'] : state.numTeams === 3 ? ['red', 'blue', 'green'] : ['red', 'blue', 'green', 'yellow'];
      const valid = activeTeams.find(t => remaining[t] > 0);
      if (valid) validStartingTurn = valid;
    }
    
    return {
      mpStatus: 'playing',
      cards,
      remaining,
      currentTurn: validStartingTurn,
      turnPhase: state.offlineVerbalClues ? 'guess' : 'clue',
      turnEndTime: state.turnTimer > 0 ? Date.now() + state.turnTimer * 1000 : null,
      clue: state.offlineVerbalClues ? { word: 'Verbal Clue', count: 99 } : null,
      guessesLeft: state.offlineVerbalClues ? 99 : 0,
      winner: null,
      stats: {
        turns: 1,
        clues: 0,
        correctGuesses: 0,
        wrongGuesses: 0,
        teamStats: { red: { correct: 0, wrong: 0 }, blue: { correct: 0, wrong: 0 }, green: { correct: 0, wrong: 0 }, yellow: { correct: 0, wrong: 0 } },
      },
      chatMessages: [],
      clueHistory: [],
      eliminatedTeams: []
    };
  }),

  giveClue: (word, count) => set((state) => ({
    turnPhase: 'guess',
    clue: { word, count },
    guessesLeft: count + 1, // +1 for the extra guess rule
    turnEndTime: state.turnTimer > 0 ? Date.now() + state.turnTimer * 1000 : null,
    stats: { ...state.stats, clues: state.stats.clues + 1 },
    clueHistory: [...state.clueHistory, { team: state.currentTurn, word, count, turn: state.stats.turns }]
  })),

  revealCard: (index) => set((state) => {
    if (state.winner || state.cards[index].revealed) return state;

    const newCards = [...state.cards];
    const card = { ...newCards[index], revealed: true };
    newCards[index] = card;

    const newRemaining = { ...state.remaining };
    newRemaining[card.role]--;

    // Turn logic
    let nextPhase = state.turnPhase;
    let nextTurn = state.currentTurn;
    let nextGuesses = state.guessesLeft - 1;
    let winner: TeamId | 'assassin' | null = state.winner;
    let turnChanged = false;

    const activeTeams: TeamId[] = state.numTeams === 2 ? ['red', 'blue'] : 
                                  state.numTeams === 3 ? ['red', 'blue', 'green'] : 
                                  ['red', 'blue', 'green', 'yellow'];

    // Loss condition
    if (card.role === 'assassin') {
      if (state.assassinEndsGame) {
        // Classic: game over for everyone
        winner = 'assassin';
      } else {
        // Eliminate only the current team: skip to next team
        // Check if only one team remains — that team wins instantly (Fix 12)
        const newEliminatedTeams = [...state.eliminatedTeams, state.currentTurn];
        const remainingTeams = activeTeams.filter(t => !newEliminatedTeams.includes(t) && newRemaining[t] > 0);
        
        if (remainingTeams.length <= 1 && remainingTeams.length > 0) {
          winner = remainingTeams[0]; // Instant win for the last team standing
        } else if (remainingTeams.length === 0) {
          winner = 'assassin'; // fallback: everyone eliminated
        } else {
          // Skip to next team, current team is out
          const turnIdx = activeTeams.indexOf(state.currentTurn);
          let nextIdx = (turnIdx + 1) % activeTeams.length;
          // Find next team that still has cards AND is not eliminated
          while ((newRemaining[activeTeams[nextIdx]] === 0 || state.eliminatedTeams.includes(activeTeams[nextIdx])) && activeTeams[nextIdx] !== state.currentTurn) {
            nextIdx = (nextIdx + 1) % activeTeams.length;
          }
          nextTurn = activeTeams[nextIdx];
          const newEliminatedTeams = [...state.eliminatedTeams, state.currentTurn];
          if (state.offlineVerbalClues) {
            nextPhase = 'guess';
            nextGuesses = 99;
          } else {
            nextPhase = 'clue';
            nextGuesses = 0;
          }
          
          return {
            cards: newCards,
            remaining: newRemaining,
            turnPhase: nextPhase,
            currentTurn: nextTurn,
            eliminatedTeams: newEliminatedTeams,
            turnEndTime: state.turnTimer > 0 ? Date.now() + state.turnTimer * 1000 : null,
            guessesLeft: nextGuesses,
            winner,
            stats: {
              ...state.stats,
              turns: state.stats.turns + 1,
              teamStats: {
                ...state.stats.teamStats,
                [state.currentTurn]: {
                  correct: (state.stats.teamStats?.[state.currentTurn]?.correct || 0),
                  wrong: (state.stats.teamStats?.[state.currentTurn]?.wrong || 0)
                }
              }
            }
          };
        }
      }
    } 
    // Win condition - someone found all their agents
    else if (newRemaining[card.role] === 0 && card.role !== 'neutral') {
      winner = card.role;
    }

    // Wrong guess or neutral (if enabled) - end turn immediately
    // Note: this should NOT be an else-if connected to assassin/win, because we need to check it separately for normal gameplay.
    // If there's already a winner, we skip this since the game is over.
    if (!winner) {
      const isCardOpponent = card.role !== state.currentTurn && card.role !== 'neutral';
      const isCardNeutral = card.role === 'neutral';
      
      if ((isCardOpponent && state.opponentEndsTurn) || 
          (isCardNeutral && state.neutralEndsTurn) || 
          nextGuesses === 0) {
        
        // Specific bug fix: it was waiting for 2 neutrals because this logic was tied to the else-if chain above incorrectly.
        if (state.offlineVerbalClues) {
          nextPhase = 'guess';
          nextGuesses = 99;
        } else {
          nextPhase = 'clue';
          nextGuesses = 0;
        }
        
        // Cycle turn (Fix 10 part 1: While loop for skipping 0-card teams)
        const turnIdx = activeTeams.indexOf(state.currentTurn);
        let nextIdx = (turnIdx + 1) % activeTeams.length;
        
        while ((newRemaining[activeTeams[nextIdx]] === 0 || state.eliminatedTeams.includes(activeTeams[nextIdx])) && activeTeams[nextIdx] !== state.currentTurn) {
          nextIdx = (nextIdx + 1) % activeTeams.length;
        }
        
        nextTurn = activeTeams[nextIdx];
        turnChanged = true;
      }
    }

    const isCorrect = card.role === state.currentTurn;
    const isNeutral = card.role === 'neutral';
    const isAssassin = card.role === 'assassin';

    return {
      cards: newCards,
      remaining: newRemaining,
      turnPhase: nextPhase,
      currentTurn: nextTurn,
      turnEndTime: (nextTurn !== state.currentTurn || nextPhase !== state.turnPhase) && state.turnTimer > 0 
        ? Date.now() + state.turnTimer * 1000 
        : state.turnEndTime,
      guessesLeft: nextGuesses,
      winner,
      stats: {
        ...state.stats,
        turns: turnChanged ? state.stats.turns + 1 : state.stats.turns,
        correctGuesses: isCorrect ? state.stats.correctGuesses + 1 : state.stats.correctGuesses,
        wrongGuesses: (!isCorrect && !isAssassin) ? state.stats.wrongGuesses + 1 : state.stats.wrongGuesses,
        teamStats: {
          ...state.stats.teamStats,
          [state.currentTurn]: {
            correct: (state.stats.teamStats?.[state.currentTurn]?.correct || 0) + (isCorrect ? 1 : 0),
            wrong: (state.stats.teamStats?.[state.currentTurn]?.wrong || 0) + (!isCorrect && !isAssassin ? 1 : 0),
          }
        }
      }
    };
  }),

  toggleMarkCard: (index, team, forceRemove) => set((state) => {
    if (state.winner || state.cards[index].revealed) return state;
    if (state.currentTurn !== team) return state; // Fix 11: Prevent marking leaks from other teams/spectators
    
    const newCards = [...state.cards];
    const card = { ...newCards[index] };
    const marks = card.marks || [];
    
    const isRemoving = forceRemove !== undefined ? forceRemove : marks.includes(team);
    
    if (isRemoving) {
      card.marks = marks.filter(t => t !== team);
    } else {
      if (!marks.includes(team)) {
        card.marks = [...marks, team];
      }
    }
    
    newCards[index] = card;
    return { cards: newCards };
  }),

  endTurn: () => set((state) => {
    if (state.winner) return state;
    
    const activeTeams: TeamId[] = state.numTeams === 2 ? ['red', 'blue'] : 
                                  state.numTeams === 3 ? ['red', 'blue', 'green'] : 
                                  ['red', 'blue', 'green', 'yellow'];
                                  
    // Fix 10 part 2: Skip empty teams on manual endTurn
    const turnIdx = activeTeams.indexOf(state.currentTurn);
    let nextIdx = (turnIdx + 1) % activeTeams.length;
    
    while ((state.remaining[activeTeams[nextIdx]] === 0 || state.eliminatedTeams.includes(activeTeams[nextIdx])) && activeTeams[nextIdx] !== state.currentTurn) {
      nextIdx = (nextIdx + 1) % activeTeams.length;
    }
    
    const nextTurn = activeTeams[nextIdx];

    if (state.offlineVerbalClues) {
      return { 
        currentTurn: nextTurn, 
        turnPhase: 'guess', 
        clue: { word: 'Verbal Clue', count: 99 },
        guessesLeft: 99,
        turnEndTime: state.turnTimer > 0 ? Date.now() + state.turnTimer * 1000 : null,
        stats: { ...state.stats, turns: state.stats.turns + 1 }
      };
    }

    return { 
      currentTurn: nextTurn, 
      turnPhase: 'clue', 
      clue: null,
      guessesLeft: 0,
      turnEndTime: state.turnTimer > 0 ? Date.now() + state.turnTimer * 1000 : null,
      stats: { ...state.stats, turns: state.stats.turns + 1 }
    };
  }),

  endGame: (winner) => set({ winner }),

  resetLobby: () => set((state) => ({
    mpStatus: 'lobby',
    winner: null,
    cards: [],
    // Restore config:
    numTeams: state.savedSetupConfig.numTeams,
    totalCards: state.savedSetupConfig.totalCards,
    assassinCount: state.savedSetupConfig.assassinCount,
    cardsPerTeam: state.savedSetupConfig.cardsPerTeam,
    firstTeam: state.savedSetupConfig.firstTeam,
    offlineVerbalClues: state.savedSetupConfig.offlineVerbalClues,
    neutralEndsTurn: state.savedSetupConfig.neutralEndsTurn,
    opponentEndsTurn: state.savedSetupConfig.opponentEndsTurn,
    assassinEndsGame: state.savedSetupConfig.assassinEndsGame,
    turnTimer: state.savedSetupConfig.turnTimer,
    turnEndTime: null,
    turnPhase: 'clue',
    clue: null,
    guessesLeft: 0,
    chatMessages: [],
    clueHistory: [],
    eliminatedTeams: [],
  })),

  disconnect: () => set({
    mpStatus: 'disconnected',
    roomName: null,
    isHost: false,
    players: [],
    myPlayerId: null,
    winner: null,
    cards: []
  }),

  addChatMessage: (msg) => set((state) => ({
    chatMessages: [...state.chatMessages.slice(-49), msg] // Keep last 50 messages
  })),
  
  toggleGameRule: (rule) => set((state) => ({ 
    [rule]: !state[rule] as any,
    savedSetupConfig: { ...state.savedSetupConfig, [rule]: !state[rule] }
  })),

  applyFullState: (newState) => set((state) => ({ ...state, ...newState }))
}));
