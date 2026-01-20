import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useArcade } from '@/hooks/useArcade';
import { useTasks } from '@/hooks/useTasks';
import { usePomodoro } from '@/hooks/usePomodoro';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { TaskCelebrationModal } from './TaskCelebrationModal';
import { RotateCcw, ChevronDown, Timer, Pause, Play, X, Check } from 'lucide-react';

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

// Get random pet type
const getRandomPetType = () => {
  const types = Object.keys(PET_NAMES);
  return types[Math.floor(Math.random() * types.length)];
};

interface TaskSlot {
  id: string;
  text: string;
  completed: boolean;
  linkedTaskId?: string; // Reference to task from task manager
  timerActive?: boolean;
}

export function PetGrowthCard() {
  const { user } = useAuth();
  const { pet, refreshPet, settings } = useArcade();
  const { data: allTasks = [] } = useTasks();
  const pomodoro = usePomodoro();
  const today = new Date().toISOString().split('T')[0];
  
  const [tasks, setTasks] = useState<TaskSlot[]>([
    { id: '1', text: '', completed: false },
    { id: '2', text: '', completed: false },
    { id: '3', text: '', completed: false },
  ]);
  const [celebrationOpen, setCelebrationOpen] = useState(false);
  const [lastCompletedIndex, setLastCompletedIndex] = useState<number | null>(null);
  const [lastCompletedTask, setLastCompletedTask] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [openPopoverIndex, setOpenPopoverIndex] = useState<number | null>(null);
  const [activeTimerIndex, setActiveTimerIndex] = useState<number | null>(null);

  // Get incomplete tasks from task manager for dropdown
  const incompleteTasks = useMemo(() => 
    allTasks.filter(t => !t.is_completed).slice(0, 30),
    [allTasks]
  );

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
  const isComplete = completedCount >= 3;

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
      updated[index] = { ...updated[index], text, linkedTaskId: undefined };
      return updated;
    });
  }, []);

  const handleSelectTask = useCallback((index: number, taskId: string, taskText: string) => {
    setTasks(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], text: taskText, linkedTaskId: taskId };
      return updated;
    });
    setOpenPopoverIndex(null);
  }, []);

  const handleStartTimer = useCallback((index: number) => {
    const task = tasks[index];
    if (!task.text.trim()) return;
    
    pomodoro.startFocus(task.linkedTaskId);
    setActiveTimerIndex(index);
  }, [tasks, pomodoro]);

  const handleStopTimer = useCallback(() => {
    pomodoro.reset();
    setActiveTimerIndex(null);
  }, [pomodoro]);

  const handleTaskComplete = useCallback(async (index: number) => {
    if (!user || isSubmitting) return;
    
    const task = tasks[index];
    if (!task.text.trim() || task.completed) return;

    setIsSubmitting(true);
    
    // Stop timer if running on this task
    if (activeTimerIndex === index) {
      handleStopTimer();
    }
    
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

      // Log event (without coins)
      const dedupeKey = `pet_task_complete:${user.id}:${today}:${index}`;
      await supabase.from('arcade_events').insert({
        user_id: user.id,
        event_type: 'task_completed',
        coins_delta: 0,
        metadata: { task_index: index, task_text: task.text, date: today, linked_task_id: task.linkedTaskId },
        dedupe_key: dedupeKey,
      });

      await refreshPet();
      
      // Show celebration modal
      setLastCompletedIndex(index);
      setLastCompletedTask(task.text);
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
  }, [user, tasks, completedCount, pet, today, refreshPet, isSubmitting, activeTimerIndex, handleStopTimer]);

  const handleCelebrate = async (wentWell: string, couldImprove: string) => {
    if (!user) return;
    
    const hasReflection = wentWell.trim() || couldImprove.trim();
    
    // Save reflection to new table
    if (hasReflection) {
      try {
        await supabase.from('task_reflections').insert({
          user_id: user.id,
          date: today,
          task_text: lastCompletedTask,
          went_well: wentWell.trim() || null,
          could_improve: couldImprove.trim() || null,
        });
        
        toast.success('Reflection saved! 💡');
      } catch (err) {
        console.error('Failed to save reflection:', err);
      }
    }
    
    setCelebrationOpen(false);
    setLastCompletedIndex(null);
    setLastCompletedTask('');
  };

  const handleReset = async () => {
    if (!user || isResetting) return;
    
    setIsResetting(true);
    
    try {
      // Save the hatched pet to collection
      const currentPetEmoji = petEmojis['adult'];
      await supabase.from('hatched_pets').insert({
        user_id: user.id,
        date: today,
        pet_type: petType,
        pet_emoji: currentPetEmoji,
      });
      
      // Get a new random pet type
      const newPetType = getRandomPetType();
      
      // Reset the daily pet with new type
      await supabase
        .from('arcade_daily_pet')
        .update({
          pet_type: newPetType,
          stage: 'sleeping',
          tasks_completed_today: 0,
          hatched_at: null,
          pets_hatched_today: (pet?.pets_hatched_today || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('date', today);
      
      // Reset local tasks state
      setTasks([
        { id: `${Date.now()}-1`, text: '', completed: false },
        { id: `${Date.now()}-2`, text: '', completed: false },
        { id: `${Date.now()}-3`, text: '', completed: false },
      ]);
      
      await refreshPet();
      toast.success(`${petName} added to your collection! New egg ready 🥚`);
      
    } catch (err) {
      console.error('Failed to reset pet:', err);
      toast.error('Failed to start fresh');
    } finally {
      setIsResetting(false);
    }
  };

  const progress = (completedCount / 3) * 100;

  // Check if timer is active for a specific task
  const isTimerActiveForTask = (index: number) => 
    activeTimerIndex === index && pomodoro.mode === 'focus';

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

          {/* Reset Button - Show when complete */}
          {isComplete && (
            <div className="flex justify-center">
              <Button
                onClick={handleReset}
                disabled={isResetting}
                variant="outline"
                className="gap-2"
              >
                <RotateCcw className={cn("h-4 w-4", isResetting && "animate-spin")} />
                {isResetting ? 'Starting fresh...' : 'Start Fresh - Hatch Another Pet'}
              </Button>
            </div>
          )}

          {/* Task Inputs - Hide when complete */}
          {!isComplete && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-center">📝 Today's Tasks</h4>
              {tasks.map((task, index) => (
                <div 
                  key={task.id}
                  className={cn(
                    "flex flex-col gap-2 p-3 rounded-lg border transition-all",
                    task.completed 
                      ? "bg-primary/10 border-primary/30" 
                      : "bg-muted/30 border-border"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground w-14 flex-shrink-0">
                      Task {index + 1}
                    </span>
                    
                    {/* Task Input with Dropdown */}
                    <Popover open={openPopoverIndex === index} onOpenChange={(open) => setOpenPopoverIndex(open ? index : null)}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openPopoverIndex === index}
                          disabled={task.completed}
                          className={cn(
                            "flex-1 justify-between h-9 font-normal",
                            !task.text && "text-muted-foreground",
                            task.completed && "line-through text-muted-foreground"
                          )}
                        >
                          <span className="truncate text-left">
                            {task.text || `Select or type task ${index + 1}...`}
                          </span>
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0" align="start">
                        <Command>
                          <CommandInput 
                            placeholder="Search or type a task..."
                            value={task.text}
                            onValueChange={(value) => handleTaskChange(index, value)}
                          />
                          <CommandList>
                            <CommandEmpty>
                              {task.text.trim() ? (
                                <button 
                                  className="w-full p-2 text-left text-sm hover:bg-muted rounded flex items-center gap-2"
                                  onClick={() => setOpenPopoverIndex(null)}
                                >
                                  <Check className="h-4 w-4" />
                                  Use "{task.text}"
                                </button>
                              ) : (
                                "Type to create a task or search..."
                              )}
                            </CommandEmpty>
                            {incompleteTasks.length > 0 && (
                              <CommandGroup heading="Your Tasks">
                                {incompleteTasks.map((t) => (
                                  <CommandItem
                                    key={t.task_id}
                                    value={t.task_text}
                                    onSelect={() => handleSelectTask(index, t.task_id, t.task_text)}
                                  >
                                    <span className="truncate">{t.task_text}</span>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>

                    {/* Timer Button */}
                    {!task.completed && task.text.trim() && (
                      <Button
                        variant={isTimerActiveForTask(index) ? "destructive" : "ghost"}
                        size="icon"
                        className="h-9 w-9 flex-shrink-0"
                        onClick={() => isTimerActiveForTask(index) ? handleStopTimer() : handleStartTimer(index)}
                        title={isTimerActiveForTask(index) ? "Stop timer" : "Start focus timer"}
                      >
                        {isTimerActiveForTask(index) ? (
                          <X className="h-4 w-4" />
                        ) : (
                          <Timer className="h-4 w-4" />
                        )}
                      </Button>
                    )}

                    {/* Checkbox */}
                    <Checkbox
                      checked={task.completed}
                      disabled={!task.text.trim() || task.completed || isSubmitting}
                      onCheckedChange={() => handleTaskComplete(index)}
                      className="h-6 w-6 flex-shrink-0"
                    />
                  </div>

                  {/* Inline Timer Display */}
                  {isTimerActiveForTask(index) && (
                    <div className="flex items-center justify-between bg-primary/10 rounded-lg p-2 ml-14">
                      <div className="flex items-center gap-2">
                        <Timer className="h-4 w-4 text-primary" />
                        <span className="font-mono font-bold text-primary">{pomodoro.formattedTime}</span>
                        <span className="text-xs text-muted-foreground">Focus Time</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {pomodoro.isRunning ? (
                          <Button variant="ghost" size="sm" onClick={pomodoro.pause} className="h-7 px-2">
                            <Pause className="h-3 w-3" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={pomodoro.resume} className="h-7 px-2">
                            <Play className="h-3 w-3" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={handleStopTimer} className="h-7 px-2">
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

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
          setLastCompletedTask('');
        }}
        onCelebrate={handleCelebrate}
        petEmoji={currentEmoji}
        completedCount={completedCount}
        isAllComplete={completedCount >= 3}
        taskText={lastCompletedTask}
      />
    </>
  );
}
