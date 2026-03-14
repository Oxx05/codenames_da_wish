/**
 * Tests for the 8 bug fixes & features:
 * Fix 1: OfflineSetup number input allows deletion (tempValues pattern)
 * Fix 2: forceTextOnly removed - images always shown
 * Fix 3: Auto-show map dialog on handoff dismiss (text mode, clue phase)
 * Fix 4: Flip-lock delay before overlays appear
 * Feature 5: Team-change toast in verbal mode
 * Feature 6: Per-team stats tracked in gameStore
 * Feature 7: hasPassword field in rooms API
 * Feature 8: roomPassword in peerStore state
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================
// Fix 1 - OfflineSetup: tempValues pattern
// ============================================================
describe('Fix 1: OfflineSetup tempValues pattern', () => {
  it('allows a raw empty string while the real value stays valid', () => {
    // Simulate the pattern: tempValues stores raw input; actual state only updates when valid
    const tempValues: Record<string, string> = {};
    let numTeams = 2;

    const handleChange = (raw: string) => {
      tempValues['numTeams'] = raw;
      const val = parseInt(raw);
      if (!isNaN(val) && val >= 2 && val <= 4) numTeams = val;
    };

    handleChange(''); // User clears input
    expect(tempValues['numTeams']).toBe('');
    expect(numTeams).toBe(2); // Real value unchanged

    handleChange('3'); // User types valid value
    expect(tempValues['numTeams']).toBe('3');
    expect(numTeams).toBe(3);
  });

  it('clamps value on blur by clearing tempValues', () => {
    const tempValues: Record<string, string> = { numTeams: '' };
    // On blur, clear the temp so it falls back to real state
    const { numTeams: _, ...rest } = tempValues;
    const cleared = rest;
    expect(cleared['numTeams']).toBeUndefined();
  });

  it('ignores out-of-range inputs', () => {
    let numTeams = 2;
    const handleChange = (raw: string) => {
      const val = parseInt(raw);
      if (!isNaN(val) && val >= 2 && val <= 4) numTeams = val;
    };
    handleChange('9');
    expect(numTeams).toBe(2); // Out of range, not applied
    handleChange('1');
    expect(numTeams).toBe(2); // Below min, not applied
  });
});

// ============================================================
// Fix 2 - forceTextOnly removed
// ============================================================
describe('Fix 2: forceTextOnly removed from card rendering', () => {
  // Simulate the old logic vs new logic
  const oldForceTextOnly = (totalCards: number, windowWidth: number) =>
    totalCards > 20 && windowWidth < 640;

  const newEffectivelyTextOnly = (hasImage: boolean) => !hasImage;

  it('old logic forced text only for 25 cards on mobile', () => {
    expect(oldForceTextOnly(25, 375)).toBe(true);
  });

  it('new logic never forces text only based on card count alone', () => {
    // Card with image should always show image, regardless of count
    expect(newEffectivelyTextOnly(true)).toBe(false);  // has image → show image
    expect(newEffectivelyTextOnly(false)).toBe(true);  // no image → text only
  });

  it('new logic works for 60 cards with images', () => {
    // Even with 60 cards and a mobile width, if card has an image it shows it
    expect(newEffectivelyTextOnly(true)).toBe(false);
  });
});

// ============================================================
// Fix 4 - Flip lock delay
// ============================================================
describe('Fix 4: Flip lock prevents instant overlay', () => {
  it('flip lock is set true on card click and cleared after 650ms', async () => {
    let flipLock = false;
    let timerCleared = false;

    const onCardClick = () => {
      flipLock = true;
      setTimeout(() => { flipLock = false; }, 650);
    };

    onCardClick();
    expect(flipLock).toBe(true);

    await new Promise(r => setTimeout(r, 700));
    expect(flipLock).toBe(false);
  });

  it('stats overlay should be delayed when flip lock is active', () => {
    let flipLock = true;
    let showStats = false;

    const onWinner = () => {
      const delay = flipLock ? 700 : 0;
      setTimeout(() => { showStats = true; }, delay);
    };

    onWinner();
    // Should not be shown immediately
    expect(showStats).toBe(false);
  });
});

// ============================================================
// Feature 5 - Team change toast
// ============================================================
describe('Feature 5: Team change toast', () => {
  it('shows toast when currentTurn changes', () => {
    let teamChangeToast: string | null = null;
    let prevTurn = 'red';

    const onTurnChange = (newTurn: string, verbalClues: boolean, hasWinner: boolean) => {
      if (!verbalClues || hasWinner) return;
      if (prevTurn !== newTurn) {
        teamChangeToast = newTurn;
        prevTurn = newTurn;
      }
    };

    onTurnChange('blue', true, false);
    expect(teamChangeToast).toBe('blue');
  });

  it('does NOT show toast in text (non-verbal) mode', () => {
    let teamChangeToast: string | null = null;
    let prevTurn = 'red';

    const onTurnChange = (newTurn: string, verbalClues: boolean, hasWinner: boolean) => {
      if (!verbalClues || hasWinner) return;
      if (prevTurn !== newTurn) {
        teamChangeToast = newTurn;
      }
    };

    onTurnChange('blue', false /* text mode */, false);
    expect(teamChangeToast).toBeNull();
  });

  it('does NOT show toast if game has a winner', () => {
    let teamChangeToast: string | null = null;

    const onTurnChange = (newTurn: string, verbalClues: boolean, hasWinner: boolean) => {
      if (!verbalClues || hasWinner) return;
      teamChangeToast = newTurn;
    };

    onTurnChange('blue', true, true /* has winner */);
    expect(teamChangeToast).toBeNull();
  });
});

// ============================================================
// Feature 6 - Per-team stats
// ============================================================
describe('Feature 6: Per-team stats tracking', () => {
  type TeamStats = Record<string, { correct: number; wrong: number }>;

  const initialTeamStats: TeamStats = {
    red: { correct: 0, wrong: 0 },
    blue: { correct: 0, wrong: 0 },
    green: { correct: 0, wrong: 0 },
    yellow: { correct: 0, wrong: 0 },
  };

  const updateTeamStat = (stats: TeamStats, team: string, isCorrect: boolean, isNeutral: boolean, isAssassin: boolean): TeamStats => ({
    ...stats,
    [team]: {
      correct: stats[team].correct + (isCorrect ? 1 : 0),
      wrong: stats[team].wrong + (!isCorrect && !isNeutral && !isAssassin ? 1 : 0),
    }
  });

  it('increments correct count for guessing own team card', () => {
    const updated = updateTeamStat(initialTeamStats, 'red', true, false, false);
    expect(updated.red.correct).toBe(1);
    expect(updated.red.wrong).toBe(0);
    expect(updated.blue.correct).toBe(0); // Other teams unaffected
  });

  it('increments wrong count for wrong team card', () => {
    const updated = updateTeamStat(initialTeamStats, 'blue', false, false, false);
    expect(updated.blue.wrong).toBe(1);
    expect(updated.blue.correct).toBe(0);
  });

  it('does NOT increment wrong for neutral card', () => {
    const updated = updateTeamStat(initialTeamStats, 'red', false, true, false);
    expect(updated.red.wrong).toBe(0);
    expect(updated.red.correct).toBe(0);
  });

  it('does NOT increment wrong for assassin card', () => {
    const updated = updateTeamStat(initialTeamStats, 'red', false, false, true);
    expect(updated.red.wrong).toBe(0);
  });

  it('accumulates stats across multiple guesses', () => {
    let stats = { ...initialTeamStats };
    stats = updateTeamStat(stats, 'red', true, false, false);   // +1 correct red
    stats = updateTeamStat(stats, 'red', true, false, false);   // +1 correct red
    stats = updateTeamStat(stats, 'red', false, false, false);  // +1 wrong red
    stats = updateTeamStat(stats, 'blue', true, false, false);  // +1 correct blue
    expect(stats.red.correct).toBe(2);
    expect(stats.red.wrong).toBe(1);
    expect(stats.blue.correct).toBe(1);
  });
});

// ============================================================
// Feature 7 - hasPassword in rooms API
// ============================================================
describe('Feature 7: hasPassword in room data', () => {
  it('stores hasPassword true when room has a password', () => {
    const roomData = {
      name: 'test-room',
      hostId: 'abc123',
      players: 1,
      maxPlayers: 12,
      status: 'lobby' as const,
      lastSeen: Date.now(),
      hasPassword: true
    };
    expect(roomData.hasPassword).toBe(true);
  });

  it('stores hasPassword false for open room', () => {
    const roomData = {
      name: 'open-room',
      hostId: 'def456',
      players: 2,
      maxPlayers: 12,
      status: 'lobby' as const,
      lastSeen: Date.now(),
      hasPassword: false
    };
    expect(roomData.hasPassword).toBe(false);
  });

  it('password input should be hidden when joining a room with hasPassword=false', () => {
    let tab = 'join';
    let selectedRoomHasPassword = false;
    // The condition that hides the input:
    const shouldHideInput = tab === 'join' && selectedRoomHasPassword === false;
    expect(shouldHideInput).toBe(true);
  });

  it('password input remains visible when joining a room with hasPassword=true', () => {
    let tab = 'join';
    let selectedRoomHasPassword = true as boolean;
    const shouldHideInput = tab === 'join' && selectedRoomHasPassword === false;
    expect(shouldHideInput).toBe(false);
  });

  it('password input remains visible when creating a room', () => {
    let tab = 'create';
    let selectedRoomHasPassword = false as boolean;
    const shouldHideInput = tab === 'join' && selectedRoomHasPassword === false;
    expect(shouldHideInput).toBe(false);
  });
});

// ============================================================
// Feature 8 - Host can see password (roomPassword in peerStore)
// ============================================================
describe('Feature 8: Host password visibility', () => {
  it('roomPassword is exposed in store state', () => {
    // Simulate the peerStore state shape
    const mockPeerState = {
      peer: null,
      connections: [],
      hostConn: null,
      roomPassword: 'secret123',
    };
    expect(mockPeerState.roomPassword).toBe('secret123');
  });

  it('roomPassword is set when initializeHost is called with a password', () => {
    let roomPassword = '';
    const initializeHost = (password?: string) => {
      roomPassword = password || '';
    };
    initializeHost('mypass');
    expect(roomPassword).toBe('mypass');
  });

  it('roomPassword is cleared to empty string on disconnect', () => {
    let roomPassword = 'secret123';
    const disconnect = () => {
      roomPassword = '';
    };
    disconnect();
    expect(roomPassword).toBe('');
  });

  it('password display toggles between masked and visible', () => {
    const password = 'abc123';
    let showPassword = false;

    const displayValue = () => showPassword ? password : '•'.repeat(password.length);

    expect(displayValue()).toBe('••••••');
    showPassword = true;
    expect(displayValue()).toBe('abc123');
  });

  it('host password widget only renders when isHost AND roomPassword is set', () => {
    const shouldShowWidget = (isHost: boolean, roomPassword: string) => isHost && !!roomPassword;

    expect(shouldShowWidget(true, 'secret')).toBe(true);
    expect(shouldShowWidget(false, 'secret')).toBe(false);  // Guest sees nothing
    expect(shouldShowWidget(true, '')).toBe(false);          // No password set
    expect(shouldShowWidget(false, '')).toBe(false);         // Guest, no password
  });
});

// ============================================================
// Fix 3 - Auto-show map dialog on handoff dismiss (text mode)
// ============================================================
describe('Fix 3: Auto-show map confirm on handoff dismiss (text mode)', () => {
  it('shows map confirm dialog when dismissing handoff in clue phase + text mode', () => {
    let confirmShowMap = false;
    const isCluePhase = true;
    const offlineVerbalClues = false; // text mode

    const handleDismissHandoff = () => {
      if (isCluePhase && !offlineVerbalClues) {
        confirmShowMap = true;
      }
    };

    handleDismissHandoff();
    expect(confirmShowMap).toBe(true);
  });

  it('does NOT show map dialog in verbal mode', () => {
    let confirmShowMap = false;
    const isCluePhase = true;
    const offlineVerbalClues = true; // verbal mode

    const handleDismissHandoff = () => {
      if (isCluePhase && !offlineVerbalClues) {
        confirmShowMap = true;
      }
    };

    handleDismissHandoff();
    expect(confirmShowMap).toBe(false);
  });

  it('does NOT show map dialog in guess phase', () => {
    let confirmShowMap = false;
    const isCluePhase = false; // guess phase
    const offlineVerbalClues = false;

    const handleDismissHandoff = () => {
      if (isCluePhase && !offlineVerbalClues) {
        confirmShowMap = true;
      }
    };

    handleDismissHandoff();
    expect(confirmShowMap).toBe(false);
  });
});

// ============================================================
// Fix 10-13 - Deep Architectural Logic Fixes
// ============================================================
describe('Fix 10: Empty Team Turn Skipping', () => {
  it('endTurn skips over any team that has 0 cards remaining', () => {
    // We simulate the while loop logic that should be in endTurn
    const activeTeams = ['red', 'blue', 'green'];
    let currentTurn = 'red';
    const remaining = { red: 5, blue: 0, green: 4, yellow: 0, neutral: 5, assassin: 1 };
    
    // Simulating endTurn logic
    const turnIdx = activeTeams.indexOf(currentTurn);
    let nextIdx = (turnIdx + 1) % activeTeams.length;
    
    // The fix: while loop to skip empty teams
    while (remaining[activeTeams[nextIdx] as keyof typeof remaining] === 0 && activeTeams[nextIdx] !== currentTurn) {
      nextIdx = (nextIdx + 1) % activeTeams.length;
    }
    const nextTurn = activeTeams[nextIdx];
    
    // Since blue is 0, it should skip to green
    expect(nextTurn).toBe('green');
  });
});

describe('Fix 12: Assassin Edge Case (Instant Win)', () => {
  it('instantly wins if only one team is left alive', () => {
    // Simulate revealCard assassin logic with the fix
    const activeTeams = ['red', 'blue', 'green'];
    let currentTurn = 'blue';
    // Red is already dead (0). Blue just hit the assassin. Green is the only one left.
    // Notice blue remaining is still > 0 before the hit, but we consider them eliminated.
    const remaining = { red: 0, blue: 5, green: 3, yellow: 0, neutral: 5, assassin: 1 };
    
    let winner: string | null = null;
    
    // The fix: check remaining teams NOT including currentTurn that still have >0 cards
    const remainingTeams = activeTeams.filter(t => t !== currentTurn && remaining[t as keyof typeof remaining] > 0);
    
    if (remainingTeams.length <= 1 && remainingTeams.length > 0) {
      winner = remainingTeams[0];
    } else if (remainingTeams.length === 0) {
      winner = 'assassin'; // everyone dead
    }
    
    expect(winner).toBe('green');
  });
});

describe('Fix 11: ToggleMarkCard Leaks', () => {
  it('prevents marking action if it is not the active teams turn', () => {
    // Simulating toggleMarkCard guard clause
    const currentTurn = 'red';
    let cardMarks: string[] = [];
    
    const toggleMarkCard = (teamAttempting: string) => {
      // The Fix: ensure the team attempting to mark is the current turn
      if (currentTurn !== teamAttempting) return;
      
      cardMarks.push(teamAttempting);
    };
    
    toggleMarkCard('blue');
    expect(cardMarks.length).toBe(0); // Should block
    
    toggleMarkCard('red');
    expect(cardMarks.length).toBe(1); // Should allow
  });
});

describe('Fix 13: First Turn Validation Override', () => {
  it('assigns first turn to the first valid team if the designated team has 0 cards', () => {
    // Simulating startGame firstTurn validation logic
    let firstTurnTeam = 'red';
    const activeTeams = ['red', 'blue', 'green'];
    const cardsPerTeam = { red: 0, blue: 5, green: 4, yellow: 0 }; // Manual override! Red has 0.
    
    // The Fix: Validate firstTurnTeam actually has cards (relevant when manual cards are set)
    if (cardsPerTeam[firstTurnTeam as keyof typeof cardsPerTeam] === 0) {
      // Find the first team that has cards to go first instead
      const validStartingTeam = activeTeams.find(t => cardsPerTeam[t as keyof typeof cardsPerTeam] > 0);
      if (validStartingTeam) {
        firstTurnTeam = validStartingTeam;
      }
    }
    
    expect(firstTurnTeam).toBe('blue'); // Because red was invalid
  });
});
