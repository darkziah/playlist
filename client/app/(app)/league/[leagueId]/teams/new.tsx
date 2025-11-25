import { useState } from 'react';
import { View, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { createTeam } from '@/lib/league';

export default function CreateTeamScreen() {
  const { leagueId } = useLocalSearchParams<{ leagueId: string }>();
  const router = useRouter();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      if (!leagueId) throw new Error("Missing league ID");
      const result: any = await createTeam(leagueId, { 
        name,
        colors: { primary: '#000000', secondary: '#ffffff' } // Default for now
      });

      if (result.success) {
        if (result.status === 'created') {
            Alert.alert('Success', 'Team created!');
            router.back();
        } else {
            Alert.alert('Request Sent', 'Team creation request pending approval.');
            router.back();
        }
      }
    } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to create team');
    } finally {
        setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-background p-4 gap-4">
      <Text variant="h3">Create Team</Text>
      <View className="gap-2">
        <Text variant="small">Team Name</Text>
        <TextInput
          className="rounded-md border border-border bg-background px-3 py-2 text-foreground"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Red Dragons"
        />
      </View>
      <Button onPress={handleCreate} disabled={loading}>
        <Text>{loading ? 'Creating...' : 'Create Team'}</Text>
      </Button>
    </View>
  );
}
