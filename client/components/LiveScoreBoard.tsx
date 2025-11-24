import { View, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { PauseIcon, PlayIcon, UndoIcon } from "lucide-react-native";
import { cn } from "@/lib/utils";

interface LiveScoreBoardProps {
  teamAName: string;
  teamBName: string;
  teamAScore: number;
  teamBScore: number;
  formattedTime: string;
  isPaused: boolean;
  onTogglePause: () => void;
  matchNumber: number;
  showSyncIndicator?: boolean;
  scoringMode?: "custom" | "nba";
  onToggleScoringMode?: () => void;
  onUndo?: () => void;
  undoDisabled?: boolean;
}

export function LiveScoreBoard({
  teamAName,
  teamBName,
  teamAScore,
  teamBScore,
  formattedTime,
  isPaused,
  onTogglePause,
  matchNumber,
  showSyncIndicator = false,
  scoringMode = "custom",
  onToggleScoringMode,
  onUndo,
  undoDisabled = false,
}: LiveScoreBoardProps) {
  return (
    <View className="bg-primary px-6 py-6 shadow-lg shadow-black/20">
      {/* Match Number and Scoring Mode */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-1">
          <Text variant="small" className="text-primary-foreground/80 uppercase tracking-wider">
            Match #{matchNumber}
          </Text>
          {showSyncIndicator && (
            <View className="mt-1 flex-row items-center gap-2">
              <View className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <Text variant="small" className="text-primary-foreground/60">
                Live sync active
              </Text>
            </View>
          )}
        </View>

        {/* Scoring Mode Toggle */}
        {onToggleScoringMode && (
          <Pressable
            onPress={onToggleScoringMode}
            className="bg-primary-foreground/20 rounded-full px-3 py-1.5 active:scale-95"
          >
            <Text variant="small" className="text-primary-foreground font-semibold">
              {scoringMode === "custom" ? "Custom (1/2)" : "NBA (2/3)"}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Scores */}
      <View className="flex-row justify-between items-center mb-4">
        {/* Team A */}
        <View className="flex-1 items-center">
          <Text className="text-primary-foreground/80 font-medium mb-2">
            {teamAName}
          </Text>
          <Text className="text-5xl font-bold text-primary-foreground">
            {teamAScore}
          </Text>
        </View>

        {/* VS Divider */}
        <View className="px-4">
          <Text className="text-primary-foreground/60 font-semibold">
            VS
          </Text>
        </View>

        {/* Team B */}
        <View className="flex-1 items-center">
          <Text className="text-primary-foreground/80 font-medium mb-2">
            {teamBName}
          </Text>
          <Text className="text-5xl font-bold text-primary-foreground">
            {teamBScore}
          </Text>
        </View>
      </View>

      {/* Timer */}
      <View className="flex-row items-center justify-center gap-3">
        <Pressable
          onPress={onTogglePause}
          className="rounded-full bg-primary-foreground/20 p-2 active:scale-95"
        >
          <Icon
            as={isPaused ? PlayIcon : PauseIcon}
            className="text-primary-foreground"
            size={20}
          />
        </Pressable>
        <Text className={cn(
          "text-3xl font-mono font-bold text-primary-foreground",
          isPaused && "opacity-60"
        )}>
          {formattedTime}
        </Text>
        {onUndo && (
          <Pressable
            onPress={onUndo}
            disabled={undoDisabled}
            className={cn(
              "rounded-full bg-primary-foreground/20 p-2 active:scale-95",
              undoDisabled && "opacity-40"
            )}
          >
            <Icon
              as={UndoIcon}
              className="text-primary-foreground"
              size={20}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}
