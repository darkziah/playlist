import type { PlayerEntry } from "shared";

/**
 * Custom scoring action types
 * Display values differ from actual stat values
 */
export type ScoringActionType =
  | "regular_basket" // +1 display, 2pts + 1 FGM in stats
  | "three_pointer" // +2 display, 3pts + 1 3PM in stats
  | "free_throw" // +1 display, 1pt + 1 FTM in stats
  | "missed_fg" // 0 display, +1 FGA in stats
  | "missed_3pt" // 0 display, +1 3PA in stats
  | "missed_ft" // 0 display, +1 FTA in stats
  | "rebound"
  | "assist"
  | "steal"
  | "block"
  | "turnover";

/**
 * Individual stat action recorded during live match
 */
export interface StatAction {
  id: string;
  timestamp: number;
  playerId: string;
  playerName: string;
  team: "A" | "B";
  actionType: ScoringActionType;
  displayPoints: number; // Custom scoring (1 or 2)
  actualPoints: number; // NBA scoring (1, 2, or 3)
}

/**
 * Team structure for a match (always 5 players)
 */
export interface Team {
  name: string; // "Team A" or "Team B"
  players: PlayerEntry[];
  score: number; // Custom scoring total
}

/**
 * Live player statistics during active match
 */
export interface LivePlayerStats {
  playerId: string;
  playerName: string;
  team: "A" | "B";

  // Display stats (custom scoring)
  displayPoints: number;

  // Actual stats (NBA standard)
  actualPoints: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;

  // Shooting
  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  threePointersMade: number;
  threePointersAttempted: number;
  freeThrowsMade: number;
  freeThrowsAttempted: number;
}

/**
 * Timer state
 */
export interface MatchTimer {
  durationMinutes: number;
  remainingSeconds: number;
  isPaused: boolean;
  startedAt?: number;
  pausedAt?: number;
}

/**
 * Active match session state (synced via Firebase)
 */
export interface MatchSession {
  matchId: string;
  gameId: string;
  matchNumber: number; // 1st, 2nd, 3rd match of the day

  // Teams
  teamA: Team;
  teamB: Team;

  // Timer
  timer: MatchTimer;

  // Actions log (for undo and history)
  actions: StatAction[];

  // Status
  status: "active" | "paused" | "ended";
  startedAt: number;
  endedAt?: number;
}

/**
 * Completed match summary
 */
export interface MatchSummary {
  matchId: string;
  gameId: string;
  matchNumber: number;

  teamAScore: number; // Custom scoring
  teamBScore: number; // Custom scoring

  teamAPlayers: string[]; // Player IDs
  teamBPlayers: string[]; // Player IDs

  durationMinutes: number;
  startedAt: number;
  endedAt: number;

  // Link to full match data
  winner?: "A" | "B" | "tie";
}

/**
 * Rotation tracking state
 * Tracks which players have played in which matches
 */
export interface RotationState {
  gameId: string;

  // Map of playerId -> array of match numbers they played in
  playerMatches: Record<string, number[]>;

  // Current rotation position (which slot number to start from next)
  currentRotationSlot: number;

  // Total matches played today
  totalMatches: number;
}

/**
 * Player rotation suggestion
 */
export interface RotationSuggestion {
  suggestedPlayers: PlayerEntry[]; // Next 10 players
  reasoning: string; // Why these players were suggested
  playerMatchCounts: Record<string, number>; // How many times each has played
}
