import { useEffect, useState } from 'react';
import { View, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { listLeagues, joinLeague } from '@/lib/league';
import type { League } from 'shared';

export default function JoinLeagueScreen() {
  const router = useRouter();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    loadLeagues();
  }, []);

  const loadLeagues = async () => {
    try {
      const data = await listLeagues();
      setLeagues(data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load leagues');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (league: League) => {
    setJoiningId(league.id);
    try {
      const result: any = await joinLeague(league.id);
      if (result.success) {
        if (result.status === 'joined') {
            Alert.alert('Success', 'You have joined the league!');
            router.replace(`/(app)/league/${league.id}/settings`);
        } else {
            Alert.alert('Request Sent', 'Your join request is pending approval.');
        }
      }
    } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to join league');
    } finally {
      setJoiningId(null);
    }
  };

  if (loading) {
    return <View className="flex-1 items-center justify-center"><ActivityIndicator /></View>;
  }

  return (
    <View className="flex-1 bg-background p-4">
      <FlatList
        data={leagues}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="flex-row items-center justify-between p-4 mb-2 border border-border rounded-lg bg-card">
            <View>
              <Text className="font-semibold">{item.name}</Text>
              <Text variant="muted">{item.slug}</Text>
              <Text variant="small" className="text-muted-foreground capitalize">
                {item.metadata?.settings?.joinType === 'approval_required' ? 'Request to Join' : 'Open'}
              </Text>
            </View>
            <Button 
                size="sm" 
                variant="outline" 
                onPress={() => handleJoin(item)}
                disabled={joiningId === item.id}
            >
              <Text>{joiningId === item.id ? 'Joining...' : 'Join'}</Text>
            </Button>
          </View>
        )}
        ListEmptyComponent={<Text className="text-center mt-4">No leagues found.</Text>}
      />
    </View>
  );
}
