import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

export default function Loading({ className }: { className?: string }) {
  return (
    <Text className={cn('text-6xl mb-4 bounce-ball', className)}>🏀</Text>
  );
}