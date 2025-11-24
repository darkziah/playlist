import { Stack } from 'expo-router';
import React, { createContext, useContext, useState } from 'react';

type WizardData = {
  username: string;
  firstName: string;
  lastName: string;
  dob: string;
  location: string;
  profilePhotoUrl: string | null;
};

type WizardContextType = {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
};

const WizardContext = createContext<WizardContextType | null>(null);

export function useWizard() {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error('useWizard must be used within WizardProvider');
  }
  return context;
}

export default function WizardLayout() {
  const [data, setData] = useState<WizardData>({
    username: '',
    firstName: '',
    lastName: '',
    dob: '',
    location: '',
    profilePhotoUrl: null,
  });

  const updateData = (updates: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  return (
    <WizardContext.Provider value={{ data, updateData }}>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </WizardContext.Provider>
  );
}
