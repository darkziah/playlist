import { Tabs } from "expo-router";

import { Gamepad, User, Activity } from 'lucide-react-native';
import { useGameMasterAuth } from '@/lib/gameMasterAuth';

export default function Layout() {

  const { user, isGameMaster } = useGameMasterAuth();

  return (
    <Tabs key={user?.uid}>
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color }) => <Gamepad color={color} />,
          tabBarLabel: "Games",
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          tabBarIcon: ({ color }) => <Activity color={color} />,
          tabBarLabel: "Dashboard",
          href: isGameMaster ? "/(app)/(tabs)/dashboard" : null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color }) => <User color={color} />,
          tabBarLabel: "Profile",
          headerTransparent: true,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}