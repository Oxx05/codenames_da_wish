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

  stats: {
    turns: number;
    clues: number;
    correctGuesses: number;
    wrongGuesses: number;
  };

  sfxEnabled: boolean;

  chatMessages: ChatMessage[];
  clueHistory: ClueHistoryEntry[];

  // Actions
  joinLobby: (roomName: string, isHost: boolean, myId: string) => void;
  updatePlayers: (players: Player[]) => void;
  updateSettings: (settings: Partial<Pick<GameState, 'theme' | 'numTeams' | 'totalCards' | 'assassinCount' | 'firstTeam' | 'cardsPerTeam' | 'neutralEndsTurn' | 'turnTimer' | 'offlineVerbalClues'>>) => void;
  toggleSFX: () => void;
  startGame: (cards: Card[], firstTurn: TeamId) => void;
  giveClue: (word: string, count: number) => void;
  revealCard: (index: number) => void;
  toggleMarkCard: (index: number, team: TeamId, forceRemove?: boolean) => void;
  endTurn: () => void;
  endGame: (winner: TeamId | 'assassin') => void;
  resetToLobby: () => void;
  disconnect: () => void;
  addChatMessage: (msg: ChatMessage) => void;
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
  totalCards: 20,
  assassinCount: 1,
  cardsPerTeam: { red: 0, blue: 0, green: 0, yellow: 0 }, // 0 means auto-calculate
  firstTeam: 'random',
  neutralEndsTurn: true,
  turnTimer: 0,
  offlineVerbalClues: false,

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
  },

  sfxEnabled: true,

  chatMessages: [],
  clueHistory: [],

  joinLobby: (roomName, isHost, myId) => set({
    mpStatus: 'lobby',
    roomName,
    isHost,
    myPlayerId: myId
  }),

  updatePlayers: (players) => set({ players }),

  updateSettings: (settings) => set((state) => {
    // Only host changes settings normally, but we apply to state for guests too
    return { ...state, ...settings };
  }),

  toggleSFX: () => set((state) => ({ sfxEnabled: !state.sfxEnabled })),

  startGame: (cards, firstTurn) => set((state) => {
    const remaining = { red: 0, blue: 0, green: 0, yellow: 0, neutral: 0, assassin: 0 };
    cards.forEach(c => remaining[c.role]++);
    
    return {
      mpStatus: 'playing',
      cards,
      remaining,
      currentTurn: firstTurn,
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
      },
      chatMessages: [],
      clueHistory: []
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

    // Loss condition
    if (card.role === 'assassin') {
      winner = 'assassin';
    } 
    // Win condition - team found all their agents
    else if (newRemaining[card.role] === 0 && card.role !== 'neutral') {
      winner = card.role;
    }
    // Wrong guess or neutral (if enabled) - end turn immediately
    else if (card.role !== state.currentTurn && card.role !== 'neutral' || 
             (card.role === 'neutral' && state.neutralEndsTurn) || 
             nextGuesses === 0) {
      if (state.offlineVerbalClues) {
        nextPhase = 'guess';
        nextGuesses = 99;
      } else {
        nextPhase = 'clue';
        nextGuesses = 0;
      }
      // Cycle turn
      const activeTeams: TeamId[] = state.numTeams === 2 ? ['red', 'blue'] : 
                                    state.numTeams === 3 ? ['red', 'blue', 'green'] : 
                                    ['red', 'blue', 'green', 'yellow'];
      const turnIdx = activeTeams.indexOf(state.currentTurn);
      nextTurn = activeTeams[(turnIdx + 1) % activeTeams.length];
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
        correctGuesses: isCorrect ? state.stats.correctGuesses + 1 : state.stats.correctGuesses,
        wrongGuesses: (!isCorrect && !isNeutral && !isAssassin) ? state.stats.wrongGuesses + 1 : state.stats.wrongGuesses,
      }
    };
  }),

  toggleMarkCard: (index, team, forceRemove) => set((state) => {
    if (state.winner || state.cards[index].revealed) return state;
    
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
    const turnIdx = activeTeams.indexOf(state.currentTurn);
    const nextTurn = activeTeams[(turnIdx + 1) % activeTeams.length];

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

  resetToLobby: () => set({
    mpStatus: 'lobby',
    winner: null,
    cards: [],
    turnEndTime: null,
    turnPhase: 'clue',
    clue: null,
    guessesLeft: 0,
    chatMessages: [],
    clueHistory: [],
  }),

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
  
  applyFullState: (newState) => set((state) => ({ ...state, ...newState }))
}));
