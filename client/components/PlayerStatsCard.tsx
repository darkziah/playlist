import { View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import type { LucideIcon } from "lucide-react-native";

interface PlayerStatsCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  suffix?: string;
  iconColor?: string;
  decimalPlaces?: number;
}

export function PlayerStatsCard({
  label,
  value,
  icon,
  suffix,
  iconColor = "text-primary",
  decimalPlaces = 1,
}: PlayerStatsCardProps) {
  const displayValue =
    typeof value === "number" ? value.toFixed(decimalPlaces) : value.toString();

  return (
    <View className="flex-1 min-w-[45%] rounded-2xl bg-card p-4">
      <View className="flex-row items-center gap-2 mb-1">
        {icon && <Icon as={icon} size={16} className={iconColor} />}
        <Text variant="small" className="text-muted-foreground">
          {label}
        </Text>
      </View>
      <View className="flex-row items-baseline">
        <Text className="text-2xl font-bold text-foreground">
          {displayValue}
        </Text>
        {suffix && (
          <Text variant="small" className="ml-1 text-muted-foreground">
            {suffix}
          </Text>
        )}
      </View>
    </View>
  );
}
