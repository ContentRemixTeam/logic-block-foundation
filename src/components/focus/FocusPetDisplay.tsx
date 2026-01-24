import { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useArcade } from '@/hooks/useArcade';

interface FocusPetDisplayProps {
  completedCount: number;
  totalTasks?: number;
  className?: string;
}

const PET_OPTIONS = [
  { value: 'unicorn', emoji: '🦄', name: 'Unicorn' },
  { value: 'dragon', emoji: '🐉', name: 'Dragon' },
  { value: 'phoenix', emoji: '🦅', name: 'Phoenix' },
  { value: 'cat', emoji: '🐱', name: 'Cat' },
  { value: 'dog', emoji: '🐕', name: 'Dog' },
  { value: 'rabbit', emoji: '🐰', name: 'Bunny' },
  { value: 'panda', emoji: '🐼', name: 'Panda' },
  { value: 'fox', emoji: '🦊', name: 'Fox' },
];

const PET_STAGES: Record<string, Record<string, string>> = {
  unicorn: { sleeping: '🥚', egg: '🥚', growing: '🦄', hatched: '🦄🌈' },
  dragon: { sleeping: '🥚', egg: '🥚', growing: '🐲', hatched: '🐉✨' },
  phoenix: { sleeping: '🥚', egg: '🥚', growing: '🐣', hatched: '🦅🔥' },
  cat: { sleeping: '🥚', egg: '🥚', growing: '🐱', hatched: '😺💫' },
  dog: { sleeping: '🥚', egg: '🥚', growing: '🐕', hatched: '🐕🎉' },
  rabbit: { sleeping: '🥚', egg: '🥚', growing: '🐰', hatched: '🐰🌸' },
  panda: { sleeping: '🥚', egg: '🥚', growing: '🐼', hatched: '🐼🎋' },
  fox: { sleeping: '🥚', egg: '🥚', growing: '🦊', hatched: '🦊✨' },
};

export function FocusPetDisplay({ completedCount, totalTasks = 3, className }: FocusPetDisplayProps) {
  const { pet, selectPet } = useArcade();
  
  const petType = pet?.pet_type || 'unicorn';
  const stage = useMemo(() => {
    if (completedCount >= 3) return 'hatched';
    if (completedCount >= 1) return 'growing';
    return 'egg';
  }, [completedCount]);

  const currentEmoji = PET_STAGES[petType]?.[stage] || PET_STAGES.unicorn[stage];
  const progress = (completedCount / totalTasks) * 100;
  const canSelectPet = completedCount === 0;

  const getStageMessage = () => {
    switch (stage) {
      case 'hatched':
        return '🎉 Your pet hatched! Amazing work today!';
      case 'growing':
        return `${completedCount}/3 tasks done - keep going!`;
      default:
        return 'Complete tasks to hatch your pet!';
    }
  };

  const handlePetSelect = async (value: string) => {
    if (!canSelectPet) return;
    await selectPet(value);
  };

  return (
    <div className={cn(
      "flex flex-col items-center gap-4 p-6 rounded-2xl",
      "bg-gradient-to-b from-muted/50 to-muted/20",
      "border border-border/50",
      className
    )}>
      {/* Pet Display */}
      <div className={cn(
        "text-7xl transition-all duration-500",
        stage === 'hatched' && "animate-bounce",
        stage === 'growing' && "animate-pulse"
      )}>
        {currentEmoji}
      </div>

      {/* Pet Selector (only when no tasks completed) */}
      {canSelectPet && (
        <Select value={petType} onValueChange={handlePetSelect}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Choose pet" />
          </SelectTrigger>
          <SelectContent>
            {PET_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.emoji} {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Progress */}
      <div className="w-full max-w-xs space-y-2">
        <Progress value={progress} className="h-3" />
        <p className="text-sm text-muted-foreground text-center">
          {getStageMessage()}
        </p>
      </div>

      {/* Completed badge */}
      {stage === 'hatched' && (
        <div className="px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
          ✨ All tasks complete!
        </div>
      )}
    </div>
  );
}
