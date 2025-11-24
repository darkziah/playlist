import {
  ref,
  get,
  set,
  update,
  onValue,
  remove,
  serverTimestamp,
  type DatabaseReference,
} from "firebase/database";
import { realtimeDb } from "@/lib/firebase";
import type {
  MatchSession,
  MatchSummary,
  RotationState,
  RotationSuggestion,
  StatAction,
  Team,
  LivePlayerStats,
} from "./live-game-types";
import type { PlayerEntry } from "shared";

/**
 * Get active match for a game
 */
export async function getActiveMatch(
  gameId: string,
): Promise<MatchSession | null> {
  try {
    const matchRef = ref(realtimeDb, `active_matches/${gameId}`);
    const snapshot = await get(matchRef);

    if (!snapshot.exists()) {
      return null;
    }

    return snapshot.val() as MatchSession;
  } catch (error) {
    console.error("Error fetching active match:", error);
    return null;
  }
}

/**
 * Subscribe to active match updates (real-time sync)
 */
export function subscribeToActiveMatch(
  gameId: string,
  callback: (match: MatchSession | null) => void,
): () => void {
  const matchRef = ref(realtimeDb, `active_matches/${gameId}`);

  const unsubscribe = onValue(
    matchRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val() as MatchSession);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error("Error in match subscription:", error);
      callback(null);
    },
  );

  return () => unsubscribe();
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
 * Start a new match
 */
export async function startNewMatch(
  gameId: string,
  teamA: Team,
  teamB: Team,
  durationMinutes: number,
  matchNumber: number,
): Promise<MatchSession> {
  const matchId = `${gameId}_match_${matchNumber}_${Date.now()}`;
  const now = Date.now();

  const matchSession: MatchSession = {
    matchId,
    gameId,
    matchNumber,
    teamA,
    teamB,
    timer: {
      durationMinutes,
      remainingSeconds: durationMinutes * 60,
      isPaused: false,
      startedAt: now,
    },
    actions: [],
    status: "active",
    startedAt: now,
  };

  // Sanitize to remove undefined values
  const cleanedSession = sanitizeForFirebase(matchSession);

  const matchRef = ref(realtimeDb, `active_matches/${gameId}`);
  await set(matchRef, cleanedSession);

  return matchSession;
}

/**
 * Record a stat action (syncs across devices)
 */
export async function recordStatAction(
  gameId: string,
  action: StatAction,
): Promise<void> {
  try {
    const actionsRef = ref(realtimeDb, `active_matches/${gameId}/actions`);
    const snapshot = await get(actionsRef);
    const currentActions = snapshot.exists() ? (snapshot.val() as StatAction[]) : [];

    const updatedActions = [...currentActions, action];
    await set(actionsRef, updatedActions);

    // Update scores
    await updateMatchScores(gameId);
  } catch (error) {
    console.error("Error recording stat action:", error);
    throw error;
  }
}

/**
 * Undo last action (syncs across devices)
 */
export async function undoLastAction(gameId: string): Promise<void> {
  try {
    console.log("undoLastAction called for gameId:", gameId);
    const actionsRef = ref(realtimeDb, `active_matches/${gameId}/actions`);
    const snapshot = await get(actionsRef);

    console.log("Actions snapshot exists:", snapshot.exists());

    if (!snapshot.exists()) {
      console.log("No actions found to undo");
      return;
    }

    const actions = snapshot.val();
    console.log("Current actions:", actions);
    console.log("Actions type:", typeof actions);
    console.log("Actions is array:", Array.isArray(actions));

    if (!Array.isArray(actions) || actions.length === 0) {
      console.log("Actions array is empty or not an array");
      return;
    }

    console.log("Removing last action from array of", actions.length);

    // Remove last action
    const updatedActions = actions.slice(0, -1);
    console.log("Updated actions length:", updatedActions.length);

    await set(actionsRef, updatedActions);
    console.log("Actions updated in Firebase");

    // Recalculate scores
    await updateMatchScores(gameId);
    console.log("Scores recalculated");
  } catch (error) {
    console.error("Error undoing action:", error);
    throw error;
  }
}

/**
 * Update match scores based on actions
 */
async function updateMatchScores(gameId: string): Promise<void> {
  try {
    const actionsRef = ref(realtimeDb, `active_matches/${gameId}/actions`);
    const snapshot = await get(actionsRef);

    if (!snapshot.exists()) {
      await update(ref(realtimeDb, `active_matches/${gameId}`), {
        "teamA/score": 0,
        "teamB/score": 0,
      });
      return;
    }

    const actions = snapshot.val() as StatAction[];
    let teamAScore = 0;
    let teamBScore = 0;

    actions.forEach((action) => {
      if (action.team === "A") {
        teamAScore += action.displayPoints;
      } else {
        teamBScore += action.displayPoints;
      }
    });

    await update(ref(realtimeDb, `active_matches/${gameId}`), {
      "teamA/score": teamAScore,
      "teamB/score": teamBScore,
    });
  } catch (error) {
    console.error("Error updating scores:", error);
  }
}

/**
 * Pause/Resume timer
 */
export async function toggleTimer(gameId: string): Promise<void> {
  try {
    const timerRef = ref(realtimeDb, `active_matches/${gameId}/timer`);
    const snapshot = await get(timerRef);

    if (!snapshot.exists()) return;

    const timer = snapshot.val();
    const now = Date.now();

    if (timer.isPaused) {
      // Resume
      await update(timerRef, {
        isPaused: false,
        startedAt: now,
      });
    } else {
      // Pause
      await update(timerRef, {
        isPaused: true,
        pausedAt: now,
      });
    }
  } catch (error) {
    console.error("Error toggling timer:", error);
    throw error;
  }
}

/**
 * Update timer remaining seconds
 */
export async function updateTimerSeconds(
  gameId: string,
  remainingSeconds: number,
): Promise<void> {
  try {
    await update(ref(realtimeDb, `active_matches/${gameId}/timer`), {
      remainingSeconds,
    });
  } catch (error) {
    console.error("Error updating timer:", error);
  }
}

/**
 * End match and save to history
 */
export async function endMatch(gameId: string): Promise<MatchSummary> {
  try {
    const matchRef = ref(realtimeDb, `active_matches/${gameId}`);
    const snapshot = await get(matchRef);

    if (!snapshot.exists()) {
      throw new Error("No active match found");
    }

    const match = snapshot.val() as MatchSession;
    const now = Date.now();

    // Create match summary
    const summary: MatchSummary = {
      matchId: match.matchId,
      gameId: match.gameId,
      matchNumber: match.matchNumber,
      teamAScore: match.teamA.score,
      teamBScore: match.teamB.score,
      teamAPlayers: match.teamA.players.map((p) => p.userId),
      teamBPlayers: match.teamB.players.map((p) => p.userId),
      durationMinutes: match.timer.durationMinutes,
      startedAt: match.startedAt,
      endedAt: now,
      winner:
        match.teamA.score > match.teamB.score
          ? "A"
          : match.teamB.score > match.teamA.score
            ? "B"
            : "tie",
    };

    // Calculate player stats from actions and save to profiles
    const { recordMatchStats } = await import("./playerStats");
    const allPlayerIds = [
      ...match.teamA.players.map((p) => p.userId),
      ...match.teamB.players.map((p) => p.userId),
    ];

    const playerStatsArray = allPlayerIds.map((playerId) => {
      const stats = calculateLiveStats(match.actions, playerId);
      return {
        playerId,
        actualPoints: stats.actualPoints,
        rebounds: stats.rebounds,
        assists: stats.assists,
        steals: stats.steals,
        blocks: stats.blocks,
        turnovers: stats.turnovers,
        fieldGoalsMade: stats.fieldGoalsMade,
        fieldGoalsAttempted: stats.fieldGoalsAttempted,
        threePointersMade: stats.threePointersMade,
        threePointersAttempted: stats.threePointersAttempted,
        freeThrowsMade: stats.freeThrowsMade,
        freeThrowsAttempted: stats.freeThrowsAttempted,
      };
    });

    // Determine result for each team
    const teamAResult = summary.winner === "A" ? "win" : summary.winner === "B" ? "loss" : "win";
    const teamBResult = summary.winner === "B" ? "win" : summary.winner === "A" ? "loss" : "win";

    // Save Team A player stats
    const teamAStats = playerStatsArray?.filter((s) =>
      summary.teamAPlayers.includes(s.playerId),
    );
    await recordMatchStats(match.matchId, match.startedAt, teamAStats, teamAResult);

    // Save Team B player stats
    const teamBStats = playerStatsArray?.filter((s) =>
      summary.teamBPlayers.includes(s.playerId),
    );
    await recordMatchStats(match.matchId, match.startedAt, teamBStats, teamBResult);

    // Save to match history
    const historyRef = ref(
      realtimeDb,
      `match_history/${gameId}/${match.matchId}`,
    );
    await set(historyRef, {
      summary,
      match,
    });

    // Remove from active matches
    await remove(matchRef);

    return summary;
  } catch (error) {
    console.error("Error ending match:", error);
    throw error;
  }
}


/**
 * Get match history for a game
 */
export async function getMatchHistory(
  gameId: string,
): Promise<MatchSummary[]> {
  try {
    const historyRef = ref(realtimeDb, `match_history/${gameId}`);
    const snapshot = await get(historyRef);

    if (!snapshot.exists()) {
      return [];
    }

    const data = snapshot.val();
    const summaries: MatchSummary[] = [];

    Object.values(data).forEach((item: any) => {
      if (item.summary) {
        summaries.push(item.summary);
      }
    });

    // Sort by match number
    return summaries.sort((a, b) => a.matchNumber - b.matchNumber);
  } catch (error) {
    console.error("Error fetching match history:", error);
    return [];
  }
}

/**
 * Calculate live player stats from actions
 */
export function calculateLiveStats(
  actions: StatAction[],
  playerId: string,
): LivePlayerStats {
  const playerActions = (actions || []).filter((a) => a.playerId === playerId);
  const playerAction = playerActions[0]; // To get name and team

  const stats: LivePlayerStats = {
    playerId,
    playerName: playerAction?.playerName || "",
    team: playerAction?.team || "A",
    displayPoints: 0,
    actualPoints: 0,
    rebounds: 0,
    assists: 0,
    steals: 0,
    blocks: 0,
    turnovers: 0,
    fieldGoalsMade: 0,
    fieldGoalsAttempted: 0,
    threePointersMade: 0,
    threePointersAttempted: 0,
    freeThrowsMade: 0,
    freeThrowsAttempted: 0,
  };

  playerActions.forEach((action) => {
    stats.displayPoints += action.displayPoints;
    stats.actualPoints += action.actualPoints;

    switch (action.actionType) {
      case "regular_basket":
        stats.fieldGoalsMade++;
        stats.fieldGoalsAttempted++;
        break;
      case "three_pointer":
        stats.threePointersMade++;
        stats.threePointersAttempted++;
        stats.fieldGoalsAttempted++;
        break;
      case "free_throw":
        stats.freeThrowsMade++;
        stats.freeThrowsAttempted++;
        break;
      case "missed_fg":
        stats.fieldGoalsAttempted++;
        break;
      case "missed_3pt":
        stats.threePointersAttempted++;
        stats.fieldGoalsAttempted++;
        break;
      case "missed_ft":
        stats.freeThrowsAttempted++;
        break;
      case "rebound":
        stats.rebounds++;
        break;
      case "assist":
        stats.assists++;
        break;
      case "steal":
        stats.steals++;
        break;
      case "block":
        stats.blocks++;
        break;
      case "turnover":
        stats.turnovers++;
        break;
    }
  });

  return stats;
}
