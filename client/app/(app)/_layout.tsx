import { Redirect, Stack } from 'expo-router';
import { View } from 'react-native';

import { usePlayerIdentityProfile } from '@/hooks/usePlayerIdentityProfile';

export default function AppLayout() {
  const { user, profileComplete, loading } = usePlayerIdentityProfile();

  // Show loading state while checking auth
  if (loading) {
    return <View className="flex-1 bg-background" />;
  }

  // If user is logged in but profile is incomplete, redirect to wizard
  if (user && !profileComplete) {
    return <Redirect href="/wizard/1" />;
  }

  return (
    <Stack
      screenOptions={{
        headerTitle: '',
        headerShown: false,
        headerTintColor: '#000',
      }}
    >
      {/* TAB NAVIGATOR */}
      <Stack.Screen name="(tabs)" />


      <Stack.Screen name="profile/[profile-id]" />
      <Stack.Screen name="game/[game-id]/index" options={{ headerShown: true }} />
      <Stack.Screen name="game/[game-id]/edit" options={{ headerShown: true }} />

    </Stack>
  );
}