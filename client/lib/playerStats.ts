import {
  ref,
  get,
  set,
  update,
  onValue,
  query,
  orderByChild,
  limitToLast,
  type DatabaseReference,
} from "firebase/database";

import { realtimeDb } from "@/lib/firebase";

/**
 * Career Statistics stored in Realtime Database
 */
export interface CareerStats {
  // Games
  gamesPlayed: number;
  wins: number;
  losses: number;

  // Scoring
  totalPoints: number;
  careerHighPoints: number;

  // Performance
  totalRebounds: number;
  totalAssists: number;
  totalSteals: number;
  totalBlocks: number;

  // Shooting Accuracy
  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  threePointersMade: number;
  threePointersAttempted: number;

  // Player Info
  position?: string;
  jerseyNumber?: number;
  overallRating?: number;

  // Metadata
  lastUpdated: number; // Unix timestamp
}

/**
 * Individual Game Statistics
 */
export interface GameStats {
  gameId: string;
  date: number; // Unix timestamp

  // Performance
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;

  // Shooting
  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  threePointersMade: number;
  threePointersAttempted: number;

  // Game Info
  result: "win" | "loss";
  opponentTeam?: string;
  minutesPlayed?: number;
}

/**
 * Calculated per-game averages
 */
export interface StatsAverages {
  ppg: number; // Points per game
  rpg: number; // Rebounds per game
  apg: number; // Assists per game
  spg: number; // Steals per game
  bpg: number; // Blocks per game
}

/**
 * Calculated shooting percentages
 */
export interface ShootingPercentages {
  fgPercentage: number; // Field goal percentage
  threePointPercentage: number; // Three-point percentage
  winPercentage: number; // Win percentage
}

/**
 * Initialize player stats for a new user
 */
export async function initializePlayerStats(
  userId: string,
): Promise<CareerStats> {
  const statsRef = ref(realtimeDb, `player_stats/${userId}/career`);

  const initialStats: CareerStats = {
    gamesPlayed: 0,
    totalPoints: 0,
    totalRebounds: 0,
    totalAssists: 0,
    totalSteals: 0,
    totalBlocks: 0,
    fieldGoalsMade: 0,
    fieldGoalsAttempted: 0,
    threePointersMade: 0,
    threePointersAttempted: 0,
    wins: 0,
    losses: 0,
    careerHighPoints: 0,
    lastUpdated: Date.now(),
  };

  await set(statsRef, initialStats);
  return initialStats;
}

/**
 * Fetch career statistics for a player
 */
export async function getCareerStats(
  userId: string,
): Promise<CareerStats | null> {
  try {
    const statsRef = ref(realtimeDb, `player_stats/${userId}/career`);
    const snapshot = await get(statsRef);

    if (!snapshot.exists()) {
      return null;
    }

    return snapshot.val() as CareerStats;
  } catch (error) {
    console.error("Error fetching career stats:", error);
    throw new Error("Failed to load player statistics");
  }
}

/**
 * Subscribe to real-time career stats updates
 */
export function subscribeToCareerStats(
  userId: string,
  callback: (stats: CareerStats | null) => void,
): () => void {
  const statsRef = ref(realtimeDb, `player_stats/${userId}/career`);

  const unsubscribe = onValue(
    statsRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val() as CareerStats);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error("Error in stats subscription:", error);
      callback(null);
    },
  );

  // Return cleanup function
  return () => unsubscribe();
}

/**
 * Get recent games for a player
 */
export async function getRecentGames(
  userId: string,
  limit: number = 10,
): Promise<GameStats[]> {
  try {
    const gamesRef = ref(realtimeDb, `player_stats/${userId}/games`);
    const gamesQuery = query(gamesRef, orderByChild("date"), limitToLast(limit));

    const snapshot = await get(gamesQuery);

    if (!snapshot.exists()) {
      return [];
    }

    const games: GameStats[] = [];
    snapshot.forEach((child) => {
      games.unshift(child.val()); // Reverse order (newest first)
    });

    return games;
  } catch (error) {
    console.error("Error fetching recent games:", error);
    return [];
  }
}

/**
 * Get all games for a player (for pagination)
 */
export async function getAllGames(userId: string): Promise<GameStats[]> {
  try {
    const gamesRef = ref(realtimeDb, `player_stats/${userId}/games`);
    const snapshot = await get(gamesRef);

    if (!snapshot.exists()) {
      return [];
    }

    const games: GameStats[] = [];
    snapshot.forEach((child) => {
      games.push(child.val());
    });

    // Sort by date descending (newest first)
    return games.sort((a, b) => b.date - a.date);
  } catch (error) {
    console.error("Error fetching all games:", error);
    return [];
  }
}

/**
 * Get paginated games (for infinite scroll)
 */
export async function getPaginatedGames(
  userId: string,
  pageSize: number = 10,
  cursor?: number, // timestamp cursor
): Promise<{ games: GameStats[]; nextCursor?: number }> {
  try {
    const allGames = await getAllGames(userId);

    // Filter games after cursor if provided
    const filteredGames = cursor
      ? allGames.filter((game) => game.date < cursor)
      : allGames;

    // Get page of games
    const games = filteredGames.slice(0, pageSize);

    // Get next cursor (timestamp of last game in this page)
    const nextCursor = games.length === pageSize ? games[games.length - 1].date : undefined;

    return { games, nextCursor };
  } catch (error) {
    console.error("Error fetching paginated games:", error);
    return { games: [] };
  }
}

/**
 * Get a single game by ID
 */
export async function getSingleGame(
  userId: string,
  gameId: string,
): Promise<GameStats | null> {
  try {
    const gameRef = ref(realtimeDb, `player_stats/${userId}/games/${gameId}`);
    const snapshot = await get(gameRef);

    if (!snapshot.exists()) {
      return null;
    }

    return snapshot.val() as GameStats;
  } catch (error) {
    console.error("Error fetching single game:", error);
    return null;
  }
}

/**
 * Remove undefined values from an object (Firebase doesn't accept undefined)
 */
function sanitizeForFirebase<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForFirebase(item)) as unknown as T;
  }

  if (typeof obj === "object") {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirebase(value);
      }
    }
    return cleaned as T;
  }

  return obj;
}

/**
 * Record game stats for a player
 */
export async function recordGameStats(
  userId: string,
  gameId: string,
  gameStats: GameStats,
  currentCareerStats: CareerStats,
): Promise<void> {
  try {
    validateGameStats(gameStats);

    // References
    const playerStatsRef = ref(realtimeDb, `player_stats/${userId}`);

    // Calculate new career totals
    const newCareerStats: CareerStats = {
      gamesPlayed: currentCareerStats.gamesPlayed + 1,
      wins:
        gameStats.result === "win"
          ? currentCareerStats.wins + 1
          : currentCareerStats.wins,
      losses:
        gameStats.result === "loss"
          ? currentCareerStats.losses + 1
          : currentCareerStats.losses,

      totalPoints: currentCareerStats.totalPoints + gameStats.points,
      careerHighPoints: Math.max(
        currentCareerStats.careerHighPoints,
        gameStats.points,
      ),

      totalRebounds: currentCareerStats.totalRebounds + gameStats.rebounds,
      totalAssists: currentCareerStats.totalAssists + gameStats.assists,
      totalSteals: currentCareerStats.totalSteals + gameStats.steals,
      totalBlocks: currentCareerStats.totalBlocks + gameStats.blocks,

      fieldGoalsMade:
        currentCareerStats.fieldGoalsMade + gameStats.fieldGoalsMade,
      fieldGoalsAttempted:
        currentCareerStats.fieldGoalsAttempted + gameStats.fieldGoalsAttempted,
      threePointersMade:
        currentCareerStats.threePointersMade + gameStats.threePointersMade,
      threePointersAttempted:
        currentCareerStats.threePointersAttempted +
        gameStats.threePointersAttempted,

      position: currentCareerStats.position,
      jerseyNumber: currentCareerStats.jerseyNumber,
      overallRating: currentCareerStats.overallRating,

      lastUpdated: Date.now(),
    };

    // Sanitize to remove undefined values
    const cleanedCareerStats = sanitizeForFirebase(newCareerStats);

    // Update Firebase
    await update(playerStatsRef, {
      career: cleanedCareerStats,
      [`games/${gameId}`]: gameStats,
    });
  } catch (error) {
    console.error("Error recording game stats:", error);
    throw error;
  }
}

/**
 * Calculate per-game averages from career stats
 */
export function calculateAverages(career: CareerStats): StatsAverages {
  const games = career.gamesPlayed || 1; // Avoid division by zero

  return {
    ppg: career.totalPoints / games,
    rpg: career.totalRebounds / games,
    apg: career.totalAssists / games,
    spg: career.totalSteals / games,
    bpg: career.totalBlocks / games,
  };
}

/**
 * Calculate shooting percentages from career stats
 */
export function calculateShootingPercentages(
  career: CareerStats,
): ShootingPercentages {
  return {
    fgPercentage:
      career.fieldGoalsAttempted > 0
        ? (career.fieldGoalsMade / career.fieldGoalsAttempted) * 100
        : 0,
    threePointPercentage:
      career.threePointersAttempted > 0
        ? (career.threePointersMade / career.threePointersAttempted) * 100
        : 0,
    winPercentage:
      career.gamesPlayed > 0 ? (career.wins / career.gamesPlayed) * 100 : 0,
  };
}

/**
 * Validate game statistics before saving
 */
function validateGameStats(stats: GameStats): void {
  if (stats.points < 0 || stats.rebounds < 0 || stats.assists < 0) {
    throw new Error("Stats cannot be negative");
  }

  if (stats.fieldGoalsMade > stats.fieldGoalsAttempted) {
    throw new Error("Made shots cannot exceed attempted shots");
  }

  if (stats.threePointersMade > stats.threePointersAttempted) {
    throw new Error("Made 3-pointers cannot exceed attempted 3-pointers");
  }
}

/**
 * Format number with one decimal place
 */
export function formatStatNumber(value: number): string {
  return value.toFixed(1);
}

/**
 * Format percentage with one decimal place
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Record match stats from live game (converts custom scoring to standard stats)
 */
export async function recordMatchStats(
  matchId: string,
  gameDate: number,
  playerStats: Array<{
    playerId: string;
    actualPoints: number;
    rebounds: number;
    assists: number;
    steals: number;
    blocks: number;
    turnovers: number;
    fieldGoalsMade: number;
    fieldGoalsAttempted: number;
    threePointersMade: number;
    threePointersAttempted: number;
    freeThrowsMade: number;
    freeThrowsAttempted: number;
  }>,
  teamResult: "win" | "loss",
): Promise<void> {
  try {
    for (const player of playerStats) {
      // Get or initialize career stats
      let careerStats = await getCareerStats(player.playerId);
      if (!careerStats) {
        careerStats = await initializePlayerStats(player.playerId);
      }

      // Create game stats entry
      const gameStats: GameStats = {
        gameId: matchId,
        date: gameDate,
        points: player.actualPoints, // Use actual NBA points
        rebounds: player.rebounds,
        assists: player.assists,
        steals: player.steals,
        blocks: player.blocks,
        fieldGoalsMade: player.fieldGoalsMade,
        fieldGoalsAttempted: player.fieldGoalsAttempted,
        threePointersMade: player.threePointersMade,
        threePointersAttempted: player.threePointersAttempted,
        result: teamResult,
      };

      // Record the stats
      await recordGameStats(player.playerId, matchId, gameStats, careerStats);
    }
  } catch (error) {
    console.error("Error recording match stats:", error);
    throw error;
  }
}
