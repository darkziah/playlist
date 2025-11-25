import { useEffect, useState } from "react";
import { View, FlatList, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { subscribeToTeam, subscribeToTeamMembers, joinTeam } from "@/lib/league";
import { authClient } from "@/lib/auth-client";
import type { Team, TeamMember } from "shared";

export default function TeamDetailScreen() {
  const { leagueId, teamId } = useLocalSearchParams<{
    leagueId: string;
    teamId: string;
  }>();
  const router = useRouter();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    authClient.getSession().then(({ data }: { data: any }) => setSession(data));
  }, []);

  useEffect(() => {
    if (!leagueId || !teamId) return;

    const unsubTeam = subscribeToTeam(leagueId, teamId, (data) => {
      setTeam(data);
      setLoading(false);
    });

    const unsubMembers = subscribeToTeamMembers(leagueId, teamId, (data) => {
      setMembers(data);
    });

    return () => {
      unsubTeam();
      unsubMembers();
    };
  }, [leagueId, teamId]);

  const isUserMember = members.some((m) => m.userId === session?.user?.id);
  const isTeamAdmin =
    team?.teamAdmin === session?.user?.id ||
    members.some(
      (m) => m.userId === session?.user?.id && m.role === "team_admin"
    );

  const handleJoinTeam = async () => {
    if (!leagueId || !teamId) return;
    setJoining(true);
    try {
      const result: any = await joinTeam(leagueId, teamId);
      if (result?.status === "joined") {
        // Navigate to join wizard to complete profile
        router.push(
          `/(app)/league/${leagueId}/teams/${teamId}/join-wizard` as any
        );
      } else {
        Alert.alert("Request Sent", "Your join request is pending approval.");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to join team");
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  if (!team) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text>Team not found</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background p-4 gap-4">
      {/* Team Header */}
      <View className="p-4 border border-border rounded-lg bg-card">
        <Text variant="h2">{team.name}</Text>
        <View className="flex-row gap-4 mt-2">
          <Text variant="muted">W: {team.stats?.wins || 0}</Text>
          <Text variant="muted">L: {team.stats?.losses || 0}</Text>
          <Text variant="muted">
            Games: {team.stats?.totalGames || 0}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View className="flex-row gap-2">
        {!isUserMember && (
          <Button
            variant="default"
            className="flex-1"
            onPress={handleJoinTeam}
            disabled={joining}
          >
            <Text>{joining ? "Joining..." : "Join Team"}</Text>
          </Button>
        )}
        {isTeamAdmin && (
          <Button
            variant="outline"
            onPress={() =>
              router.push(
                `/(app)/league/${leagueId}/teams/${teamId}/settings` as any
              )
            }
          >
            <Text>Settings</Text>
          </Button>
        )}
      </View>

      {/* Roster */}
      <View className="flex-1">
        <Text variant="h4" className="mb-2">
          Roster ({members.length})
        </Text>
        <FlatList
          data={members}
          keyExtractor={(item) => item.userId}
          renderItem={({ item }) => (
            <View className="flex-row justify-between items-center p-3 border border-border rounded-lg mb-2 bg-card">
              <View className="flex-row items-center gap-3">
                {item.playerData?.jerseyNumber && (
                  <View className="w-10 h-10 bg-primary rounded-full items-center justify-center">
                    <Text className="text-primary-foreground font-bold">
                      {item.playerData.jerseyNumber}
                    </Text>
                  </View>
                )}
                <View>
                  <Text className="font-medium">{item.userId}</Text>
                  <Text variant="muted" className="text-xs capitalize">
                    {item.role} • {item.playerData?.position || "No position"}
                  </Text>
                </View>
              </View>
              <View className="items-end">
                <Text variant="small">{item.stats?.points || 0} pts</Text>
                <Text variant="muted" className="text-xs">
                  {item.stats?.gamesPlayed || 0} games
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text className="text-center text-muted-foreground mt-4">
              No players yet
            </Text>
          }
        />
      </View>
    </View>
  );
}
