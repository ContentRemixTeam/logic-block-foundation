import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/ui/page-header';
import { CutePomodoro } from '@/components/focus/CutePomodoro';
import { FocusPetDisplay } from '@/components/focus/FocusPetDisplay';
import { FocusTaskList } from '@/components/focus/FocusTaskList';
import { useFocusTasks, FocusTask } from '@/hooks/useFocusTasks';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Focus() {
  const { focusTasks, isLoading, completedCount, completeTask, refetch } = useFocusTasks();
  const [activeTask, setActiveTask] = useState<FocusTask | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleStartTimer = (task: FocusTask) => {
    setActiveTask(task);
  };

  const handleTimerComplete = async () => {
    // Timer finished, but don't auto-complete task
    // User should manually check it off
  };

  const handleTaskComplete = async (position: 1 | 2 | 3) => {
    await completeTask(position);
    await refetch();
    
    // Clear active task if it was the one completed
    if (activeTask?.position === position) {
      setActiveTask(null);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container max-w-4xl mx-auto px-4 py-8 space-y-8">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </Layout>
    );
  }

  // Fullscreen mode
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-8">
        <Button 
          variant="ghost" 
          size="icon"
          className="absolute top-4 right-4"
          onClick={() => setIsFullscreen(false)}
        >
          <Minimize2 className="h-5 w-5" />
        </Button>
        
        <div className="text-center space-y-8">
          <FocusPetDisplay completedCount={completedCount} />
          <CutePomodoro 
            activeTaskText={activeTask?.text}
            onComplete={handleTimerComplete}
          />
          {activeTask && (
            <div className="max-w-sm">
              <p className="text-sm text-muted-foreground mb-1">Focusing on:</p>
              <p className="text-lg font-medium">{activeTask.text}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <PageHeader 
            title="Focus Mode" 
            description="Hatch your pet. Get things done."
          />
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsFullscreen(true)}
            className="hidden md:flex"
          >
            <Maximize2 className="h-4 w-4 mr-2" />
            Fullscreen
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left Column: Pet + Timer */}
          <div className="space-y-6">
            <FocusPetDisplay completedCount={completedCount} />
            <CutePomodoro 
              activeTaskText={activeTask?.text}
              onComplete={handleTimerComplete}
            />
          </div>

          {/* Right Column: Tasks */}
          <div>
            <FocusTaskList
              tasks={focusTasks}
              onComplete={handleTaskComplete}
              onStartTimer={handleStartTimer}
              activeTaskId={activeTask?.id}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
