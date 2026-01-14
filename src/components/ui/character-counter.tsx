import { cn } from "@/lib/utils";

interface CharacterCounterProps {
  current: number;
  max: number;
  className?: string;
}

export function CharacterCounter({ current, max, className }: CharacterCounterProps) {
  const isNearLimit = current > max * 0.9;
  const isAtLimit = current >= max;

  return (
    <span 
      className={cn(
        "text-xs text-muted-foreground",
        isNearLimit && !isAtLimit && "text-amber-500",
        isAtLimit && "text-destructive",
        className
      )}
    >
      {current} / {max} characters
    </span>
  );
}
