import { useState } from "react";
import { View, Switch } from "react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { updateNotificationPreferences } from "@/lib/league";

interface NotificationPreferencesProps {
  leagueId: string;
  userId: string;
  initialPreferences?: {
    gameStart?: boolean;
    liveScore?: boolean;
    gameEnd?: boolean;
    highlights?: boolean;
    announcements?: boolean;
  };
  onSave?: () => void;
}

export function NotificationPreferences({
  leagueId,
  userId,
  initialPreferences,
  onSave,
}: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState({
    gameStart: initialPreferences?.gameStart ?? true,
    liveScore: initialPreferences?.liveScore ?? true,
    gameEnd: initialPreferences?.gameEnd ?? true,
    highlights: initialPreferences?.highlights ?? false,
    announcements: initialPreferences?.announcements ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleToggle = (key: keyof typeof preferences) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateNotificationPreferences(leagueId, userId, preferences);
      onSave?.();
    } catch (error) {
      console.error("Failed to save preferences:", error);
    } finally {
      setSaving(false);
    }
  };

  const items = [
    { key: "gameStart" as const, label: "Game Start", description: "When a game begins" },
    { key: "liveScore" as const, label: "Live Scores", description: "Real-time score updates" },
    { key: "gameEnd" as const, label: "Game End", description: "Final scores and results" },
    { key: "highlights" as const, label: "Highlights", description: "Notable plays and moments" },
    { key: "announcements" as const, label: "Announcements", description: "League news and updates" },
  ];

  return (
    <View className="gap-4">
      <Text variant="h4">Notification Preferences</Text>

      {items.map((item) => (
        <View
          key={item.key}
          className="flex-row items-center justify-between py-3 border-b border-border"
        >
          <View className="flex-1 pr-4">
            <Text className="font-medium">{item.label}</Text>
            <Text variant="muted" className="text-sm">
              {item.description}
            </Text>
          </View>
          <Switch
            value={preferences[item.key]}
            onValueChange={() => handleToggle(item.key)}
          />
        </View>
      ))}

      <Button onPress={handleSave} disabled={saving} className="mt-4">
        <Text>{saving ? "Saving..." : "Save Preferences"}</Text>
      </Button>
    </View>
  );
}
