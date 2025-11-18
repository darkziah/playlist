import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { CheckCircle2Icon, XCircleIcon, CalendarIcon } from "lucide-react-native";
import type { GameStats } from "@/lib/playerStats";

interface GameHistoryCardProps {
  game: GameStats;
}

export function GameHistoryCard({ game }: GameHistoryCardProps) {
  const isWin = game.result === "win";
  const gameDate = new Date(game.date);
  const formattedDate = gameDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const fgPercentage =
    game.fieldGoalsAttempted > 0
      ? ((game.fieldGoalsMade / game.fieldGoalsAttempted) * 100).toFixed(1)
      : "0.0";

  const threePointPercentage =
    game.threePointersAttempted > 0
      ? ((game.threePointersMade / game.threePointersAttempted) * 100).toFixed(1)
      : "0.0";

  return (
    <View className="rounded-2xl bg-card p-4 border border-border">
      {/* Header: Date and Result */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <Icon as={CalendarIcon} size={14} className="text-muted-foreground" />
          <Text variant="small" className="text-muted-foreground">
            {formattedDate}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Icon
            as={isWin ? CheckCircle2Icon : XCircleIcon}
            size={18}
            className={isWin ? "text-green-500" : "text-red-500"}
          />
          <Text
            className={`font-bold ${isWin ? "text-green-500" : "text-red-500"}`}
          >
            {isWin ? "WIN" : "LOSS"}
          </Text>
        </View>
      </View>

      {/* Opponent */}
      {game.opponentTeam && (
        <Text variant="small" className="text-muted-foreground mb-3">
          vs {game.opponentTeam}
        </Text>
      )}

      {/* Main Stats Grid */}
      <View className="flex-row flex-wrap gap-4 mb-3">
        <View className="flex-1 min-w-[30%]">
          <Text variant="small" className="text-muted-foreground">
            Points
          </Text>
          <Text className="text-xl font-bold text-foreground">
            {game.points}
          </Text>
        </View>
        <View className="flex-1 min-w-[30%]">
          <Text variant="small" className="text-muted-foreground">
            Rebounds
          </Text>
          <Text className="text-xl font-bold text-foreground">
            {game.rebounds}
          </Text>
        </View>
        <View className="flex-1 min-w-[30%]">
          <Text variant="small" className="text-muted-foreground">
            Assists
          </Text>
          <Text className="text-xl font-bold text-foreground">
            {game.assists}
          </Text>
        </View>
      </View>

      {/* Secondary Stats */}
      <View className="flex-row flex-wrap gap-4 border-t border-border pt-3">
        <View className="flex-row items-baseline gap-1">
          <Text variant="small" className="text-muted-foreground">
            STL:
          </Text>
          <Text className="font-semibold text-foreground">{game.steals}</Text>
        </View>
        <View className="flex-row items-baseline gap-1">
          <Text variant="small" className="text-muted-foreground">
            BLK:
          </Text>
          <Text className="font-semibold text-foreground">{game.blocks}</Text>
        </View>
        <View className="flex-row items-baseline gap-1">
          <Text variant="small" className="text-muted-foreground">
            FG:
          </Text>
          <Text className="font-semibold text-foreground">
            {game.fieldGoalsMade}/{game.fieldGoalsAttempted}
          </Text>
          <Text variant="small" className="text-muted-foreground">
            ({fgPercentage}%)
          </Text>
        </View>
        <View className="flex-row items-baseline gap-1">
          <Text variant="small" className="text-muted-foreground">
            3PT:
          </Text>
          <Text className="font-semibold text-foreground">
            {game.threePointersMade}/{game.threePointersAttempted}
          </Text>
          <Text variant="small" className="text-muted-foreground">
            ({threePointPercentage}%)
          </Text>
        </View>
        {game.minutesPlayed && (
          <View className="flex-row items-baseline gap-1">
            <Text variant="small" className="text-muted-foreground">
              MIN:
            </Text>
            <Text className="font-semibold text-foreground">
              {game.minutesPlayed}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
