import { View, TextInput, KeyboardTypeOptions } from "react-native";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

interface StatInputFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  className?: string;
}

export function StatInputField({
  label,
  value,
  onChangeText,
  placeholder = "0",
  keyboardType = "numeric",
  className,
}: StatInputFieldProps) {
  return (
    <View className={cn("flex-1 min-w-[30%]", className)}>
      <Text variant="small" className="text-muted-foreground mb-1">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        className="rounded-lg border border-border bg-card px-3 py-2 text-foreground text-base"
        placeholderTextColor="#888"
      />
    </View>
  );
}
