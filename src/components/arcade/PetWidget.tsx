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
  const { pet, settings } = useArcade();
  
  // Only show when arcade is enabled and pet has hatched
  if (!settings.arcade_enabled || !pet || pet.stage !== 'hatched') {
    return null;
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
