import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import Step1UserDetails from '@/components/wizard/Step1UserDetails';
import Step2ProfilePhoto from '@/components/wizard/Step2ProfilePhoto';
import Step3Welcome from '@/components/wizard/Step3Welcome';

export default function WizardStep() {
  const { step } = useLocalSearchParams<{ step: string }>();
  const router = useRouter();
  const stepNumber = parseInt(step || '1', 10);

  useEffect(() => {
    if (isNaN(stepNumber) || stepNumber < 1 || stepNumber > 3) {
      router.replace('/wizard/1');
    }
  }, [stepNumber, router]);

  if (isNaN(stepNumber) || stepNumber < 1 || stepNumber > 3) {
    return null;
  }

  return (
    <View className="flex-1 bg-background">
      {stepNumber === 1 && <Step1UserDetails />}
      {stepNumber === 2 && <Step2ProfilePhoto />}
      {stepNumber === 3 && <Step3Welcome />}
    </View>
  );
}
