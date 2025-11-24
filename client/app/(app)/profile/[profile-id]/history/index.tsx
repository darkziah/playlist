import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { GameHistoryCard } from "@/components/GameHistoryCard";
import { useLocalSearchParams, useRouter, Link } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  ActivityIndicator,
  FlatList,
  View,
  RefreshControl,
  Pressable,
} from "react-native";
import { ArrowLeftIcon, HistoryIcon } from "lucide-react-native";

import { getPaginatedGames, type GameStats } from "@/lib/playerStats";
import {
  getPlayerIdentityProfile,
  type PlayerIdentityProfileDoc,
} from "@/lib/playerProfile";
import { useEffect, useState } from "react";

export default function GameHistoryScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const profileIdParam = params["profile-id"];
  const profileId = typeof profileIdParam === "string" ? profileIdParam : "";

  const [profile, setProfile] =
    useState<PlayerIdentityProfileDoc | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Fetch profile
  useEffect(() => {
    if (!profileId) {
      setProfileLoading(false);
      return;
    }

    void getPlayerIdentityProfile(profileId).then((doc) => {
      setProfile(doc);
      setProfileLoading(false);
    });
  }, [profileId]);

  // Infinite query for games
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ["games", profileId],
    queryFn: ({ pageParam }: { pageParam: number | undefined }) =>
      getPaginatedGames(profileId, 10, pageParam),
    getNextPageParam: (lastPage: { games: GameStats[]; nextCursor?: number }) =>
      lastPage.nextCursor,
    initialPageParam: undefined as number | undefined,
    enabled: !!profileId,
  });

  const allGames = data?.pages.flatMap((page) => page.games) ?? [];

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  };

  const renderGame = ({ item }: { item: GameStats }) => (
    <Link
      href={`/profile/${profileId}/history/${item.gameId}`}
      asChild
    >
      <Pressable className="mb-3">
        <GameHistoryCard game={item} />
      </Pressable>
    </Link>
  );

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View className="py-4">
        <ActivityIndicator />
      </View>
    );
  };

  const renderEmpty = () => (
    <View className="items-center py-12">
      <Icon as={HistoryIcon} size={64} className="text-muted-foreground mb-4" />
      <Text className="text-xl font-semibold text-foreground mb-2">
        No games yet
      </Text>
      <Text className="text-muted-foreground text-center">
        Game history will appear here once games are recorded
      </Text>
    </View>
  );

  if (profileLoading || isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  const displayName = profile
    ? `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim()
    : "Player";

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
              Game History
            </Text>
            <Text className="text-primary-foreground opacity-90">
              {displayName}
            </Text>
          </View>
        </View>

        {/* Stats Summary */}
        {allGames.length > 0 && (
          <View className="flex-row gap-4 mt-2">
            <View className="flex-1 rounded-xl bg-card p-3">
              <Text variant="small" className="text-muted-foreground">
                Total Games
              </Text>
              <Text className="text-xl font-bold text-foreground">
                {allGames.length}
              </Text>
            </View>
            <View className="flex-1 rounded-xl bg-card p-3">
              <Text variant="small" className="text-muted-foreground">
                Wins
              </Text>
              <Text className="text-xl font-bold text-green-500">
                {allGames.filter((g) => g.result === "win").length}
              </Text>
            </View>
            <View className="flex-1 rounded-xl bg-card p-3">
              <Text variant="small" className="text-muted-foreground">
                Losses
              </Text>
              <Text className="text-xl font-bold text-red-500">
                {allGames.filter((g) => g.result === "loss").length}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Games List */}
      <FlatList
        data={allGames}
        renderItem={renderGame}
        keyExtractor={(item) => item.gameId}
        contentContainerClassName="px-6 py-6"
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
          />
        }
      />
    </View>
  );
}
