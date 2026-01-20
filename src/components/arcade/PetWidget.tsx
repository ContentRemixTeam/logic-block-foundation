import { useArcade } from '@/hooks/useArcade';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Pet emojis for each stage
const PET_STAGE_EMOJIS: Record<string, Record<string, string>> = {
  unicorn: { sleeping: '🥚', baby: '🦄', teen: '🦄', adult: '🦄' },
  dragon: { sleeping: '🥚', baby: '🐲', teen: '🐲', adult: '🐉' },
  cat: { sleeping: '🥚', baby: '🐱', teen: '🐱', adult: '😺' },
  dog: { sleeping: '🥚', baby: '🐶', teen: '🐕', adult: '🐕' },
  bunny: { sleeping: '🥚', baby: '🐰', teen: '🐰', adult: '🐰' },
  fox: { sleeping: '🥚', baby: '🦊', teen: '🦊', adult: '🦊' },
  panda: { sleeping: '🥚', baby: '🐼', teen: '🐼', adult: '🐼' },
  penguin: { sleeping: '🥚', baby: '🐧', teen: '🐧', adult: '🐧' },
  owl: { sleeping: '🥚', baby: '🦉', teen: '🦉', adult: '🦉' },
  hamster: { sleeping: '🥚', baby: '🐹', teen: '🐹', adult: '🐹' },
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
  
  const petName = PET_NAMES[pet.pet_type] || pet.pet_type;
  const petEmojis = PET_STAGE_EMOJIS[pet.pet_type] || PET_STAGE_EMOJIS.unicorn;
  const emoji = petEmojis[pet.stage] || '🥚';
  const progress = pet.tasks_completed_today || 0;
  
  // Show based on stage
  if (pet.stage !== 'adult') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-lg cursor-default animate-pulse">{emoji}</span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{petName} is growing! ({progress}/3 tasks)</p>
        </TooltipContent>
      </Tooltip>
    );
  }
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="text-xl cursor-default animate-bounce" style={{ animationDuration: '2s' }}>
          {emoji}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>Your {petName} is fully grown! 🎉</p>
      </TooltipContent>
    </Tooltip>
  );
}
