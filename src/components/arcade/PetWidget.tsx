import { useArcade } from '@/hooks/useArcade';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const PET_EMOJIS: Record<string, string> = {
  unicorn: '🦄',
  dragon: '🐉',
  cat: '🐱',
  dog: '🐕',
  bunny: '🐰',
  fox: '🦊',
  panda: '🐼',
  penguin: '🐧',
  owl: '🦉',
  hamster: '🐹',
};

const PET_NAMES: Record<string, string> = {
  unicorn: 'Unicorn',
  dragon: 'Dragon',
  cat: 'Cat',
  dog: 'Dog',
  bunny: 'Bunny',
  fox: 'Fox',
  panda: 'Panda',
  penguin: 'Penguin',
  owl: 'Owl',
  hamster: 'Hamster',
};

export function PetWidget() {
  const { pet } = useArcade();
  
  // Show egg when no pet is selected yet
  if (!pet) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-lg cursor-default opacity-60">🥚</span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Select a pet to start growing!</p>
        </TooltipContent>
      </Tooltip>
    );
  }
  
  // Show growing egg if pet is selected but not hatched
  if (pet.stage !== 'hatched') {
    const progress = pet.tasks_completed_today || 0;
    const petName = PET_NAMES[pet.pet_type] || pet.pet_type;
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-lg cursor-default animate-pulse">🥚</span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{petName} is growing! ({progress}/5 tasks)</p>
        </TooltipContent>
      </Tooltip>
    );
  }
  
  const emoji = PET_EMOJIS[pet.pet_type] || '🐾';
  const name = PET_NAMES[pet.pet_type] || pet.pet_type;
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="text-xl cursor-default animate-bounce" style={{ animationDuration: '2s' }}>
          {emoji}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>Your {name} hatched today! 🎉</p>
      </TooltipContent>
    </Tooltip>
  );
}
