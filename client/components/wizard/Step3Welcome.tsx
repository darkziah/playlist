import confetti from 'canvas-confetti';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

export default function Step3Welcome() {
  const router = useRouter();

  useEffect(() => {
    // Fire confetti on mount
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  const handleFinish = () => {
    router.replace('/');
  };

  return (
    <View className="flex-1 items-center justify-center p-8">
      <View className="w-full max-w-md gap-8 text-center">
        <View className="gap-4">
          <Text className="text-center text-5xl">🎉</Text>
          <Text className="text-center text-3xl font-bold">Welcome to Playlist!</Text>
          <Text className="text-center text-lg text-muted-foreground">
            Your profile is all set up. You're ready to start playing!
          </Text>
        </View>

        <Button onPress={handleFinish} size="lg">
          <Text>Get Started</Text>
        </Button>
      </View>
    </View>
  );
}
