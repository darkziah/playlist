import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { subscribeToLeague, updateLeagueSettings } from '@/lib/league';
import type { League } from 'shared';

export default function LeagueSettingsScreen() {
  const { leagueId } = useLocalSearchParams<{ leagueId: string }>();
  const [league, setLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!leagueId) return;
    const unsub = subscribeToLeague(leagueId, (data) => {
      setLeague(data);
      setLoading(false);
    });
    return unsub;
  }, [leagueId]);

  if (loading) {
    return <View className="flex-1 items-center justify-center"><ActivityIndicator /></View>;
  }

  if (!league) {
    return <View className="flex-1 items-center justify-center"><Text>League not found</Text></View>;
  }

  return (
    <ScrollView className="flex-1 bg-background p-4 gap-6">
      <View>
        <Text variant="h2">{league.name}</Text>
        <Text variant="muted">{league.slug}</Text>
      </View>

      <View className="gap-2 p-4 border border-border rounded-lg bg-card">
        <Text variant="h4">Settings</Text>
        
        <View className="flex-row justify-between items-center">
            <Text>Join Type</Text>
            <Text variant="muted">{league.metadata?.settings?.joinType || 'open'}</Text>
        </View>

        <View className="flex-row justify-between items-center">
            <Text>Team Creation</Text>
            <Text variant="muted">{league.metadata?.settings?.teamCreationPolicy || 'any_player'}</Text>
        </View>
        
        {/* Placeholder for Edit Settings Modal/Screen */}
        <Button variant="outline" className="mt-2">
            <Text>Edit Settings</Text>
        </Button>
      </View>

      <View className="gap-2">
        <Text variant="h4">Management</Text>
        <Button variant="secondary" onPress={() => router.push(`/(app)/league/${leagueId}/teams`)}>
            <Text>Teams</Text>
        </Button>
        <Button variant="secondary" onPress={() => console.log('Manage Members')}>
            <Text>Members</Text>
        </Button>
        <Button variant="secondary" onPress={() => console.log('Schedule Games')}>
            <Text>Schedule Games</Text>
        </Button>
      </View>
    </ScrollView>
  );
}
