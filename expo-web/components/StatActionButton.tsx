import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import * as Haptics from "expo-haptics";

interface StatActionButtonProps {
  label: string;
  value?: string; // For point buttons like "+1", "+2"
  onPress: () => void;
  variant?: "points" | "stat" | "miss";
  disabled?: boolean;
  className?: string;
}

export function StatActionButton({
  label,
  value,
  onPress,
  variant = "stat",
  disabled = false,
  className,
}: StatActionButtonProps) {
  const handlePress = () => {
    if (!disabled) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPress();
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "points":
        return "bg-primary border-primary";
      case "miss":
        return "bg-destructive/20 border-destructive";
      case "stat":
      default:
        return "bg-card border-border";
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case "points":
        return "text-primary-foreground";
      case "miss":
        return "text-destructive";
      case "stat":
      default:
        return "text-foreground";
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      className={cn(
        "min-w-[70px] rounded-xl border-2 px-4 py-3",
        "active:scale-95 transition-all",
        "shadow-sm shadow-black/10",
        getVariantStyles(),
        disabled && "opacity-50",
        className,
      )}
    >
      <View className="items-center justify-center gap-1">
        {value && (
          <Text
            className={cn(
              "text-2xl font-bold",
              getTextColor(),
            )}
          >
            {value}
          </Text>
        )}
        <Text
          variant="small"
          className={cn(
            "font-semibold uppercase tracking-wider",
            getTextColor(),
          )}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
