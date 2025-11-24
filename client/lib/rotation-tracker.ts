import { ref, get, set, update } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";
import type {
  RotationState,
  RotationSuggestion,
} from "./live-game-types";
import type { PlayerEntry } from "shared";

/**
 * Get or initialize rotation state for a game
 */
export async function getRotationState(
  gameId: string,
): Promise<RotationState> {
  try {
    const rotationRef = ref(realtimeDb, `rotation_state/${gameId}`);
    const snapshot = await get(rotationRef);

    if (snapshot.exists()) {
      return snapshot.val() as RotationState;
    }

    // Initialize new rotation state
    const initialState: RotationState = {
      gameId,
      playerMatches: {},
      currentRotationSlot: 1,
      totalMatches: 0,
    };

    await set(rotationRef, initialState);
    return initialState;
  } catch (error) {
    console.error("Error getting rotation state:", error);
    throw error;
  }
}

/**
 * Update rotation state after match ends
 */
export async function updateRotationAfterMatch(
  gameId: string,
  matchNumber: number,
  teamAPlayerIds: string[],
  teamBPlayerIds: string[],
): Promise<void> {
  try {
    const rotationState = await getRotationState(gameId);
    const allPlayerIds = [...teamAPlayerIds, ...teamBPlayerIds];

    // Update player matches
    const updatedPlayerMatches = { ...rotationState.playerMatches };
    allPlayerIds.forEach((playerId) => {
      if (!updatedPlayerMatches[playerId]) {
        updatedPlayerMatches[playerId] = [];
      }
      updatedPlayerMatches[playerId].push(matchNumber);
    });

    // Update rotation slot (increment by 10 for next match)
    const newRotationSlot = rotationState.currentRotationSlot + 10;

    await update(ref(realtimeDb, `rotation_state/${gameId}`), {
      playerMatches: updatedPlayerMatches,
      currentRotationSlot: newRotationSlot,
      totalMatches: matchNumber,
    });
  } catch (error) {
    console.error("Error updating rotation:", error);
    throw error;
  }
}

/**
 * Calculate rotation suggestion for next match
 * Prioritizes players who have played least, following queue order
 */
export async function calculateRotationSuggestion(
  gameId: string,
  allPlayers: PlayerEntry[],
): Promise<RotationSuggestion> {
  try {
    const rotationState = await getRotationState(gameId);
    const playerMatchCounts: Record<string, number> = {};

    // Count matches for each player (handle undefined safely)
    allPlayers.forEach((player) => {
      const matches = rotationState.playerMatches?.[player.userId] || [];
      playerMatchCounts[player.userId] = matches.length;
    });

    // Sort players by queue number
    const sortedPlayers = [...allPlayers].sort(
      (a, b) => a.queueNumber - b.queueNumber,
    );

    // Determine starting position based on rotation
    const totalPlayers = sortedPlayers.length;
    let startIndex = (rotationState.currentRotationSlot - 1) % totalPlayers;

    // Get next 10 players in rotation order (wrapping around)
    const suggestedPlayers: PlayerEntry[] = [];
    for (let i = 0; i < Math.min(10, totalPlayers); i++) {
      const index = (startIndex + i) % totalPlayers;
      suggestedPlayers.push(sortedPlayers[index]);
    }

    // Balance suggestion: if some players have played significantly more,
    // swap them out for players who have played less
    const matchCounts = Object.values(playerMatchCounts).filter((count) => count > 0);
    const minPlayed = matchCounts.length > 0 ? Math.min(...matchCounts) : 0;
    const maxPlayed = matchCounts.length > 0 ? Math.max(...matchCounts) : 0;

    let reasoning = `Following rotation order starting from slot ${rotationState.currentRotationSlot}.`;

    if (maxPlayed - minPlayed > 1) {
      // Significant imbalance - suggest balancing
      const leastPlayedPlayers = sortedPlayers.filter(
        (p) => (playerMatchCounts[p.userId] || 0) === minPlayed,
      );

      // Replace players who've played most with those who've played least
      const mostPlayedInSuggestion = suggestedPlayers.filter(
        (p) =>
          (playerMatchCounts[p.userId] || 0) >= minPlayed + 2,
      );

      mostPlayedInSuggestion.forEach((mostPlayed, idx) => {
        if (leastPlayedPlayers[idx]) {
          const replaceIndex = suggestedPlayers.findIndex(
            (p) => p.userId === mostPlayed.userId,
          );
          if (replaceIndex !== -1) {
            suggestedPlayers[replaceIndex] = leastPlayedPlayers[idx];
          }
        }
      });

      reasoning = `Balancing play time - prioritizing players who have played ${minPlayed} match${minPlayed !== 1 ? "es" : ""}.`;
    }

    return {
      suggestedPlayers,
      reasoning,
      playerMatchCounts,
    };
  } catch (error) {
    console.error("Error calculating rotation:", error);
    throw error;
  }
}

/**
 * Get match count for a specific player
 */
export async function getPlayerMatchCount(
  gameId: string,
  playerId: string,
): Promise<number> {
  try {
    const rotationState = await getRotationState(gameId);
    const matches = rotationState.playerMatches[playerId] || [];
    return matches.length;
  } catch (error) {
    console.error("Error getting player match count:", error);
    return 0;
  }
}

/**
 * Reset rotation state (for testing or new game days)
 */
export async function resetRotationState(gameId: string): Promise<void> {
  try {
    const initialState: RotationState = {
      gameId,
      playerMatches: {},
      currentRotationSlot: 1,
      totalMatches: 0,
    };

    await set(ref(realtimeDb, `rotation_state/${gameId}`), initialState);
  } catch (error) {
    console.error("Error resetting rotation:", error);
    throw error;
  }
}
