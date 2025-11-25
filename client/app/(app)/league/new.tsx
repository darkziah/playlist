import { useState } from 'react';
import { View, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function CreateLeagueScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name || !slug) {
      setError('Name and slug are required');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const { data, error: apiError } = await authClient.organization.create({
        name,
        slug,
      });

      if (apiError) {
        throw new Error(apiError.message);
      }

      if (data) {
        // Initialize league metadata in Firestore
        // The organization document is created by better-auth-firestore adapter
        // We can update it with our specific fields
        await setDoc(doc(db, 'organizations', data.id), {
          metadata: {
            subscriptionTier: 'free',
            subscriptionStatus: 'active',
            settings: {
              joinType: 'open',
              teamCreationPolicy: 'any_player',
              maxTeams: 10
            }
          }
        }, { merge: true });

        router.replace(`/(app)/league/${data.id}/settings`);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to create league');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-background p-4 gap-4">
      <View className="gap-2">
        <Text variant="small">League Name</Text>
        <TextInput
          className="rounded-md border border-border bg-background px-3 py-2 text-foreground"
          value={name}
          onChangeText={setName}
          placeholder="e.g. PBA"
        />
      </View>
      
      <View className="gap-2">
        <Text variant="small">Slug (URL friendly ID)</Text>
        <TextInput
          className="rounded-md border border-border bg-background px-3 py-2 text-foreground"
          value={slug}
          onChangeText={(text) => setSlug(text.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
          placeholder="e.g. pba-2025"
          autoCapitalize="none"
        />
      </View>

      {error ? (
        <Text variant="small" className="text-destructive">{error}</Text>
      ) : null}

      <Button onPress={handleCreate} disabled={loading}>
        <Text>{loading ? 'Creating...' : 'Create League'}</Text>
      </Button>
    </View>
  );
}
