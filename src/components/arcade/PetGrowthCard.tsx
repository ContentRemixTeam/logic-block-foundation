import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useArcade } from '@/hooks/useArcade';
import { useTasks } from '@/hooks/useTasks';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { TaskCelebrationModal } from './TaskCelebrationModal';
import { TimerCompleteModal } from './TimerCompleteModal';
import { playTimerSound } from '@/lib/timerSound';
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

const PET_OPTIONS = [
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

const TIMER_DURATIONS = [
  { value: 5, label: '5 min' },
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
  { value: 25, label: '25 min' },
  { value: 45, label: '45 min' },
];

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

const getRandomPetType = () => {
  const types = Object.keys(PET_NAMES);
  return types[Math.floor(Math.random() * types.length)];
};

interface TaskSlot {
  id: string;
  text: string;
  completed: boolean;
  linkedTaskId?: string;
  timerActive?: boolean;
}

export function PetGrowthCard() {
  const { user } = useAuth();
  const { pet, refreshPet, selectPet } = useArcade();
  const { data: allTasks = [] } = useTasks();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  
  // Timer state (inline instead of usePomodoro for custom duration)
  const [timerState, setTimerState] = useState({
    isRunning: false,
    timeRemaining: 0,
    totalDuration: 0,
  });
  const intervalRef = useRef<number | null>(null);
  
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
  const [timerDurationPopoverIndex, setTimerDurationPopoverIndex] = useState<number | null>(null);
  const [timerCompleteOpen, setTimerCompleteOpen] = useState(false);
  const [timerCompletedTaskIndex, setTimerCompletedTaskIndex] = useState<number | null>(null);

  // Get incomplete tasks scheduled for today from task manager for dropdown
  const incompleteTasks = useMemo(() => 
    allTasks.filter(t => !t.is_completed && t.scheduled_date === today).slice(0, 30),
    [allTasks, today]
  );

  // Calculate current stage based on completed tasks
  const completedCount = tasks.filter(t => t.completed).length;
  const petType = pet?.pet_type || 'unicorn';
  const petName = PET_NAMES[petType] || 'Pet';
  
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
  const canSelectPet = currentStage === 'sleeping';

  // Timer tick effect
  useEffect(() => {
    if (timerState.isRunning && timerState.timeRemaining > 0) {
      intervalRef.current = window.setInterval(() => {
        setTimerState(prev => {
          if (prev.timeRemaining <= 1) {
            // Timer complete!
            playTimerSound();
            setTimerCompleteOpen(true);
            setTimerCompletedTaskIndex(activeTimerIndex);
            return { ...prev, isRunning: false, timeRemaining: 0 };
          }
          return { ...prev, timeRemaining: prev.timeRemaining - 1 };
        });
      }, 1000);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timerState.isRunning, timerState.timeRemaining, activeTimerIndex]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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

  const handlePetSelect = async (newPetType: string) => {
    await selectPet(newPetType);
    toast.success(`You selected ${PET_NAMES[newPetType]}! Complete 3 tasks to hatch it 🥚`);
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

  const handleStartTimer = useCallback((index: number, durationMinutes: number) => {
    const task = tasks[index];
    if (!task.text.trim()) return;
    
    setTimerState({
      isRunning: true,
      timeRemaining: durationMinutes * 60,
      totalDuration: durationMinutes * 60,
    });
    setActiveTimerIndex(index);
    setTimerDurationPopoverIndex(null);
  }, [tasks]);

  const handlePauseTimer = useCallback(() => {
    setTimerState(prev => ({ ...prev, isRunning: false }));
  }, []);

  const handleResumeTimer = useCallback(() => {
    setTimerState(prev => ({ ...prev, isRunning: true }));
  }, []);

  const handleStopTimer = useCallback(() => {
    setTimerState({ isRunning: false, timeRemaining: 0, totalDuration: 0 });
    setActiveTimerIndex(null);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  const handleTaskComplete = useCallback(async (index: number) => {
    if (!user || isSubmitting) return;
    
    const task = tasks[index];
    if (!task.text.trim() || task.completed) return;

    setIsSubmitting(true);
    
    // Stop timer if running on this task
    if (activeTimerIndex === index) {
      handleStopTimer();
    }
    
    // Close timer complete modal if open
    setTimerCompleteOpen(false);
    setTimerCompletedTaskIndex(null);
    
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

      // Log event
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
      const currentPetEmoji = petEmojis['adult'];
      await supabase.from('hatched_pets').insert({
        user_id: user.id,
        date: today,
        pet_type: petType,
        pet_emoji: currentPetEmoji,
      });
      
      const newPetType = getRandomPetType();
      
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
      
      setTasks([
        { id: `${Date.now()}-1`, text: '', completed: false },
        { id: `${Date.now()}-2`, text: '', completed: false },
        { id: `${Date.now()}-3`, text: '', completed: false },
      ]);
      
      // Invalidate the pets query so the toolbar widget updates immediately
      queryClient.invalidateQueries({ queryKey: ['hatched-pets'] });
      
      await refreshPet();
      toast.success(`${petName} added to your collection! New egg ready 🥚`);
      
    } catch (err) {
      console.error('Failed to reset pet:', err);
      toast.error('Failed to start fresh');
    } finally {
      setIsResetting(false);
    }
  };

  // Timer complete modal handlers
  const handleTimerTaskComplete = () => {
    if (timerCompletedTaskIndex !== null) {
      handleTaskComplete(timerCompletedTaskIndex);
    }
  };

  const handleTimerNeedMoreTime = () => {
    if (timerCompletedTaskIndex !== null) {
      // Restart timer with same duration
      const lastDuration = timerState.totalDuration || 25 * 60;
      setTimerState({
        isRunning: true,
        timeRemaining: lastDuration,
        totalDuration: lastDuration,
      });
      setActiveTimerIndex(timerCompletedTaskIndex);
    }
    setTimerCompleteOpen(false);
    setTimerCompletedTaskIndex(null);
  };

  const handleTimerSkip = () => {
    setTimerCompleteOpen(false);
    setTimerCompletedTaskIndex(null);
    handleStopTimer();
  };

  const progress = (completedCount / 3) * 100;
  const isTimerActiveForTask = (index: number) => activeTimerIndex === index && timerState.timeRemaining > 0;
  const timerCompletedTaskText = timerCompletedTaskIndex !== null ? tasks[timerCompletedTaskIndex]?.text || '' : '';

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
            
            {/* Pet Selector - only when sleeping */}
            {canSelectPet && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <span className="text-sm text-muted-foreground">Choose pet:</span>
                <Select value={petType} onValueChange={handlePetSelect}>
                  <SelectTrigger className="w-[140px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PET_OPTIONS.map(option => (
                      <SelectItem key={option.type} value={option.type}>
                        {option.emoji} {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
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

                    {/* Timer Button with Duration Popover */}
                    {!task.completed && task.text.trim() && !isTimerActiveForTask(index) && (
                      <Popover 
                        open={timerDurationPopoverIndex === index} 
                        onOpenChange={(open) => setTimerDurationPopoverIndex(open ? index : null)}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 flex-shrink-0"
                            title="Start focus timer"
                          >
                            <Timer className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-3" align="end">
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-center">Focus Duration</p>
                            <div className="flex gap-1 flex-wrap justify-center">
                              {TIMER_DURATIONS.map(duration => (
                                <Button
                                  key={duration.value}
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-3"
                                  onClick={() => handleStartTimer(index, duration.value)}
                                >
                                  {duration.label}
                                </Button>
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}

                    {/* Stop Timer Button when active */}
                    {isTimerActiveForTask(index) && (
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-9 w-9 flex-shrink-0"
                        onClick={handleStopTimer}
                        title="Stop timer"
                      >
                        <X className="h-4 w-4" />
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
                        <span className="font-mono font-bold text-primary">{formatTime(timerState.timeRemaining)}</span>
                        <span className="text-xs text-muted-foreground">Focus Time</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {timerState.isRunning ? (
                          <Button variant="ghost" size="sm" onClick={handlePauseTimer} className="h-7 px-2">
                            <Pause className="h-3 w-3" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={handleResumeTimer} className="h-7 px-2">
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

      <TimerCompleteModal
        open={timerCompleteOpen}
        onOpenChange={setTimerCompleteOpen}
        taskText={timerCompletedTaskText}
        onTaskComplete={handleTimerTaskComplete}
        onNeedMoreTime={handleTimerNeedMoreTime}
        onSkip={handleTimerSkip}
      />
    </>
  );
}
