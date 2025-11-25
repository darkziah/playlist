import { useState } from "react";
import { View, TextInput, Alert, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { updateTeamMemberProfile } from "@/lib/league";

const POSITIONS = [
  "Point Guard",
  "Shooting Guard",
  "Small Forward",
  "Power Forward",
  "Center",
] as const;

const HANDS = ["Left", "Right", "Both"] as const;

export default function JoinWizardScreen() {
  const { leagueId, teamId } = useLocalSearchParams<{
    leagueId: string;
    teamId: string;
  }>();
  const router = useRouter();

  const [jerseyNumber, setJerseyNumber] = useState("");
  const [position, setPosition] = useState<string>("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [yearOfBirth, setYearOfBirth] = useState("");
  const [preferredHand, setPreferredHand] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!jerseyNumber || !position) {
      Alert.alert("Error", "Jersey number and position are required");
      return;
    }

    const jerseyNum = parseInt(jerseyNumber, 10);
    if (isNaN(jerseyNum) || jerseyNum < 0 || jerseyNum > 99) {
      Alert.alert("Error", "Jersey number must be between 0 and 99");
      return;
    }

    if (!leagueId || !teamId) return;

    setLoading(true);
    try {
      await updateTeamMemberProfile(leagueId, teamId, {
        jerseyNumber: jerseyNum,
        position,
        height: height || undefined,
        weight: weight || undefined,
        yearOfBirth: yearOfBirth ? parseInt(yearOfBirth, 10) : undefined,
        preferredHand: preferredHand as "Left" | "Right" | "Both" | undefined,
      });

      Alert.alert("Success", "Profile updated!", [
        {
          text: "OK",
          onPress: () =>
            router.replace(`/(app)/league/${leagueId}/teams/${teamId}` as any),
        },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-background p-4">
      <Text variant="h2" className="mb-2">
        Complete Your Profile
      </Text>
      <Text variant="muted" className="mb-6">
        Fill in your player details to complete joining the team.
      </Text>

      {/* Required Fields */}
      <View className="gap-4 mb-6">
        <View className="gap-2">
          <Text variant="small" className="font-medium">
            Jersey Number *
          </Text>
          <TextInput
            className="rounded-md border border-border bg-background px-3 py-3 text-foreground"
            value={jerseyNumber}
            onChangeText={setJerseyNumber}
            placeholder="0-99"
            keyboardType="number-pad"
            maxLength={2}
          />
        </View>

        <View className="gap-2">
          <Text variant="small" className="font-medium">
            Position *
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {POSITIONS.map((pos) => (
              <Button
                key={pos}
                variant={position === pos ? "default" : "outline"}
                size="sm"
                onPress={() => setPosition(pos)}
              >
                <Text>{pos}</Text>
              </Button>
            ))}
          </View>
        </View>
      </View>

      {/* Optional Fields */}
      <Text variant="h4" className="mb-4">
        Optional Information
      </Text>
      <View className="gap-4 mb-6">
        <View className="flex-row gap-4">
          <View className="flex-1 gap-2">
            <Text variant="small">Height</Text>
            <TextInput
              className="rounded-md border border-border bg-background px-3 py-3 text-foreground"
              value={height}
              onChangeText={setHeight}
              placeholder="e.g. 6 ft 2 in"
            />
          </View>
          <View className="flex-1 gap-2">
            <Text variant="small">Weight</Text>
            <TextInput
              className="rounded-md border border-border bg-background px-3 py-3 text-foreground"
              value={weight}
              onChangeText={setWeight}
              placeholder="e.g. 180 lbs"
            />
          </View>
        </View>

        <View className="gap-2">
          <Text variant="small">Year of Birth</Text>
          <TextInput
            className="rounded-md border border-border bg-background px-3 py-3 text-foreground"
            value={yearOfBirth}
            onChangeText={setYearOfBirth}
            placeholder="e.g. 1995"
            keyboardType="number-pad"
            maxLength={4}
          />
        </View>

        <View className="gap-2">
          <Text variant="small">Preferred Hand</Text>
          <View className="flex-row gap-2">
            {HANDS.map((hand) => (
              <Button
                key={hand}
                variant={preferredHand === hand ? "default" : "outline"}
                size="sm"
                onPress={() => setPreferredHand(hand)}
              >
                <Text>{hand}</Text>
              </Button>
            ))}
          </View>
        </View>
      </View>

      {/* Submit */}
      <Button onPress={handleSubmit} disabled={loading} className="mb-8">
        <Text>{loading ? "Saving..." : "Save Profile"}</Text>
      </Button>
    </ScrollView>
  );
}
