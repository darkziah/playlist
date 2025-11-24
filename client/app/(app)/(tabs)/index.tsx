import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link, Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import type { Game, GameStatus } from 'shared';
import { fetchGames } from '@/lib/games';
import { formatGameDate, formatGameTime } from '@/lib/time';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useGameMasterAuth } from '@/lib/gameMasterAuth';
import Loading from '@/components/loading';
import { useColorScheme } from 'nativewind';
import { Moon, Sun } from 'lucide-react-native';

const PAGE_SIZE = 10;

type StatusTab = GameStatus;

export default function Screen() {
  const router = useRouter();
  const { isGameMaster, role } = useGameMasterAuth();
  const [statusTab, setStatusTab] = useState<StatusTab>('scheduled');
  const { colorScheme, toggleColorScheme } = useColorScheme();

  const SCREEN_OPTIONS = {
    title: 'PlayList',
    headerTransparent: false,
    headerRight: () => (
      <Button
        variant="ghost"
        size="sm"
        onPress={toggleColorScheme}
        className='mr-2'
      >
        {colorScheme === 'dark' ? (
          <Sun className="text-foreground" size={20} />
        ) : (
          <Moon className="text-foreground" size={20} />
        )}
      </Button>
    ),
  };

  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery<{ items: Game[]; nextPage: number | null; total: number }>(
    {
      queryKey: ['games-by-status', statusTab, isGameMaster ? 'gm' : 'player'],
      initialPageParam: 0,
      queryFn: async ({ pageParam }) => {
        const allGames = await fetchGames();
        const visibleGames = isGameMaster
          ? allGames
          : allGames.filter((game) => game.status !== 'draft');
        const statusGames = visibleGames.filter((game) => game.status === statusTab);

        const start = (pageParam as number) * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        const items = statusGames.slice(start, end);
        const hasMore = end < statusGames.length;

        return {
          items,
          nextPage: hasMore ? (pageParam as number) + 1 : null,
          total: statusGames.length,
        };
      },
      getNextPageParam: (lastPage) => lastPage.nextPage,
    },
  );

  const gamesForStatus: Game[] = data?.pages.flatMap((page) => page.items) ?? [];

  const renderGameList = (list: Game[], emptyMessage: string) => {
    if (list.length === 0) {
      return (
        <View className="flex-1 items-center justify-center py-16">
          <Text className="text-6xl mb-4 bounce-ball">🏀</Text>
          <Text className="text-lg font-semibold text-foreground mb-2 text-center">{emptyMessage}</Text>
        </View>
      );
    }

    return list.map((game) => (
      <View
        key={game.id}
        className="flex-row items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
      >
        <View className="flex-row items-center gap-3">
          <View className="gap-1">
            <Text className="text-base font-semibold text-foreground">
              {game.title}
            </Text>
            {game.description ? (
              <Text variant="small" className="text-muted-foreground">
                {game.description}
              </Text>
            ) : null}
            <Text variant="small" className="text-muted-foreground">
              {formatGameDate(game.dateTime)} | {formatGameTime(game.dateTime, game.hours || 2)}
            </Text>
          </View>
        </View>
        <View className="items-end gap-2">
          <Button
            variant="outline"
            size="sm"
            className="mt-1"
            onPress={() => {
              router.push({
                pathname: '/game/[game-id]',
                params: { 'game-id': game.id },
              });
            }}
          >
            <Text variant="small">View details</Text>
          </Button>
        </View>
      </View>
    ));
  };

  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS} />
      <View className="flex-1 px-4 py-6">
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <Loading className="text-3xl" />
          </View>
        ) : (
          <View className="mx-auto w-full max-w-xl flex-1">
            <Tabs
              value={statusTab}
              onValueChange={(value) =>
                setStatusTab((value as StatusTab) ?? 'scheduled')
              }
              className='w-full'
            >
              <TabsList className='w-full'>
                <TabsTrigger className='flex-1 dark:text-white' value="scheduled">Scheduled</TabsTrigger>
                <TabsTrigger className='flex-1 dark:text-white' value="completed">Completed</TabsTrigger>
                <TabsTrigger className='flex-1 dark:text-white' value="cancelled">Cancelled</TabsTrigger>
                {isGameMaster && role !== "scorer" ? (
                  <TabsTrigger className='flex-1 dark:text-white' value="draft">Draft</TabsTrigger>
                ) : null}
              </TabsList>
              <TabsContent value="scheduled" className="flex-1 mt-2">
                <ScrollView className="flex-1">
                  <View className="gap-4 pb-8">
                    {renderGameList(gamesForStatus, 'No games on the court yet! Check back soon for upcoming matches.')}
                    {hasNextPage ? (
                      <Button
                        variant="outline"
                        className="mt-2 self-center"
                        disabled={isFetchingNextPage}
                        onPress={() => {
                          void fetchNextPage();
                        }}
                      >
                        <Text>{isFetchingNextPage ? 'Loading more…' : 'Load more'}</Text>
                      </Button>
                    ) : null}
                  </View>
                </ScrollView>
              </TabsContent>
              <TabsContent value="completed" className="flex-1 mt-2">
                <ScrollView className="flex-1">
                  <View className="gap-4 pb-8">
                    {renderGameList(gamesForStatus, 'No games finished yet! Time to hit the court and make some memories.')}
                    {hasNextPage ? (
                      <Button
                        variant="outline"
                        className="mt-2 self-center"
                        disabled={isFetchingNextPage}
                        onPress={() => {
                          void fetchNextPage();
                        }}
                      >
                        <Text>{isFetchingNextPage ? 'Loading more…' : 'Load more'}</Text>
                      </Button>
                    ) : null}
                  </View>
                </ScrollView>
              </TabsContent>
              <TabsContent value="cancelled" className="flex-1 mt-2">
                <ScrollView className="flex-1">
                  <View className="gap-4 pb-8">
                    {renderGameList(gamesForStatus, 'Clean slate! No cancelled games here.')}
                    {hasNextPage ? (
                      <Button
                        variant="outline"
                        className="mt-2 self-center"
                        disabled={isFetchingNextPage}
                        onPress={() => {
                          void fetchNextPage();
                        }}
                      >
                        <Text>{isFetchingNextPage ? 'Loading more…' : 'Load more'}</Text>
                      </Button>
                    ) : null}
                  </View>
                </ScrollView>
              </TabsContent>
              {isGameMaster ? (
                <TabsContent value="draft" className="flex-1 mt-2">
                  <ScrollView className="flex-1">
                    <View className="gap-4 pb-8">
                      {renderGameList(gamesForStatus, 'No drafts in the works! Start creating your next game.')}
                      {hasNextPage ? (
                        <Button
                          variant="outline"
                          className="mt-2 self-center"
                          disabled={isFetchingNextPage}
                          onPress={() => {
                            void fetchNextPage();
                          }}
                        >
                          <Text>{isFetchingNextPage ? 'Loading more…' : 'Load more'}</Text>
                        </Button>
                      ) : null}
                    </View>
                  </ScrollView>
                </TabsContent>
              ) : null}
            </Tabs>
          </View>
        )}
      </View>
    </>
  );
}
