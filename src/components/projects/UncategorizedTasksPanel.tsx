import { useState, useMemo } from 'react';
import { Task } from '@/components/tasks/types';
import { useTaskProjectMutations } from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UncategorizedTasksPanelProps {
  tasks: Task[];
  projectId: string;
  onClose: () => void;
}

export function UncategorizedTasksPanel({
  tasks,
  projectId,
  onClose,
}: UncategorizedTasksPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { addToProject } = useTaskProjectMutations();

  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return tasks;
    
    const query = searchQuery.toLowerCase();
    return tasks.filter(task => 
      task.task_text.toLowerCase().includes(query)
    );
  }, [tasks, searchQuery]);

  const handleAddToProject = (taskId: string) => {
    addToProject.mutate({ taskId, projectId });
  };

  return (
    <div className="w-80 border-l bg-muted/30 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-background">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Add Tasks</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Task list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {searchQuery ? 'No tasks match your search' : 'No uncategorized tasks'}
            </div>
          ) : (
            filteredTasks.map(task => (
              <div
                key={task.task_id}
                className="flex items-start gap-2 p-2 rounded-md hover:bg-muted group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{task.task_text}</p>
                  
                  <div className="flex gap-1 mt-1">
                    {task.scheduled_date && (
                      <Badge variant="secondary" className="text-xs">
                        {new Date(task.scheduled_date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </Badge>
                    )}
                    {task.status && (
                      <Badge variant="outline" className="text-xs">
                        {task.status}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleAddToProject(task.task_id)}
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t bg-background text-xs text-muted-foreground text-center">
        {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} available
      </div>
    </div>
  );
}
