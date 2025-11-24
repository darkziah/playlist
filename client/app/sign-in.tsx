import { View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { authClient } from '@/lib/auth-client';
import { useRouter } from 'expo-router';

export default function SignIn() {
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    try {
        await authClient.signIn.social({
            provider: "google",
            callbackURL: "/" // Redirect to root which should handle auth check
        });
    } catch (e) {
        console.error("Sign in failed", e);
    }
  };

  return (
    <View className="flex-1 justify-center items-center bg-background p-4">
      <Text variant="h1" className="mb-8">Playlist League</Text>
      <Text className="mb-8 text-center text-muted-foreground">Sign in to manage your league and teams</Text>
      <Button onPress={handleGoogleSignIn} size="lg" className="w-full max-w-sm">
        <Text>Sign in with Google</Text>
      </Button>
    </View>
  );
}
