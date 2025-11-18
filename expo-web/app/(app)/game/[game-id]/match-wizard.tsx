import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Alert,
} from "react-native";
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronRightIcon,
} from "lucide-react-native";
import { fetchRoster } from "@/lib/games";
import { canUpdateStats } from "@/lib/roles";
import { auth } from "@/lib/firebase";
import type { PlayerEntry } from "shared";
import { useRotationSuggestion } from "@/lib/match-state";
import { startNewMatch, getMatchHistory } from "@/lib/match-sync";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const DURATION_PRESETS = [15, 20, 25, 30, 35, 40, 45, 50, 55, 60];

export default function MatchWizardScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const gameIdParam = params["game-id"];
  const gameId = typeof gameIdParam === "string" ? gameIdParam : "";

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [starting, setStarting] = useState(false);

  // Step 1: Duration
  const [duration, setDuration] = useState(20);
  const [customDuration, setCustomDuration] = useState("");

  // Step 2: Players
  const [allPlayers, setAllPlayers] = useState<PlayerEntry[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);

  // Rotation suggestion
  const { suggestion, loading: suggestionLoading } = useRotationSuggestion(
    gameId,
    allPlayers,
  );

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

  // Fetch roster
  useEffect(() => {
    if (!gameId || !authorized) return;

    void fetchRoster(gameId).then((roster) => {
      setAllPlayers(roster);

      // Pre-select suggested players if available
      if (suggestion && suggestion.suggestedPlayers.length > 0) {
        setSelectedPlayerIds(suggestion.suggestedPlayers.map((p) => p.userId));
      }
    });
  }, [gameId, authorized, suggestion]);

  const togglePlayer = (playerId: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId],
    );
  };

  const handleStartMatch = async () => {
    if (selectedPlayerIds.length < 2) {
      Alert.alert("Error", "Please select at least 2 players");
      return;
    }

    if (selectedPlayerIds.length > 10) {
      Alert.alert("Error", "Maximum 10 players per match");
      return;
    }

    setStarting(true);
    try {
      // Get match history to determine match number
      const history = await getMatchHistory(gameId);
      const matchNumber = history.length + 1;

      // Sort selected players by queue number
      const selectedPlayers = allPlayers
        .filter((p) => selectedPlayerIds.includes(p.userId))
        .sort((a, b) => a.queueNumber - b.queueNumber);

      // Divide into teams (first half vs second half)
      const midPoint = Math.ceil(selectedPlayers.length / 2);
      const teamAPlayers = selectedPlayers.slice(0, midPoint);
      const teamBPlayers = selectedPlayers.slice(midPoint);

      await startNewMatch(
        gameId,
        { name: "Team A", players: teamAPlayers, score: 0 },
        { name: "Team B", players: teamBPlayers, score: 0 },
        duration,
        matchNumber,
      );

      router.replace({
        pathname: "/game/[game-id]/record-stats",
        params: { "game-id": gameId },
      });
    } catch (error) {
      console.error("Error starting match:", error);
      Alert.alert("Error", "Failed to start match. Please try again.");
      setStarting(false);
    }
  };

  if (loading) {
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
        <Button variant="outline" onPress={() => router.back()}>
          <Text>Go back</Text>
        </Button>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="bg-primary px-6 pt-12 pb-6">
        <View className="flex-row items-center gap-4 mb-4">
          <Button
            size="icon"
            variant="ghost"
            className="rounded-full bg-card"
            onPress={() => router.back()}
          >
            <Icon as={ArrowLeftIcon} className="text-foreground" />
          </Button>
          <View className="flex-1">
            <Text className="text-2xl font-bold text-primary-foreground">
              New Match Setup
            </Text>
            <Text className="text-primary-foreground opacity-90">
              Step {step} of 3
            </Text>
          </View>
        </View>

        {/* Progress */}
        <View className="flex-row gap-2">
          {[1, 2, 3].map((s) => (
            <View
              key={s}
              className={cn(
                "h-1 flex-1 rounded-full",
                s <= step ? "bg-primary-foreground" : "bg-primary-foreground/20",
              )}
            />
          ))}
        </View>
      </View>

      <ScrollView className="flex-1 px-6 pt-6">
        {/* Step 1: Duration */}
        {step === 1 && (
          <View>
            <Text className="text-xl font-bold text-foreground mb-2">
              Match Duration
            </Text>
            <Text variant="muted" className="mb-6">
              How long should this match last?
            </Text>

            <View className="flex-row flex-wrap gap-3 mb-6">
              {DURATION_PRESETS.map((preset) => (
                <Pressable
                  key={preset}
                  onPress={() => setDuration(preset)}
                  className={cn(
                    "px-6 py-4 rounded-xl border-2",
                    duration === preset
                      ? "bg-primary border-primary"
                      : "bg-card border-border",
                  )}
                >
                  <Text
                    className={cn(
                      "font-bold",
                      duration === preset ? "text-primary-foreground" : "text-foreground",
                    )}
                  >
                    {preset} min
                  </Text>
                </Pressable>
              ))}
            </View>

            <Button
              className="w-full"
              onPress={() => setStep(2)}
            >
              <Text>Next: Select Players</Text>
              <Icon as={ChevronRightIcon} className="ml-2" />
            </Button>
          </View>
        )}

        {/* Step 2: Player Selection */}
        {step === 2 && (
          <View className="pb-8">
            <Text className="text-xl font-bold text-foreground mb-2">
              Select Players
            </Text>
            {suggestion && (
              <Text variant="muted" className="mb-4">
                {suggestion.reasoning}
              </Text>
            )}

            <View className="gap-3 mb-6">
              {allPlayers.map((player) => {
                const isSelected = selectedPlayerIds.includes(player.userId);
                const matchCount = suggestion?.playerMatchCounts[player.userId] || 0;

                return (
                  <Pressable
                    key={player.userId}
                    onPress={() => togglePlayer(player.userId)}
                    className={cn(
                      "flex-row items-center p-4 rounded-xl border-2",
                      isSelected
                        ? "bg-primary/10 border-primary"
                        : "bg-card border-border",
                    )}
                  >
                    {isSelected && (
                      <View className="bg-primary rounded-full p-1 mr-3">
                        <Icon as={CheckIcon} size={16} className="text-primary-foreground" />
                      </View>
                    )}

                    <Avatar alt={player.name} className="mr-3">
                      <AvatarImage source={{ uri: player.identityProfile?.photoUrl }} />
                      <AvatarFallback>
                        <Text>{player.name.charAt(0).toUpperCase()}</Text>
                      </AvatarFallback>
                    </Avatar>

                    <View className="flex-1">
                      <Text className="font-bold text-foreground">
                        #{player.queueNumber} {player.identityProfile?.username || player.name}
                      </Text>
                      <Text variant="small" className="text-muted-foreground">
                        Played {matchCount} match{matchCount !== 1 ? "es" : ""} today
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View className="flex-row gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onPress={() => setStep(1)}
              >
                <Text>Back</Text>
              </Button>
              <Button
                className="flex-1"
                onPress={() => setStep(3)}
                disabled={selectedPlayerIds.length < 2}
              >
                <Text>Next: Review</Text>
                <Icon as={ChevronRightIcon} className="ml-2" />
              </Button>
            </View>
          </View>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <View className="pb-8">
            <Text className="text-xl font-bold text-foreground mb-2">
              Review & Start
            </Text>
            <Text variant="muted" className="mb-6">
              Double-check everything before starting the match
            </Text>

            {(() => {
              const selectedPlayers = allPlayers
                .filter((p) => selectedPlayerIds.includes(p.userId))
                .sort((a, b) => a.queueNumber - b.queueNumber);

              const midPoint = Math.ceil(selectedPlayers.length / 2);
              const teamAPlayers = selectedPlayers.slice(0, midPoint);
              const teamBPlayers = selectedPlayers.slice(midPoint);

              return (
                <>
                  {/* Duration */}
                  <View className="bg-card rounded-xl p-4 mb-4 border border-border">
                    <Text variant="small" className="text-muted-foreground mb-1">
                      Duration
                    </Text>
                    <Text className="text-2xl font-bold text-foreground">
                      {duration} minutes
                    </Text>
                  </View>

                  {/* Teams */}
                  <View className="gap-4 mb-6">
                    <View className="bg-primary/10 rounded-xl p-4 border border-primary">
                      <Text className="font-bold text-primary mb-2">
                        Team A ({teamAPlayers.length} players)
                      </Text>
                      {teamAPlayers.map((p) => (
                        <Text key={p.userId} variant="small" className="text-foreground">
                          #{p.queueNumber} {p.identityProfile?.username || p.name}
                        </Text>
                      ))}
                    </View>

                    <View className="bg-blue-500/10 rounded-xl p-4 border border-blue-500">
                      <Text className="font-bold text-blue-500 mb-2">
                        Team B ({teamBPlayers.length} players)
                      </Text>
                      {teamBPlayers.map((p) => (
                        <Text key={p.userId} variant="small" className="text-foreground">
                          #{p.queueNumber} {p.identityProfile?.username || p.name}
                        </Text>
                      ))}
                    </View>
                  </View>

                  <View className="flex-row gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onPress={() => setStep(2)}
                      disabled={starting}
                    >
                      <Text>Back</Text>
                    </Button>
                    <Button
                      className="flex-1"
                      onPress={handleStartMatch}
                      disabled={starting}
                    >
                      {starting ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text>Start Match!</Text>
                      )}
                    </Button>
                  </View>
                </>
              );
            })()}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
