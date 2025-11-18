import { View, ScrollView } from "react-native";
import { Text } from "@/components/ui/text";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatActionButton } from "./StatActionButton";
import type { PlayerEntry } from "shared";
import type { LivePlayerStats } from "@/lib/live-game-types";
import { cn } from "@/lib/utils";

interface PlayerQuickStatsProps {
  player: PlayerEntry;
  team: "A" | "B";
  stats: LivePlayerStats | null;
  onRecordStat: (
    playerId: string,
    playerName: string,
    statType: "regular_basket" | "three_pointer" | "free_throw" | "rebound" | "assist" | "steal" | "block" | "turnover",
  ) => void;
  disabled?: boolean;
  scoringMode?: "custom" | "nba";
}

export function PlayerQuickStats({
  player,
  team,
  stats,
  onRecordStat,
  disabled = false,
  scoringMode = "custom",
}: PlayerQuickStatsProps) {
  const displayName = player.identityProfile?.username || player.name;
  const initial = displayName.charAt(0).toUpperCase();

  // Get point values based on scoring mode
  const regularPoints = scoringMode === "custom" ? "+1" : "+2";
  const threePoints = scoringMode === "custom" ? "+2" : "+3";

  return (
    <View
      className={cn(
        "bg-card rounded-2xl border-2 p-4 mb-3",
        team === "A" ? "border-primary/30" : "border-blue-500/30",
      )}
    >
      {/* Player Header */}
      <View className="flex-row items-center mb-3 pb-3 border-b border-border">
        <Avatar alt={displayName} className="mr-3">
          <AvatarImage source={{ uri: player.identityProfile?.photoUrl }} />
          <AvatarFallback>
            <Text>{initial}</Text>
          </AvatarFallback>
        </Avatar>
        <View className="flex-1">
          <Text className="font-bold text-foreground">
            #{player.queueNumber} {displayName}
          </Text>
          {stats && (
            <Text variant="small" className="text-muted-foreground">
              {stats.displayPoints} pts • {stats.rebounds} reb • {stats.assists} ast
            </Text>
          )}
        </View>
      </View>

      {/* Scoring Buttons */}
      <View className="mb-3">
        <Text variant="small" className="text-muted-foreground mb-2 uppercase tracking-wider">
          Scoring
        </Text>
        <View className="flex-row gap-2">
          <StatActionButton
            label="Regular"
            value={regularPoints}
            variant="points"
            onPress={() => onRecordStat(player.userId, displayName, "regular_basket")}
            disabled={disabled}
            className="flex-1"
          />
          <StatActionButton
            label="3-Pointer"
            value={threePoints}
            variant="points"
            onPress={() => onRecordStat(player.userId, displayName, "three_pointer")}
            disabled={disabled}
            className="flex-1"
          />
          <StatActionButton
            label="Free Throw"
            value="+1"
            variant="points"
            onPress={() => onRecordStat(player.userId, displayName, "free_throw")}
            disabled={disabled}
            className="flex-1"
          />
        </View>
      </View>

      {/* Other Stats */}
      <View>
        <Text variant="small" className="text-muted-foreground mb-2 uppercase tracking-wider">
          Stats
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-2">
          <View className="flex-row gap-2">
            <StatActionButton
              label="Rebound"
              variant="stat"
              onPress={() => onRecordStat(player.userId, displayName, "rebound")}
              disabled={disabled}
            />
            <StatActionButton
              label="Assist"
              variant="stat"
              onPress={() => onRecordStat(player.userId, displayName, "assist")}
              disabled={disabled}
            />
            <StatActionButton
              label="Steal"
              variant="stat"
              onPress={() => onRecordStat(player.userId, displayName, "steal")}
              disabled={disabled}
            />
            <StatActionButton
              label="Block"
              variant="stat"
              onPress={() => onRecordStat(player.userId, displayName, "block")}
              disabled={disabled}
            />
            <StatActionButton
              label="Turnover"
              variant="miss"
              onPress={() => onRecordStat(player.userId, displayName, "turnover")}
              disabled={disabled}
            />
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
