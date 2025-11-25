import { useEffect, useState } from 'react';
import { View, FlatList, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { subscribeToTeams } from '@/lib/league';

export default function TeamsListScreen() {
  const { leagueId } = useLocalSearchParams<{ leagueId: string }>();
  const router = useRouter();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!leagueId) return;
    const unsub = subscribeToTeams(leagueId, (data) => {
      setTeams(data);
      setLoading(false);
    });
    return unsub;
  }, [leagueId]);

  if (loading) return <ActivityIndicator />;

  return (
    <View className="flex-1 bg-background p-4 gap-4">
      <View className="flex-row justify-between items-center">
        <Text variant="h3">Teams</Text>
        <Button size="sm" onPress={() => router.push(`/(app)/league/${leagueId}/teams/new`)}>
          <Text>Create Team</Text>
        </Button>
      </View>

      <FlatList
        data={teams}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="flex-row justify-between items-center p-3 border border-border rounded-lg mb-2">
            <Text>{item.name}</Text>
            <Button variant="ghost" size="sm" onPress={() => router.push(`/(app)/league/${leagueId}/teams/${item.id}` as any)}>
              <Text>View</Text>
            </Button>
          </View>
        )}
        ListEmptyComponent={<Text>No teams yet.</Text>}
      />
    </View>
  );
}
