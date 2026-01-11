import { useArcade } from '@/hooks/useArcade';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

const PETS = [
  { type: 'unicorn', emoji: '🦄', name: 'Unicorn' },
  { type: 'dragon', emoji: '🐉', name: 'Dragon' },
  { type: 'cat', emoji: '🐱', name: 'Cat' },
  { type: 'dog', emoji: '🐕', name: 'Dog' },
  { type: 'bunny', emoji: '🐰', name: 'Bunny' },
  { type: 'fox', emoji: '🦊', name: 'Fox' },
  { type: 'panda', emoji: '🐼', name: 'Panda' },
  { type: 'penguin', emoji: '🐧', name: 'Penguin' },
  { type: 'owl', emoji: '🦉', name: 'Owl' },
  { type: 'hamster', emoji: '🐹', name: 'Hamster' },
];

export function PetStoreTab() {
  const { pet, selectPet } = useArcade();

  const handleSelectPet = async (petType: string) => {
    await selectPet(petType);
    toast.success(`You selected a ${petType}! Complete 3 tasks to hatch it 🥚`);
  };

  const getStageDisplay = () => {
    if (!pet) return null;
    
    const petInfo = PETS.find(p => p.type === pet.pet_type);
    const progress = Math.min((pet.tasks_completed_today / 3) * 100, 100);
    
    if (pet.stage === 'hatched') {
      return (
        <Card className="border-2 border-green-500 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-6 text-center">
            <div className="text-6xl mb-4 animate-bounce" style={{ animationDuration: '2s' }}>
              {petInfo?.emoji}
            </div>
            <p className="text-lg font-semibold text-green-700 dark:text-green-300">
              Your {petInfo?.name} hatched! 🎉
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Complete more tasks to earn coins
            </p>
          </CardContent>
        </Card>
      );
    }
    
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-center">Today's Egg</CardTitle>
          <CardDescription className="text-center">
            Complete 3 tasks to hatch your pet
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="text-6xl mb-4">🥚</div>
          <div className="space-y-2">
            <Progress value={progress} className="h-3" />
            <p className="text-sm text-muted-foreground">
              {pet.tasks_completed_today}/3 tasks completed
            </p>
          </div>
          <p className="text-sm mt-2">
            Hatching: {petInfo?.emoji} {petInfo?.name}
          </p>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Current pet status */}
      {pet && getStageDisplay()}

      {/* Pet selection grid */}
      <div>
        <h3 className="text-lg font-semibold mb-3">
          {pet ? 'Choose a different pet for tomorrow' : 'Choose today\'s pet'}
        </h3>
        <div className="grid grid-cols-5 gap-3">
          {PETS.map(petOption => {
            const isSelected = pet?.pet_type === petOption.type;
            
            return (
              <Button
                key={petOption.type}
                variant={isSelected ? 'default' : 'outline'}
                className="flex flex-col h-auto py-3 px-2"
                onClick={() => handleSelectPet(petOption.type)}
                disabled={isSelected && pet?.stage !== 'hatched'}
              >
                <span className="text-2xl mb-1">{petOption.emoji}</span>
                <span className="text-xs">{petOption.name}</span>
              </Button>
            );
          })}
        </div>
        {!pet && (
          <p className="text-sm text-muted-foreground mt-3 text-center">
            Select a pet to start growing it with your tasks today!
          </p>
        )}
      </div>
    </div>
  );
}
