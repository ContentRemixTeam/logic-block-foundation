import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useArcade } from '@/hooks/useArcade';
import { useTasks } from '@/hooks/useTasks';
import { useTaskMutations } from '@/hooks/useTasks';
import { useBlitzTimer, BlitzTask } from '@/hooks/useBlitzTimer';
import { BlitzTaskCard } from '@/components/focus/BlitzTaskCard';
import { PipToolbar } from '@/components/focus/PipToolbar';
import { PetCollectionWidget } from '@/components/arcade/PetCollectionWidget';
import { StatsTab } from '@/components/arcade/tabs/StatsTab';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  Target, 
  Sparkles, 
  BarChart3,
  Settings,
  CheckSquare,
  Egg,
  Timer,
  ListTodo,
  Calendar,
  Zap,
  PictureInPicture2,
  ChevronDown,
  Plus,
  RotateCcw,
} from 'lucide-react';

// Pet stage emojis
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

const PET_NAMES: Record<string, string> = {
  unicorn: 'Unicorn', dragon: 'Dragon', cat: 'Cat', dog: 'Dog', bunny: 'Bunny',
  fox: 'Fox', panda: 'Panda', penguin: 'Penguin', owl: 'Owl', hamster: 'Hamster',
};

const getRandomPetType = () => {
  const types = Object.keys(PET_NAMES);
  return types[Math.floor(Math.random() * types.length)];
};

type PlanningMode = 'top3' | 'fullday';

export default function Focus() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { pet, settings, updateSettings, refreshPet, selectPet, isLoading: arcadeLoading } = useArcade();
  const { data: allTasks = [], isLoading: tasksLoading } = useTasks();
  const { toggleComplete } = useTaskMutations();
  const [activeTab, setActiveTab] = useState('focus');
  const [planningMode, setPlanningMode] = useState<PlanningMode>('top3');
  const [taskTimeEstimates, setTaskTimeEstimates] = useState<Record<string, number | null>>({});
  const [openPopoverIndex, setOpenPopoverIndex] = useState<number | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  
  // Local task state for Top 3 mode
  const [localTop3, setLocalTop3] = useState<Array<{
    id: string;
    text: string;
    completed: boolean;
    linkedTaskId?: string;
  }>>([
    { id: '1', text: '', completed: false },
    { id: '2', text: '', completed: false },
    { id: '3', text: '', completed: false },
  ]);

  const today = new Date().toISOString().split('T')[0];

  // Get today's tasks for full day mode
  const todaysTasks = useMemo(() => 
    allTasks.filter(t => t.scheduled_date === today && !t.is_completed),
    [allTasks, today]
  );

  // Build BlitzTask list based on mode
  const blitzTasks = useMemo<BlitzTask[]>(() => {
    if (planningMode === 'top3') {
      return localTop3.map((t, i) => ({
        id: t.id,
        text: t.text,
        estimatedMinutes: taskTimeEstimates[t.id] || null,
        isCompleted: t.completed,
        position: i + 1,
        taskId: t.linkedTaskId || null,
      }));
    } else {
      return todaysTasks.map((t, i) => ({
        id: t.task_id,
        text: t.task_text,
        estimatedMinutes: taskTimeEstimates[t.task_id] || null,
        isCompleted: t.is_completed,
        position: i + 1,
        taskId: t.task_id,
      }));
    }
  }, [planningMode, localTop3, todaysTasks, taskTimeEstimates]);

  const completedCount = blitzTasks.filter(t => t.isCompleted).length;
  const totalTasks = blitzTasks.length;
  const tasksWithText = blitzTasks.filter(t => t.text.trim()).length;

  // Pet state
  const petType = pet?.pet_type || 'unicorn';
  const petName = PET_NAMES[petType] || 'Pet';
  const getStage = (count: number) => {
    if (count >= 3) return 'adult';
    if (count >= 2) return 'teen';
    if (count >= 1) return 'baby';
    return 'sleeping';
  };
  const currentStage = getStage(Math.min(completedCount, 3));
  const petEmojis = PET_STAGE_EMOJIS[petType] || PET_STAGE_EMOJIS.unicorn;
  const currentEmoji = petEmojis[currentStage];
  const isPetComplete = completedCount >= 3;
  const canSelectPet = currentStage === 'sleeping';

  // Timer complete handler
  const handleTimerComplete = useCallback(async (taskId: string) => {
    // The toast notification from the hook already asks if done
    // User can click "Done" in the toast to complete the task
    const task = blitzTasks.find(t => t.id === taskId);
    if (task && task.taskId) {
      toggleComplete.mutate(task.taskId);
    } else if (planningMode === 'top3') {
      // Local task completion
      setLocalTop3(prev => prev.map(t => 
        t.id === taskId ? { ...t, completed: true } : t
      ));
    }
  }, [blitzTasks, toggleComplete, planningMode]);

  // Initialize timer hook
  const {
    timerState,
    activeTask,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    addMinutes,
    formatTime,
    isPipSupported,
    isPipActive,
    openPip,
    closePip,
    pipWindow,
  } = useBlitzTimer(blitzTasks, handleTimerComplete);

  // Redirect if arcade disabled
  useEffect(() => {
    if (!arcadeLoading && !settings.arcade_enabled) {
      navigate('/dashboard', { replace: true });
    }
  }, [arcadeLoading, settings.arcade_enabled, navigate]);

  const handleUpdateTime = useCallback((taskId: string, minutes: number | null) => {
    setTaskTimeEstimates(prev => ({ ...prev, [taskId]: minutes }));
  }, []);

  const handleTaskComplete = useCallback(async (taskId: string) => {
    stopTimer();
    
    const task = blitzTasks.find(t => t.id === taskId);
    if (!task) return;

    if (task.taskId) {
      // Complete linked task in database
      toggleComplete.mutate(task.taskId);
    }
    
    if (planningMode === 'top3') {
      setLocalTop3(prev => prev.map(t => 
        t.id === taskId ? { ...t, completed: true } : t
      ));
      
      // Update pet progress
      if (user && pet) {
        const newCount = completedCount + 1;
        const newStage = getStage(newCount);
        
        await supabase
          .from('arcade_daily_pet')
          .update({
            tasks_completed_today: newCount,
            stage: newStage,
            hatched_at: newStage === 'adult' && !pet.hatched_at 
              ? new Date().toISOString() 
              : pet.hatched_at,
            updated_at: new Date().toISOString(),
          })
          .eq('id', pet.id);
        
        await refreshPet();
      }
    }
    
    toast.success('Task completed! 🎉');
  }, [blitzTasks, planningMode, toggleComplete, queryClient, stopTimer, user, pet, completedCount, refreshPet]);

  const handleSelectTask = useCallback((index: number, taskId: string, taskText: string) => {
    setLocalTop3(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], text: taskText, linkedTaskId: taskId };
      return updated;
    });
    setOpenPopoverIndex(null);
  }, []);

  const handleTaskTextChange = useCallback((index: number, text: string) => {
    setLocalTop3(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], text, linkedTaskId: undefined };
      return updated;
    });
  }, []);

  const handlePetSelect = async (newPetType: string) => {
    await selectPet(newPetType);
    toast.success(`You selected ${PET_NAMES[newPetType]}! Complete 3 tasks to hatch it 🥚`);
  };

  const handleReset = async () => {
    if (!user || isResetting) return;
    
    setIsResetting(true);
    
    try {
      // Save hatched pet
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
      
      setLocalTop3([
        { id: `${Date.now()}-1`, text: '', completed: false },
        { id: `${Date.now()}-2`, text: '', completed: false },
        { id: `${Date.now()}-3`, text: '', completed: false },
      ]);
      setTaskTimeEstimates({});
      
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

  // Get incomplete tasks for selection dropdown
  const incompleteTasks = useMemo(() => 
    allTasks.filter(t => !t.is_completed && t.scheduled_date === today).slice(0, 30),
    [allTasks, today]
  );

  if (arcadeLoading || tasksLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  if (!settings.arcade_enabled) {
    return null;
  }

  const progress = (Math.min(completedCount, 3) / 3) * 100;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="Focus Mode"
          description="Set timers, complete tasks, grow your pet!"
        />

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <span className="text-xl">{currentEmoji}</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pet Stage</p>
                <p className="text-lg font-bold capitalize">{currentStage}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-secondary/50">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-lg font-bold">{completedCount}/{tasksWithText}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-secondary/50">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hatched Today</p>
                <p className="text-lg font-bold">{pet?.pets_hatched_today || 0}</p>
              </div>
            </CardContent>
          </Card>

          {/* PiP Button */}
          <Card className={cn(
            "cursor-pointer transition-colors hover:bg-muted/50",
            isPipActive && "ring-2 ring-primary"
          )} onClick={isPipActive ? closePip : openPip}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-full",
                isPipActive ? "bg-primary text-primary-foreground" : "bg-secondary/50"
              )}>
                <PictureInPicture2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Float Timer</p>
                <p className="text-lg font-bold">{isPipActive ? 'Active' : 'Off'}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full max-w-lg">
            <TabsTrigger value="focus" className="gap-1.5">
              <Timer className="h-4 w-4" />
              <span className="hidden sm:inline">Focus</span>
            </TabsTrigger>
            <TabsTrigger value="collection" className="gap-1.5">
              <Egg className="h-4 w-4" />
              <span className="hidden sm:inline">Collection</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-1.5">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Progress</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="focus" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Left Column: Pet + Timer Info */}
              <div className="space-y-4">
                {/* Pet Display Card */}
                <Card className={cn(
                  "overflow-hidden transition-all",
                  currentStage === 'adult' && "ring-2 ring-primary/50 bg-gradient-to-b from-primary/10 to-background"
                )}>
                  <CardContent className="pt-6 space-y-4">
                    <div className="text-center space-y-2">
                      <div 
                        className={cn(
                          "text-6xl transition-all duration-500",
                          currentStage === 'sleeping' && "grayscale opacity-60",
                          currentStage === 'baby' && "animate-pulse",
                          (currentStage === 'teen' || currentStage === 'adult') && "animate-bounce"
                        )}
                        style={{ animationDuration: currentStage === 'adult' ? '1s' : '2s' }}
                      >
                        {currentEmoji}
                      </div>
                      <h3 className="font-semibold text-lg">{petName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {currentStage === 'sleeping' && 'Complete tasks to hatch!'}
                        {currentStage === 'baby' && 'Keep going!'}
                        {currentStage === 'teen' && 'Almost there!'}
                        {currentStage === 'adult' && '🎉 Fully hatched!'}
                      </p>
                      
                      {/* Pet Selector */}
                      {canSelectPet && (
                        <div className="flex items-center justify-center gap-2 pt-2">
                          <span className="text-sm text-muted-foreground">Choose:</span>
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
                      
                      <Progress value={progress} className="h-2 max-w-xs mx-auto" />
                      <p className="text-xs text-muted-foreground">
                        {Math.min(completedCount, 3)}/3 for evolution
                      </p>
                    </div>

                    {/* Reset Button */}
                    {isPetComplete && (
                      <div className="flex justify-center">
                        <Button
                          onClick={handleReset}
                          disabled={isResetting}
                          variant="outline"
                          size="sm"
                          className="gap-2"
                        >
                          <RotateCcw className={cn("h-4 w-4", isResetting && "animate-spin")} />
                          {isResetting ? 'Starting...' : 'Hatch Another'}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Mode Selector + Settings */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Planning Mode Toggle */}
                    <div className="space-y-2">
                      <Label className="text-sm">Planning Mode</Label>
                      <div className="flex gap-2">
                        <Button
                          variant={planningMode === 'top3' ? 'default' : 'outline'}
                          size="sm"
                          className="flex-1 gap-1"
                          onClick={() => setPlanningMode('top3')}
                        >
                          <Zap className="h-3 w-3" />
                          Top 3
                        </Button>
                        <Button
                          variant={planningMode === 'fullday' ? 'default' : 'outline'}
                          size="sm"
                          className="flex-1 gap-1"
                          onClick={() => setPlanningMode('fullday')}
                        >
                          <Calendar className="h-3 w-3" />
                          Full Day
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {planningMode === 'top3' 
                          ? 'Focus on 3 key tasks' 
                          : `All ${todaysTasks.length} scheduled tasks`}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="reduce-motion" className="text-sm">
                        Reduce animations
                      </Label>
                      <Switch
                        id="reduce-motion"
                        checked={settings.arcade_reduce_motion}
                        onCheckedChange={(checked) => 
                          updateSettings({ arcade_reduce_motion: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="sounds-off" className="text-sm">
                        Mute sounds
                      </Label>
                      <Switch
                        id="sounds-off"
                        checked={settings.arcade_sounds_off}
                        onCheckedChange={(checked) => 
                          updateSettings({ arcade_sounds_off: checked })
                        }
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* How It Works */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">How It Works</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>1. Add tasks and set time estimates</p>
                    <p>2. Start the timer and focus</p>
                    <p>3. Get notified when time's up</p>
                    <p>4. Complete 3 tasks to hatch your pet!</p>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Task List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <ListTodo className="h-4 w-4" />
                    {planningMode === 'top3' ? 'Top 3 Tasks' : "Today's Tasks"}
                  </h3>
                  {activeTask && (
                    <Badge variant="secondary" className="gap-1">
                      <Timer className="h-3 w-3" />
                      {formatTime(timerState.timeRemaining)}
                    </Badge>
                  )}
                </div>

                {planningMode === 'top3' ? (
                  // Top 3 Mode - editable task slots
                  <div className="space-y-3">
                    {localTop3.map((task, index) => {
                      const blitzTask = blitzTasks.find(t => t.id === task.id);
                      if (!blitzTask) return null;

                      if (!task.text.trim()) {
                        // Empty slot - show selector
                        return (
                          <Card key={task.id} className="border-dashed">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-muted-foreground w-6">
                                  {index + 1}.
                                </span>
                                <Popover 
                                  open={openPopoverIndex === index} 
                                  onOpenChange={(open) => setOpenPopoverIndex(open ? index : null)}
                                >
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" className="flex-1 justify-start text-muted-foreground">
                                      <Plus className="h-4 w-4 mr-2" />
                                      Add task...
                                      <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[300px] p-0" align="start">
                                    <Command>
                                      <CommandInput 
                                        placeholder="Search or type..." 
                                        value={task.text}
                                        onValueChange={(value) => handleTaskTextChange(index, value)}
                                      />
                                      <CommandList>
                                        <CommandEmpty>
                                          {task.text.trim() ? (
                                            <button 
                                              className="w-full p-2 text-left text-sm hover:bg-muted rounded"
                                              onClick={() => setOpenPopoverIndex(null)}
                                            >
                                              Use "{task.text}"
                                            </button>
                                          ) : (
                                            "Type to create or search..."
                                          )}
                                        </CommandEmpty>
                                        {incompleteTasks.length > 0 && (
                                          <CommandGroup heading="Today's Tasks">
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
                              </div>
                            </CardContent>
                          </Card>
                        );
                      }

                      return (
                        <BlitzTaskCard
                          key={task.id}
                          task={blitzTask}
                          isActive={timerState.activeTaskId === task.id}
                          timerRunning={timerState.isRunning}
                          timerPaused={timerState.isPaused}
                          timeRemaining={timerState.timeRemaining}
                          formatTime={formatTime}
                          onUpdateTime={handleUpdateTime}
                          onStartTimer={startTimer}
                          onPauseTimer={pauseTimer}
                          onResumeTimer={resumeTimer}
                          onStopTimer={stopTimer}
                          onComplete={handleTaskComplete}
                          onAddMinutes={addMinutes}
                        />
                      );
                    })}
                  </div>
                ) : (
                  // Full Day Mode - all today's tasks
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                    {todaysTasks.length === 0 ? (
                      <Card>
                        <CardContent className="p-6 text-center text-muted-foreground">
                          <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No tasks scheduled for today</p>
                          <Button variant="link" onClick={() => navigate('/tasks')}>
                            Go to Tasks →
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      blitzTasks.map((task) => (
                        <BlitzTaskCard
                          key={task.id}
                          task={task}
                          isActive={timerState.activeTaskId === task.id}
                          timerRunning={timerState.isRunning}
                          timerPaused={timerState.isPaused}
                          timeRemaining={timerState.timeRemaining}
                          formatTime={formatTime}
                          onUpdateTime={handleUpdateTime}
                          onStartTimer={startTimer}
                          onPauseTimer={pauseTimer}
                          onResumeTimer={resumeTimer}
                          onStopTimer={stopTimer}
                          onComplete={handleTaskComplete}
                          onAddMinutes={addMinutes}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="collection">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Egg className="h-5 w-5" />
                  Pet Collection
                </CardTitle>
                <CardDescription>
                  Your hatched pets from today and beyond
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PetCollectionWidget />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats">
            <StatsTab />
          </TabsContent>
        </Tabs>
      </div>

      {/* PiP Toolbar Portal */}
      {isPipActive && pipWindow && activeTask && (
        <PipToolbar
          pipWindow={pipWindow}
          taskText={activeTask.text}
          timeRemaining={timerState.timeRemaining}
          totalDuration={timerState.totalDuration}
          isRunning={timerState.isRunning}
          isPaused={timerState.isPaused}
          formatTime={formatTime}
          onPause={pauseTimer}
          onResume={resumeTimer}
          onStop={stopTimer}
          onAddMinutes={addMinutes}
          onComplete={() => handleTaskComplete(activeTask.id)}
        />
      )}
    </Layout>
  );
}
