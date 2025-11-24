import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

interface ShootingPercentageBarProps {
  percentage: number;
  label: string;
  made: number;
  attempted: number;
}

export function ShootingPercentageBar({
  percentage,
  label,
  made,
  attempted,
}: ShootingPercentageBarProps) {
  // Determine color based on percentage
  const getColor = (pct: number): string => {
    if (pct >= 45) return "bg-green-500";
    if (pct >= 35) return "bg-yellow-500";
    return "bg-red-500";
  };

  const colorClass = getColor(percentage);
  const displayPercentage = isNaN(percentage) ? 0 : percentage;

  return (
    <View className="flex-1 min-w-[45%] rounded-2xl bg-card p-4">
      <Text variant="small" className="text-muted-foreground mb-2">
        {label}
      </Text>

      <View className="mb-2">
        <View className="h-3 bg-muted rounded-full overflow-hidden">
          <View
            className={cn("h-full rounded-full", colorClass)}
            style={{ width: `${Math.min(displayPercentage, 100)}%` }}
          />
        </View>
      </View>

      <View className="flex-row items-baseline justify-between">
        <Text className="text-xl font-bold text-foreground">
          {displayPercentage.toFixed(1)}%
        </Text>
        <Text variant="small" className="text-muted-foreground">
          {made}/{attempted}
        </Text>
      </View>
    </View>
  );
}
