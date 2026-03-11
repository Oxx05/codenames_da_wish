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

interface GameState {
  // Multiplayer Connection State
  mpStatus: 'disconnected' | 'connecting' | 'lobby' | 'playing';
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

  // Active Game State
  cards: Card[];
  remaining: Record<TeamId, number>;
  currentTurn: TeamId;
  turnPhase: 'clue' | 'guess';
  clue: Clue | null;
  guessesLeft: number;
  winner: TeamId | 'assassin' | null;

  // Actions
  joinLobby: (roomName: string, isHost: boolean, myId: string) => void;
  updatePlayers: (players: Player[]) => void;
  updateSettings: (settings: Partial<Pick<GameState, 'theme' | 'numTeams' | 'totalCards' | 'assassinCount' | 'firstTeam' | 'cardsPerTeam'>>) => void;
  startGame: (cards: Card[], firstTurn: TeamId) => void;
  giveClue: (word: string, count: number) => void;
  revealCard: (index: number) => void;
  toggleMarkCard: (index: number, team: TeamId, forceRemove?: boolean) => void;
  endTurn: () => void;
  endGame: (winner: TeamId | 'assassin') => void;
  resetToLobby: () => void;
  disconnect: () => void;
  applyFullState: (state: Partial<GameState>) => void; // For host -> guest major syncs
}

export const useGameStore = create<GameState>((set, get) => ({
  mpStatus: 'disconnected',
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

  cards: [],
  remaining: { red: 0, blue: 0, green: 0, yellow: 0, neutral: 0, assassin: 0 },
  currentTurn: 'red',
  turnPhase: 'clue',
  clue: null,
  guessesLeft: 0,
  winner: null,

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

  startGame: (cards, firstTurn) => {
    const remaining = { red: 0, blue: 0, green: 0, yellow: 0, neutral: 0, assassin: 0 };
    cards.forEach(c => remaining[c.role]++);
    
    set({
      mpStatus: 'playing',
      cards,
      remaining,
      currentTurn: firstTurn,
      turnPhase: 'clue',
      clue: null,
      guessesLeft: 0,
      winner: null
    });
  },

  giveClue: (word, count) => set({
    turnPhase: 'guess',
    clue: { word, count },
    guessesLeft: count + 1 // +1 for the extra guess rule
  }),

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
    // Wrong guess or neutral - end turn immediately
    else if (card.role !== state.currentTurn || nextGuesses === 0) {
      nextPhase = 'clue';
      nextGuesses = 0;
      // Cycle turn
      const activeTeams: TeamId[] = state.numTeams === 2 ? ['red', 'blue'] : 
                                    state.numTeams === 3 ? ['red', 'blue', 'green'] : 
                                    ['red', 'blue', 'green', 'yellow'];
      const turnIdx = activeTeams.indexOf(state.currentTurn);
      nextTurn = activeTeams[(turnIdx + 1) % activeTeams.length];
    }

    return {
      cards: newCards,
      remaining: newRemaining,
      turnPhase: nextPhase,
      currentTurn: nextTurn,
      guessesLeft: nextGuesses,
      winner
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
    const activeTeams: TeamId[] = state.numTeams === 2 ? ['red', 'blue'] : 
                                  state.numTeams === 3 ? ['red', 'blue', 'green'] : 
                                  ['red', 'blue', 'green', 'yellow'];
    const turnIdx = activeTeams.indexOf(state.currentTurn);
    const nextTurn = activeTeams[(turnIdx + 1) % activeTeams.length];
    return {
      turnPhase: 'clue',
      currentTurn: nextTurn,
      guessesLeft: 0,
      clue: null
    };
  }),

  endGame: (winner) => set({ winner }),

  resetToLobby: () => set({
    mpStatus: 'lobby',
    winner: null,
    cards: []
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
  
  applyFullState: (newState) => set((state) => ({ ...state, ...newState }))
}));
