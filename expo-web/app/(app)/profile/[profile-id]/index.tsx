import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { PlayerStatsCard } from "@/components/PlayerStatsCard";
import { ShootingPercentageBar } from "@/components/ShootingPercentageBar";
import { GameHistoryCard } from "@/components/GameHistoryCard";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, View } from "react-native";
import {
  ArrowLeftIcon,
  TrophyIcon,
  TargetIcon,
  ActivityIcon,
  ShieldIcon,
  ZapIcon,
  TrendingUpIcon,
  HistoryIcon,
} from "lucide-react-native";

import {
  getPlayerIdentityProfile,
  type PlayerIdentityProfileDoc,
} from "@/lib/playerProfile";
import {
  subscribeToCareerStats,
  calculateAverages,
  calculateShootingPercentages,
  getRecentGames,
  type CareerStats,
  type GameStats,
} from "@/lib/playerStats";

export default function PlayerProfileScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const profileIdParam = params["profile-id"];
  const profileId = typeof profileIdParam === "string" ? profileIdParam : "";

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] =
    useState<PlayerIdentityProfileDoc | null>(null);
  const [stats, setStats] = useState<CareerStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [games, setGames] = useState<GameStats[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);

  useEffect(() => {
    if (!profileId) {
      setLoading(false);
      setProfile(null);
      return;
    }

    let active = true;
    setLoading(true);
    void getPlayerIdentityProfile(profileId).then((doc) => {
      if (!active) return;
      setProfile(doc);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [profileId]);

  // Subscribe to real-time stats updates
  useEffect(() => {
    if (!profileId) {
      setStatsLoading(false);
      return;
    }

    setStatsLoading(true);
    const unsubscribe = subscribeToCareerStats(profileId, (careerStats) => {
      setStats(careerStats);
      setStatsLoading(false);
    });

    return () => unsubscribe();
  }, [profileId]);

  // Fetch recent games
  useEffect(() => {
    if (!profileId) {
      setGamesLoading(false);
      return;
    }

    setGamesLoading(true);
    void getRecentGames(profileId, 10).then((recentGames) => {
      setGames(recentGames);
      setGamesLoading(false);
    });
  }, [profileId]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  if (!profile) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-4">
        <Text
          variant="h3"
          className="mb-4 text-center text-foreground"
        >
          Profile not found
        </Text>
        <Text
          variant="muted"
          className="mb-6 text-center"
        >
          The requested player profile could not be found.
        </Text>
        <Button
          variant="outline"
          onPress={() => {
            router.back();
          }}
        >
          <Text>Go back</Text>
        </Button>
      </View>
    );
  }

  const username = profile.username;
  const displayName = `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim();

  // Calculate averages and percentages
  const averages = stats ? calculateAverages(stats) : null;
  const percentages = stats ? calculateShootingPercentages(stats) : null;

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="mx-auto w-full max-w-xl pb-8">
        <View className="relative rounded-b-3xl bg-primary px-6 pt-12 pb-8">
          <View className="mb-6 flex-row items-center justify-between">
            <Button
              size="icon"
              variant="ghost"
              className="rounded-full bg-card"
              onPress={() => {
                if (!router.canGoBack()) {
                  router.replace("/");
                } else {
                  router.back();
                }
              }}
            >
              <Icon as={ArrowLeftIcon} className="text-foreground" />
            </Button>
          </View>

          <View className="items-center">
            {profile.photoUrl ? (
              <Image
                source={{ uri: profile.photoUrl }}
                className="h-32 w-32 rounded-3xl bg-muted"
                resizeMode="cover"
              />
            ) : (
              <View className="h-32 w-32 items-center justify-center rounded-3xl bg-muted">
                <Text variant="small" className="text-foreground">
                  No photo
                </Text>
              </View>
            )}

            <View className="mt-4 items-center gap-1">
              {displayName ? (
                <Text className="text-xl font-semibold text-primary-foreground">
                  {displayName}
                </Text>
              ) : null}
              {username ? (
                <Text variant="muted" className="text-primary-foreground">
                  @{username}
                </Text>
              ) : null}
              {profile.barangay ? (
                <Text variant="small" className="mt-1 text-primary-foreground">
                  {profile.barangay}
                </Text>
              ) : null}
              {stats?.position && (
                <Text variant="small" className="text-primary-foreground opacity-90">
                  {stats.position}
                  {stats.jerseyNumber ? ` • #${stats.jerseyNumber}` : ""}
                </Text>
              )}
            </View>
          </View>
        </View>

        {statsLoading ? (
          <View className="px-6 pt-6">
            <ActivityIndicator />
          </View>
        ) : (
          <View className="px-6 pt-6">
            {/* Career Overview Section */}
            <View className="mb-6">
              <Text variant="h4" className="mb-4 text-foreground font-bold">
                Career Overview
              </Text>
              <View className="flex-row flex-wrap gap-3">
                <PlayerStatsCard
                  label="Games Played"
                  value={stats?.gamesPlayed ?? 0}
                  icon={ActivityIcon}
                  iconColor="text-blue-500"
                  decimalPlaces={0}
                />
                <PlayerStatsCard
                  label="Win-Loss"
                  value={`${stats?.wins ?? 0}-${stats?.losses ?? 0}`}
                  icon={TrophyIcon}
                  iconColor="text-yellow-500"
                  decimalPlaces={0}
                />
                <PlayerStatsCard
                  label="Win Percentage"
                  value={percentages?.winPercentage.toFixed(1) ?? "0.0"}
                  suffix="%"
                  icon={TrendingUpIcon}
                  iconColor="text-green-500"
                />
              </View>
            </View>

            {/* Scoring Section */}
            <View className="mb-6">
              <Text variant="h4" className="mb-4 text-foreground font-bold">
                Scoring
              </Text>
              <View className="flex-row flex-wrap gap-3">
                <PlayerStatsCard
                  label="Points Per Game"
                  value={averages?.ppg ?? 0}
                  icon={ZapIcon}
                  iconColor="text-orange-500"
                  decimalPlaces={1}
                />
                <PlayerStatsCard
                  label="Total Points"
                  value={stats?.totalPoints ?? 0}
                  icon={TargetIcon}
                  iconColor="text-red-500"
                  decimalPlaces={0}
                />
                <PlayerStatsCard
                  label="Career High"
                  value={stats?.careerHighPoints ?? 0}
                  icon={TrophyIcon}
                  iconColor="text-purple-500"
                  decimalPlaces={0}
                />
              </View>
            </View>

            {/* Performance Stats Section */}
            <View className="mb-6">
              <Text variant="h4" className="mb-4 text-foreground font-bold">
                Performance
              </Text>
              <View className="flex-row flex-wrap gap-3">
                <PlayerStatsCard
                  label="Rebounds Per Game"
                  value={averages?.rpg ?? 0}
                  suffix="RPG"
                  decimalPlaces={1}
                />
                <PlayerStatsCard
                  label="Assists Per Game"
                  value={averages?.apg ?? 0}
                  suffix="APG"
                  decimalPlaces={1}
                />
                <PlayerStatsCard
                  label="Steals Per Game"
                  value={averages?.spg ?? 0}
                  suffix="SPG"
                  decimalPlaces={1}
                />
                <PlayerStatsCard
                  label="Blocks Per Game"
                  value={averages?.bpg ?? 0}
                  suffix="BPG"
                  decimalPlaces={1}
                />
              </View>
            </View>

            {/* Shooting Efficiency Section */}
            <View className="mb-6">
              <Text variant="h4" className="mb-4 text-foreground font-bold">
                Shooting Efficiency
              </Text>
              <View className="flex-row flex-wrap gap-3">
                <ShootingPercentageBar
                  label="Field Goal %"
                  percentage={percentages?.fgPercentage ?? 0}
                  made={stats?.fieldGoalsMade ?? 0}
                  attempted={stats?.fieldGoalsAttempted ?? 0}
                />
                <ShootingPercentageBar
                  label="Three-Point %"
                  percentage={percentages?.threePointPercentage ?? 0}
                  made={stats?.threePointersMade ?? 0}
                  attempted={stats?.threePointersAttempted ?? 0}
                />
              </View>
            </View>

            {/* View All Games Button */}
            {stats && stats.gamesPlayed > 0 && (
              <View className="mb-6">
                <Button
                  variant="outline"
                  onPress={() => router.push(`/profile/${profileId}/history`)}
                  className="w-full"
                >
                  <Icon as={HistoryIcon} className="mr-2" />
                  <Text>View All Games ({stats.gamesPlayed})</Text>
                </Button>
              </View>
            )}

            {!stats && (
              <View className="items-center py-8">
                <ShieldIcon className="text-muted-foreground mb-2" size={48} />
                <Text className="text-muted-foreground text-center">
                  No statistics available yet
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
