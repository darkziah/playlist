import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { PlayerStatsCard } from "@/components/PlayerStatsCard";
import { ShootingPercentageBar } from "@/components/ShootingPercentageBar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import {
  ArrowLeftIcon,
  CalendarIcon,
  CheckCircle2Icon,
  XCircleIcon,
  TrophyIcon,
  TargetIcon,
  ActivityIcon,
  ZapIcon,
  ClockIcon,
} from "lucide-react-native";

import { getSingleGame, type GameStats } from "@/lib/playerStats";
import {
  getPlayerIdentityProfile,
  type PlayerIdentityProfileDoc,
} from "@/lib/playerProfile";

export default function GameDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const profileIdParam = params["profile-id"];
  const gameIdParam = params["game-id"];
  const profileId = typeof profileIdParam === "string" ? profileIdParam : "";
  const gameId = typeof gameIdParam === "string" ? gameIdParam : "";

  const [profile, setProfile] =
    useState<PlayerIdentityProfileDoc | null>(null);
  const [game, setGame] = useState<GameStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileId || !gameId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    Promise.all([
      getPlayerIdentityProfile(profileId),
      getSingleGame(profileId, gameId),
    ]).then(([profileData, gameData]) => {
      setProfile(profileData);
      setGame(gameData);
      setLoading(false);
    });
  }, [profileId, gameId]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  if (!game) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-4">
        <Text variant="h3" className="mb-4 text-center text-foreground">
          Game not found
        </Text>
        <Text variant="muted" className="mb-6 text-center">
          The requested game could not be found.
        </Text>
        <Button variant="outline" onPress={() => router.back()}>
          <Text>Go back</Text>
        </Button>
      </View>
    );
  }

  const isWin = game.result === "win";
  const gameDate = new Date(game.date);
  const formattedDate = gameDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const fgPercentage =
    game.fieldGoalsAttempted > 0
      ? (game.fieldGoalsMade / game.fieldGoalsAttempted) * 100
      : 0;

  const threePointPercentage =
    game.threePointersAttempted > 0
      ? (game.threePointersMade / game.threePointersAttempted) * 100
      : 0;

  const displayName = profile
    ? `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim()
    : "Player";

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="mx-auto w-full max-w-xl pb-8">
        {/* Header */}
        <View
          className={`relative rounded-b-3xl px-6 pt-12 pb-8 ${isWin ? "bg-green-600" : "bg-red-600"
            }`}
        >
          <View className="mb-6 flex-row items-center justify-between">
            <Button
              size="icon"
              variant="ghost"
              className="rounded-full bg-card"
              onPress={() => router.back()}
            >
              <Icon as={ArrowLeftIcon} className="text-foreground" />
            </Button>
          </View>

          {/* Result Badge */}
          <View className="items-center mb-4">
            <View className="flex-row items-center gap-2 mb-2">
              <Icon
                as={isWin ? CheckCircle2Icon : XCircleIcon}
                size={32}
                className="text-white"
              />
              <Text className="text-3xl font-bold text-white">
                {isWin ? "VICTORY" : "DEFEAT"}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Icon as={CalendarIcon} size={16} className="text-white opacity-90" />
              <Text className="text-white opacity-90">{formattedDate}</Text>
            </View>
            {game.opponentTeam && (
              <Text className="text-white opacity-90 mt-2">
                vs {game.opponentTeam}
              </Text>
            )}
          </View>

          {/* Player Name */}
          <View className="items-center mt-4">
            <Text className="text-xl font-semibold text-white">
              {displayName}
            </Text>
          </View>
        </View>

        {/* Stats Sections */}
        <View className="px-6 pt-6">
          {/* Main Performance */}
          <View className="mb-6">
            <Text variant="h4" className="mb-4 text-foreground font-bold">
              Performance
            </Text>
            <View className="flex-row flex-wrap gap-3">
              <PlayerStatsCard
                label="Points"
                value={game.points}
                icon={ZapIcon}
                iconColor="text-orange-500"
                decimalPlaces={0}
              />
              <PlayerStatsCard
                label="Rebounds"
                value={game.rebounds}
                icon={TargetIcon}
                iconColor="text-blue-500"
                decimalPlaces={0}
              />
              <PlayerStatsCard
                label="Assists"
                value={game.assists}
                icon={ActivityIcon}
                iconColor="text-green-500"
                decimalPlaces={0}
              />
            </View>
          </View>

          {/* Defense */}
          <View className="mb-6">
            <Text variant="h4" className="mb-4 text-foreground font-bold">
              Defense
            </Text>
            <View className="flex-row flex-wrap gap-3">
              <PlayerStatsCard
                label="Steals"
                value={game.steals}
                decimalPlaces={0}
              />
              <PlayerStatsCard
                label="Blocks"
                value={game.blocks}
                decimalPlaces={0}
              />
              {game.minutesPlayed && (
                <PlayerStatsCard
                  label="Minutes Played"
                  value={game.minutesPlayed}
                  icon={ClockIcon}
                  iconColor="text-purple-500"
                  decimalPlaces={0}
                />
              )}
            </View>
          </View>

          {/* Shooting Efficiency */}
          <View className="mb-6">
            <Text variant="h4" className="mb-4 text-foreground font-bold">
              Shooting
            </Text>
            <View className="flex-row flex-wrap gap-3">
              <ShootingPercentageBar
                label="Field Goal %"
                percentage={fgPercentage}
                made={game.fieldGoalsMade}
                attempted={game.fieldGoalsAttempted}
              />
              <ShootingPercentageBar
                label="Three-Point %"
                percentage={threePointPercentage}
                made={game.threePointersMade}
                attempted={game.threePointersAttempted}
              />
            </View>
          </View>

          {/* Game Summary Card */}
          <View className="rounded-2xl bg-card p-6 border border-border">
            <Text variant="h4" className="mb-4 text-foreground font-bold">
              Game Summary
            </Text>
            <View className="space-y-2">
              <View className="flex-row justify-between py-2 border-b border-border">
                <Text className="text-muted-foreground">Result</Text>
                <Text
                  className={`font-bold ${isWin ? "text-green-500" : "text-red-500"}`}
                >
                  {isWin ? "Win" : "Loss"}
                </Text>
              </View>
              <View className="flex-row justify-between py-2 border-b border-border">
                <Text className="text-muted-foreground">Date</Text>
                <Text className="text-foreground">{formattedDate}</Text>
              </View>
              {game.opponentTeam && (
                <View className="flex-row justify-between py-2 border-b border-border">
                  <Text className="text-muted-foreground">Opponent</Text>
                  <Text className="text-foreground">{game.opponentTeam}</Text>
                </View>
              )}
              <View className="flex-row justify-between py-2">
                <Text className="text-muted-foreground">Game ID</Text>
                <Text className="text-foreground font-mono text-xs">
                  {game.gameId}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
