import { useState, useEffect, useCallback, useRef } from "react";
import type {
  MatchSession,
  MatchSummary,
  StatAction,
  LivePlayerStats,
  RotationSuggestion,
} from "./live-game-types";
import type { PlayerEntry } from "shared";
import {
  getActiveMatch,
  subscribeToActiveMatch,
  recordStatAction as recordStatActionSync,
  undoLastAction as undoLastActionSync,
  toggleTimer as toggleTimerSync,
  updateTimerSeconds,
  endMatch as endMatchSync,
  getMatchHistory as getMatchHistorySync,
  calculateLiveStats,
} from "./match-sync";
import {
  calculateRotationSuggestion,
  updateRotationAfterMatch,
} from "./rotation-tracker";

/**
 * Hook for managing active match with real-time sync
 */
export function useActiveMatch(gameId: string) {
  const [activeMatch, setActiveMatch] = useState<MatchSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    // Subscribe to real-time updates
    const unsubscribe = subscribeToActiveMatch(gameId, (match) => {
      if (!active) return;
      setActiveMatch(match);
      setLoading(false);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [gameId]);

  return { activeMatch, loading };
}

/**
 * Hook for managing match timer
 */
export function useMatchTimer(match: MatchSession | null) {
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!match || !match.timer) {
      setRemainingSeconds(0);
      return;
    }

    setRemainingSeconds(match.timer.remainingSeconds);

    // Clear existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Start timer if not paused
    if (!match.timer.isPaused && match.status === "active") {
      timerRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          const newSeconds = Math.max(0, prev - 1);

          // Update Firebase every 5 seconds to avoid too many writes
          if (newSeconds % 5 === 0) {
            void updateTimerSeconds(match.gameId, newSeconds);
          }

          return newSeconds;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [match]);

  const togglePause = useCallback(async () => {
    if (!match) return;
    await toggleTimerSync(match.gameId);
  }, [match]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  return {
    remainingSeconds,
    formattedTime: formatTime(remainingSeconds),
    togglePause,
    isTimeUp: remainingSeconds === 0,
  };
}

/**
 * Hook for recording stats
 */
export function useStatRecording(match: MatchSession | null) {
  const [recording, setRecording] = useState(false);

  const recordStat = useCallback(
    async (action: StatAction) => {
      if (!match) return;

      setRecording(true);
      try {
        await recordStatActionSync(match.gameId, action);
      } catch (error) {
        console.error("Error recording stat:", error);
        throw error;
      } finally {
        setRecording(false);
      }
    },
    [match],
  );

  const undo = useCallback(async () => {
    if (!match) {
      console.log("Undo called but no match");
      return;
    }

    console.log("Undo hook: calling undoLastActionSync with gameId:", match.gameId);
    setRecording(true);
    try {
      await undoLastActionSync(match.gameId);
      console.log("Undo hook: undoLastActionSync completed");
    } catch (error) {
      console.error("Undo hook: Error undoing action:", error);
      throw error;
    } finally {
      setRecording(false);
      console.log("Undo hook: recording set to false");
    }
  }, [match]);

  return { recordStat, undo, recording };
}

/**
 * Hook for player stats during match
 */
export function usePlayerStats(match: MatchSession | null, playerId: string) {
  const [stats, setStats] = useState<LivePlayerStats | null>(null);

  useEffect(() => {
    if (!match || !playerId) {
      setStats(null);
      return;
    }

    const playerStats = calculateLiveStats(match.actions, playerId);
    setStats(playerStats);
  }, [match, playerId]);

  return stats;
}

/**
 * Hook for match history
 */
export function useMatchHistory(gameId: string) {
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void getMatchHistorySync(gameId).then((history) => {
      if (!active) return;
      setMatches(history);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [gameId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const history = await getMatchHistorySync(gameId);
    setMatches(history);
    setLoading(false);
  }, [gameId]);

  return { matches, loading, refresh };
}

/**
 * Hook for rotation suggestions
 */
export function useRotationSuggestion(
  gameId: string,
  allPlayers: PlayerEntry[],
) {
  const [suggestion, setSuggestion] = useState<RotationSuggestion | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSuggestion = useCallback(async () => {
    setLoading(true);
    try {
      const result = await calculateRotationSuggestion(gameId, allPlayers);
      setSuggestion(result);
    } catch (error) {
      console.error("Error fetching rotation suggestion:", error);
    } finally {
      setLoading(false);
    }
  }, [gameId, allPlayers]);

  useEffect(() => {
    void fetchSuggestion();
  }, [fetchSuggestion]);

  return { suggestion, loading, refresh: fetchSuggestion };
}

/**
 * Hook for ending match
 */
export function useEndMatch() {
  const [ending, setEnding] = useState(false);

  const endMatch = useCallback(async (gameId: string) => {
    setEnding(true);
    try {
      const summary = await endMatchSync(gameId);

      // Update rotation tracking
      await updateRotationAfterMatch(
        gameId,
        summary.matchNumber,
        summary.teamAPlayers,
        summary.teamBPlayers,
      );

      return summary;
    } catch (error) {
      console.error("Error ending match:", error);
      throw error;
    } finally {
      setEnding(false);
    }
  }, []);

  return { endMatch, ending };
}
