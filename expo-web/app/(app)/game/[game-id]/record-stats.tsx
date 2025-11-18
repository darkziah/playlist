import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { LiveScoreBoard } from "@/components/LiveScoreBoard";
import { PlayerQuickStats } from "@/components/PlayerQuickStats";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  View,
  Alert,
} from "react-native";
import {
  ArrowLeftIcon,
  UndoIcon,
  StopCircleIcon,
  PlusCircleIcon,
} from "lucide-react-native";

import { fetchGameById, fetchRoster } from "@/lib/games";
import { canUpdateStats } from "@/lib/roles";
import { auth } from "@/lib/firebase";
import type { Game, PlayerEntry } from "shared";
import {
  useActiveMatch,
  useMatchTimer,
  useStatRecording,
  usePlayerStats,
  useMatchHistory,
  useEndMatch,
} from "@/lib/match-state";
import type { ScoringActionType, MatchSession } from "@/lib/live-game-types";

// Helper component to use hooks properly
function PlayerStatsCard({
  player,
  team,
  activeMatch,
  onRecordStat,
  disabled,
  scoringMode,
}: {
  player: PlayerEntry;
  team: "A" | "B";
  activeMatch: MatchSession;
  onRecordStat: (playerId: string, playerName: string, statType: ScoringActionType) => void;
  disabled: boolean;
  scoringMode: "custom" | "nba";
}) {
  const stats = usePlayerStats(activeMatch, player.userId);
  return (
    <PlayerQuickStats
      player={player}
      team={team}
      stats={stats}
      onRecordStat={onRecordStat}
      disabled={disabled}
      scoringMode={scoringMode}
    />
  );
}

export default function RecordStatsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const gameIdParam = params["game-id"];
  const gameId = typeof gameIdParam === "string" ? gameIdParam : "";

  const [game, setGame] = useState<Game | null>(null);
  const [roster, setRoster] = useState<PlayerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [scoringMode, setScoringMode] = useState<"custom" | "nba">("custom");

  // Real-time match state
  const { activeMatch, loading: matchLoading } = useActiveMatch(gameId);
  const { formattedTime, togglePause, remainingSeconds } = useMatchTimer(activeMatch);
  const { recordStat, undo, recording } = useStatRecording(activeMatch);
  const { matches: matchHistory, loading: historyLoading, refresh: refreshHistory } = useMatchHistory(gameId);
  const { endMatch, ending } = useEndMatch();

  // Calculate scores based on scoring mode
  const getDisplayScore = (actions: any[], team: "A" | "B") => {
    if (!actions) return 0;

    return actions
      .filter((a) => a.team === team)
      .reduce((sum, action) => {
        if (scoringMode === "custom") {
          return sum + action.displayPoints; // 1pt regular, 2pt three-pointer
        } else {
          return sum + action.actualPoints; // 2pts regular, 3pts three-pointer
        }
      }, 0);
  };

  const teamAScore = activeMatch ? getDisplayScore(activeMatch.actions, "A") : 0;
  const teamBScore = activeMatch ? getDisplayScore(activeMatch.actions, "B") : 0;

  // Check authorization
  useEffect(() => {
    if (!auth.currentUser) {
      setAuthorized(false);
      setLoading(false);
      return;
    }

    void canUpdateStats(auth.currentUser.uid).then((can) => {
      setAuthorized(can);
      setLoading(false);
    });
  }, []);

  // Fetch game data
  useEffect(() => {
    if (!gameId || !authorized) return;

    void Promise.all([
      fetchGameById(gameId),
      fetchRoster(gameId),
    ]).then(([gameData, rosterData]) => {
      setGame(gameData);
      setRoster(rosterData);
    });
  }, [gameId, authorized]);

  const handleRecordStat = (
    playerId: string,
    playerName: string,
    statType: ScoringActionType,
  ) => {
    if (!activeMatch) return;

    // Determine points and team
    const player = [...activeMatch.teamA.players, ...activeMatch.teamB.players].find(
      (p) => p.userId === playerId,
    );
    if (!player) return;

    const team: "A" | "B" = activeMatch.teamA.players.some((p) => p.userId === playerId) ? "A" : "B";

    let displayPoints = 0;
    let actualPoints = 0;

    switch (statType) {
      case "regular_basket":
        displayPoints = 1; // Custom scoring
        actualPoints = 2; // NBA scoring
        break;
      case "three_pointer":
        displayPoints = 2; // Custom scoring
        actualPoints = 3; // NBA scoring
        break;
      case "free_throw":
        displayPoints = 1;
        actualPoints = 1;
        break;
      default:
        displayPoints = 0;
        actualPoints = 0;
    }

    const action = {
      id: `${Date.now()}_${playerId}_${statType}`,
      timestamp: Date.now(),
      playerId,
      playerName,
      team,
      actionType: statType,
      displayPoints,
      actualPoints,
    };

    void recordStat(action);
  };

  const handleEndMatch = async () => {
    if (!activeMatch) {
      Alert.alert("Error", "No active match found");
      return;
    }

    // Use native confirm on web since Alert.alert doesn't work properly
    const confirmed = window.confirm(
      "Are you sure you want to end this match? Stats will be saved to all players."
    );

    if (!confirmed) {
      return;
    }

    try {
      const summary = await endMatch(gameId);
      await refreshHistory();
      Alert.alert("Success", "Match ended and stats saved!");
    } catch (error) {
      console.error("Error ending match:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      Alert.alert("Error", `Failed to end match: ${errorMessage}`);
    }
  };

  const handleUndoLast = async () => {
    if (!activeMatch) {
      return;
    }

    if (!activeMatch.actions || activeMatch.actions.length === 0) {
      return;
    }

    try {
      await undo();
    } catch (error) {
      console.error("Error undoing action:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      Alert.alert("Error", `Failed to undo: ${errorMessage}`);
    }
  };

  if (loading || matchLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  if (!authorized) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-4">
        <Text variant="h3" className="mb-4 text-center text-foreground">
          Unauthorized
        </Text>
        <Text variant="muted" className="mb-6 text-center">
          Only game masters can manage live scoring.
        </Text>
        <Button variant="outline" onPress={() => router.back()}>
          <Text>Go back</Text>
        </Button>
      </View>
    );
  }

  if (!game) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-4">
        <Text variant="h3" className="mb-4 text-center text-foreground">
          Game not found
        </Text>
        <Button variant="outline" onPress={() => router.back()}>
          <Text>Go back</Text>
        </Button>
      </View>
    );
  }

  // No active match - show match history and start button
  if (!activeMatch) {
    return (
      <ScrollView className="flex-1 bg-background">
        <View className="mx-auto w-full max-w-2xl pb-8">
          {/* Header */}
          <View className="bg-primary px-6 pt-12 pb-6">
            <View className="flex-row items-center gap-4 mb-4">
              <Button
                size="icon"
                variant="ghost"
                className="rounded-full bg-card"
                onPress={() => {
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    router.replace("/");
                  }
                }}
              >
                <Icon as={ArrowLeftIcon} className="text-foreground" />
              </Button>
              <View className="flex-1">
                <Text className="text-2xl font-bold text-primary-foreground">
                  Live Scoring
                </Text>
                <Text className="text-primary-foreground opacity-90">
                  {game.title}
                </Text>
              </View>
            </View>
          </View>

          {/* Match History */}
          <View className="px-6 pt-6">
            <Text className="text-lg font-bold text-foreground mb-4">
              Match History
            </Text>

            {historyLoading ? (
              <ActivityIndicator />
            ) : matchHistory?.length === 0 ? (
              <Text variant="muted" className="text-center py-8">
                No matches played yet. Start the first match!
              </Text>
            ) : (
              <View className="gap-3 mb-6">
                {matchHistory.map((match) => (
                  <View
                    key={match.matchId}
                    className="bg-card rounded-xl border border-border p-4"
                  >
                    <View className="flex-row justify-between items-center">
                      <Text variant="small" className="text-muted-foreground">
                        Match #{match.matchNumber}
                      </Text>
                      <Text variant="small" className="text-muted-foreground">
                        {new Date(match.endedAt).toLocaleTimeString()}
                      </Text>
                    </View>
                    <View className="flex-row justify-around items-center mt-2">
                      <Text className="text-2xl font-bold">
                        {match.teamAScore}
                      </Text>
                      <Text variant="muted">vs</Text>
                      <Text className="text-2xl font-bold">
                        {match.teamBScore}
                      </Text>
                    </View>
                    {match.winner && (
                      <Text variant="small" className="text-center mt-2 text-primary">
                        Team {match.winner} won
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Start New Match Button */}
            <Button
              className="w-full"
              onPress={() => {
                router.push(`/game/${gameId}/match-wizard` as any);
              }}
            >
              <Icon as={PlusCircleIcon} className="mr-2" />
              <Text>Start New Match</Text>
            </Button>
          </View>
        </View>
      </ScrollView>
    );
  }

  // Active match - show live scoring
  const teamAPlayers = activeMatch.teamA.players;
  const teamBPlayers = activeMatch.teamB.players;

  return (
    <View className="flex-1 bg-background">
      {/* Scoreboard */}
      <LiveScoreBoard
        teamAName="Team A"
        teamBName="Team B"
        teamAScore={teamAScore}
        teamBScore={teamBScore}
        formattedTime={formattedTime}
        isPaused={activeMatch.timer.isPaused}
        onTogglePause={togglePause}
        matchNumber={activeMatch.matchNumber}
        showSyncIndicator={true}
        scoringMode={scoringMode}
        onToggleScoringMode={() => setScoringMode(mode => mode === "custom" ? "nba" : "custom")}
        onUndo={handleUndoLast}
        undoDisabled={recording || ending || !activeMatch.actions || activeMatch.actions.length === 0}
      />

      {/* Players */}
      <ScrollView className="flex-1 px-4 pt-4">
        {/* Team A */}
        <Text className="text-lg font-bold text-primary mb-3">
          Team A
        </Text>
        {teamAPlayers.map((player) => (
          <PlayerStatsCard
            key={player.userId}
            player={player}
            team="A"
            activeMatch={activeMatch}
            onRecordStat={handleRecordStat}
            disabled={recording || ending}
            scoringMode={scoringMode}
          />
        ))}

        {/* Team B */}
        <Text className="text-lg font-bold text-blue-500 mb-3 mt-6">
          Team B
        </Text>
        {teamBPlayers.map((player) => (
          <PlayerStatsCard
            key={player.userId}
            player={player}
            team="B"
            activeMatch={activeMatch}
            onRecordStat={handleRecordStat}
            disabled={recording || ending}
            scoringMode={scoringMode}
          />
        ))}

        {/* Action Buttons */}
        <View className="gap-3 mt-6 mb-8">
          <Button
            variant="destructive"
            onPress={handleEndMatch}
            disabled={recording || ending}
          >
            {ending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon as={StopCircleIcon} className="mr-2" />
                <Text>End Match</Text>
              </>
            )}
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}
