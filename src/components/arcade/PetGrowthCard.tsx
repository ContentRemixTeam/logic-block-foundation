import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useArcade } from '@/hooks/useArcade';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { TaskCelebrationModal } from './TaskCelebrationModal';

// Pet emojis for each stage
const PET_STAGE_EMOJIS: Record<string, Record<string, string>> = {
  unicorn: { sleeping: '🥚', baby: '🦄', teen: '🦄✨', adult: '🦄🌈' },
  dragon: { sleeping: '🥚', baby: '🐲', teen: '🐲🔥', adult: '🐉' },
  cat: { sleeping: '🥚', baby: '🐱', teen: '🐱✨', adult: '😺' },
  dog: { sleeping: '🥚', baby: '🐶', teen: '🐕✨', adult: '🐕🎉' },
  bunny: { sleeping: '🥚', baby: '🐰', teen: '🐰✨', adult: '🐰🥕' },
  fox: { sleeping: '🥚', baby: '🦊', teen: '🦊✨', adult: '🦊🍂' },
  panda: { sleeping: '🥚', baby: '🐼', teen: '🐼✨', adult: '🐼🎋' },
  penguin: { sleeping: '🥚', baby: '🐧', teen: '🐧✨', adult: '🐧❄️' },
  owl: { sleeping: '🥚', baby: '🦉', teen: '🦉✨', adult: '🦉🌙' },
  hamster: { sleeping: '🥚', baby: '🐹', teen: '🐹✨', adult: '🐹🌻' },
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

interface TaskSlot {
  id: string;
  text: string;
  completed: boolean;
}

export function PetGrowthCard() {
  const { user } = useAuth();
  const { pet, refreshPet, refreshWallet } = useArcade();
  const today = new Date().toISOString().split('T')[0];
  
  const [tasks, setTasks] = useState<TaskSlot[]>([
    { id: '1', text: '', completed: false },
    { id: '2', text: '', completed: false },
    { id: '3', text: '', completed: false },
  ]);
  const [celebrationOpen, setCelebrationOpen] = useState(false);
  const [lastCompletedIndex, setLastCompletedIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate current stage based on completed tasks
  const completedCount = tasks.filter(t => t.completed).length;
  const petType = pet?.pet_type || 'unicorn';
  const petName = PET_NAMES[petType] || 'Pet';
  
  // Determine stage: sleeping (0), baby (1), teen (2), adult (3)
  const getStage = (count: number) => {
    if (count >= 3) return 'adult';
    if (count >= 2) return 'teen';
    if (count >= 1) return 'baby';
    return 'sleeping';
  };
  
  const currentStage = getStage(completedCount);
  const petEmojis = PET_STAGE_EMOJIS[petType] || PET_STAGE_EMOJIS.unicorn;
  const currentEmoji = petEmojis[currentStage];

  const getStageMessage = () => {
    switch (currentStage) {
      case 'sleeping': return `${petName} is sleeping... zzz`;
      case 'baby': return `${petName} woke up! Keep going!`;
      case 'teen': return `${petName} is growing! One more!`;
      case 'adult': return `${petName} is all grown up! 🎉`;
      default: return '';
    }
  };

  const getStageTitle = () => {
    switch (currentStage) {
      case 'sleeping': return 'Sleeping Baby';
      case 'baby': return 'Awake Baby';
      case 'teen': return 'Growing Up';
      case 'adult': return 'All Grown Up!';
      default: return '';
    }
  };

  const handleTaskChange = useCallback((index: number, text: string) => {
    setTasks(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], text };
      return updated;
    });
  }, []);

  const handleTaskComplete = useCallback(async (index: number) => {
    if (!user || isSubmitting) return;
    
    const task = tasks[index];
    if (!task.text.trim() || task.completed) return;

    setIsSubmitting(true);
    
    // Optimistic update
    setTasks(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], completed: true };
      return updated;
    });

    try {
      const newCompletedCount = completedCount + 1;
      const newStage = getStage(newCompletedCount);

      // Update pet in database
      if (pet) {
        await supabase
          .from('arcade_daily_pet')
          .update({
            tasks_completed_today: newCompletedCount,
            stage: newStage,
            hatched_at: newStage === 'adult' && !pet.hatched_at 
              ? new Date().toISOString() 
              : pet.hatched_at,
            updated_at: new Date().toISOString(),
          })
          .eq('id', pet.id);
      } else {
        // Create pet if doesn't exist
        await supabase
          .from('arcade_daily_pet')
          .upsert({
            user_id: user.id,
            date: today,
            pet_type: 'unicorn',
            stage: newStage,
            tasks_completed_today: newCompletedCount,
          }, {
            onConflict: 'user_id,date',
          });
      }

      // Award coins
      const dedupeKey = `pet_task_complete:${user.id}:${today}:${index}`;
      await supabase.from('arcade_events').insert({
        user_id: user.id,
        event_type: 'task_completed',
        coins_delta: 5,
        metadata: { task_index: index, task_text: task.text, date: today },
        dedupe_key: dedupeKey,
      });

      // Update wallet
      const { data: walletData } = await supabase
        .from('arcade_wallet')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (walletData) {
        await supabase
          .from('arcade_wallet')
          .update({
            coins_balance: (walletData.coins_balance || 0) + 5,
            total_coins_earned: (walletData.total_coins_earned || 0) + 5,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
      }

      await Promise.all([refreshPet(), refreshWallet()]);
      
      // Show celebration modal
      setLastCompletedIndex(index);
      setCelebrationOpen(true);
      
    } catch (err) {
      console.error('Failed to complete task:', err);
      // Revert optimistic update
      setTasks(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], completed: false };
        return updated;
      });
      toast.error('Failed to complete task');
    } finally {
      setIsSubmitting(false);
    }
  }, [user, tasks, completedCount, pet, today, refreshPet, refreshWallet, isSubmitting]);

  const handleCelebrate = async (reflection: string) => {
    if (!user) return;
    
    // Save reflection as a trophy/micro-celebration
    if (reflection.trim()) {
      try {
        await supabase.from('earned_trophies').insert({
          user_id: user.id,
          trophy_type: 'micro_win',
          challenge_name: reflection,
          earned_at: new Date().toISOString(),
        });
        
        // Bonus coins for celebrating
        const dedupeKey = `celebration_bonus:${user.id}:${today}:${lastCompletedIndex}`;
        await supabase.from('arcade_events').insert({
          user_id: user.id,
          event_type: 'celebration_bonus',
          coins_delta: 2,
          metadata: { reflection, date: today },
          dedupe_key: dedupeKey,
        });
        
        const { data: walletData } = await supabase
          .from('arcade_wallet')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (walletData) {
          await supabase
            .from('arcade_wallet')
            .update({
              coins_balance: (walletData.coins_balance || 0) + 2,
              total_coins_earned: (walletData.total_coins_earned || 0) + 2,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id);
        }
        
        await refreshWallet();
        toast.success('+2 bonus coins for celebrating! 🏆');
      } catch (err) {
        console.error('Failed to save celebration:', err);
      }
    }
    
    setCelebrationOpen(false);
    setLastCompletedIndex(null);
  };

  const progress = (completedCount / 3) * 100;

  return (
    <>
      <Card className={cn(
        "overflow-hidden transition-all",
        currentStage === 'adult' && "ring-2 ring-primary/50 bg-gradient-to-b from-primary/10 to-background"
      )}>
        <CardContent className="pt-6 space-y-6">
          {/* Pet Display */}
          <div className="text-center space-y-2">
            <div 
              className={cn(
                "text-6xl transition-all duration-500",
                currentStage === 'sleeping' && "grayscale opacity-60",
                currentStage === 'baby' && "animate-pulse",
                currentStage === 'teen' && "animate-bounce",
                currentStage === 'adult' && "animate-bounce"
              )}
              style={{ animationDuration: currentStage === 'adult' ? '1s' : '2s' }}
            >
              {currentEmoji}
            </div>
            <h3 className="font-semibold text-lg">{getStageTitle()}</h3>
            <p className="text-sm text-muted-foreground">{getStageMessage()}</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm font-medium">{completedCount}/3 tasks completed</span>
            </div>
            <Progress value={progress} className="h-2 max-w-xs mx-auto" />
          </div>

          {/* Task Inputs */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-center">📝 Today's Tasks</h4>
            {tasks.map((task, index) => (
              <div 
                key={task.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-all",
                  task.completed 
                    ? "bg-primary/10 border-primary/30" 
                    : "bg-muted/30 border-border"
                )}
              >
                <span className="text-sm font-medium text-muted-foreground w-16">
                  Task {index + 1}
                </span>
                <Input
                  value={task.text}
                  onChange={(e) => handleTaskChange(index, e.target.value)}
                  placeholder={`What's your ${index === 0 ? 'first' : index === 1 ? 'second' : 'third'} task?`}
                  disabled={task.completed}
                  className={cn(
                    "flex-1 h-9",
                    task.completed && "line-through text-muted-foreground"
                  )}
                />
                <Checkbox
                  checked={task.completed}
                  disabled={!task.text.trim() || task.completed || isSubmitting}
                  onCheckedChange={() => handleTaskComplete(index)}
                  className="h-6 w-6"
                />
              </div>
            ))}
          </div>

          {/* Hint text */}
          {completedCount === 0 && (
            <p className="text-xs text-center text-muted-foreground">
              Complete 3 tasks to grow your {petName} from egg to adult!
            </p>
          )}
        </CardContent>
      </Card>

      <TaskCelebrationModal
        open={celebrationOpen}
        onClose={() => {
          setCelebrationOpen(false);
          setLastCompletedIndex(null);
        }}
        onCelebrate={handleCelebrate}
        petEmoji={currentEmoji}
        completedCount={completedCount}
        isAllComplete={completedCount >= 3}
      />
    </>
  );
}
