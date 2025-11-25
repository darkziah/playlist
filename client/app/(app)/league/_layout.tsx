import { Stack } from 'expo-router';

export default function LeagueLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="new" options={{ presentation: 'modal', headerShown: true, title: 'Create League' }} />
      <Stack.Screen name="join" options={{ presentation: 'modal', headerShown: true, title: 'Join League' }} />
      <Stack.Screen name="[leagueId]/settings" options={{ headerShown: true, title: 'League Settings' }} />
    </Stack>
  );
}
