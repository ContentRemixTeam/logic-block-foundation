 import { useState, useMemo } from 'react';
 import { Layout } from '@/components/Layout';
 import { useTasks } from '@/hooks/useTasks';
 import { useProjects } from '@/hooks/useProjects';
 import { useQuery } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/hooks/useAuth';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { Checkbox } from '@/components/ui/checkbox';
 import { 
 CheckCircle2, 
 Circle, 
 Calendar,
 Folder,
 FileText,
 Clock,
 AlertCircle,
 ChevronDown,
 ChevronRight,
 Loader2
 } from 'lucide-react';
 import { format, isToday, isTomorrow, isPast, parseISO, startOfDay, differenceInDays } from 'date-fns';
 import { cn } from '@/lib/utils';
 import { Task } from '@/components/tasks/types';
 import { useTaskMutations } from '@/hooks/useTasks';
 import { useNavigate } from 'react-router-dom';
 
 interface ContentItem {
 id: string;
 title: string;
 type: string | null;
 channel: string | null;
 planned_creation_date: string | null;
 planned_publish_date: string | null;
 status: string;
 }
 
 interface UnifiedTask {
 id: string;
 title: string;
 dueDate: string | null;
 isCompleted: boolean;
 priority?: string | null;
 source: 'task' | 'project' | 'editorial-create' | 'editorial-publish';
 sourceLabel: string;
 sourceIcon: React.ReactNode;
 originalTask?: Task;
 originalContentId?: string;
 projectId?: string | null;
 }
 
 type GroupKey = 'overdue' | 'today' | 'tomorrow' | 'this_week' | 'next_week' | 'later' | 'unscheduled';
 
 const GROUPS: Array<{
 key: GroupKey;
 label: string;
 icon: React.ElementType;
 color: string;
 }> = [
 { key: 'overdue', label: 'Overdue', icon: AlertCircle, color: 'text-destructive' },
 { key: 'today', label: 'Today', icon: CheckCircle2, color: 'text-success' },
 { key: 'tomorrow', label: 'Tomorrow', icon: Calendar, color: 'text-blue-500' },
 { key: 'this_week', label: 'This Week', icon: Calendar, color: 'text-primary' },
 { key: 'next_week', label: 'Next Week', icon: Calendar, color: 'text-muted-foreground' },
 { key: 'later', label: 'Later', icon: Clock, color: 'text-muted-foreground' },
 { key: 'unscheduled', label: 'Unscheduled', icon: Circle, color: 'text-muted-foreground' },
 ];
 
 export default function AllTasks() {
 const { user } = useAuth();
 const navigate = useNavigate();
 const { data: tasks = [], isLoading: tasksLoading } = useTasks();
 const { data: projects = [] } = useProjects();
 const { toggleComplete } = useTaskMutations();
 
 const [collapsedGroups, setCollapsedGroups] = useState<Set<GroupKey>>(new Set());
 const [showCompleted, setShowCompleted] = useState(false);
 
 // Fetch all content items (not week-scoped)
 const { data: contentItems = [] } = useQuery({
   queryKey: ['all-content-items', user?.id],
   queryFn: async (): Promise<ContentItem[]> => {
     if (!user?.id) return [];
 
     const { data, error } = await supabase
       .from('content_items')
       .select('id, title, type, channel, planned_creation_date, planned_publish_date, status')
       .eq('user_id', user.id)
       .neq('status', 'Published');
 
     if (error) throw error;
     return data || [];
   },
   enabled: !!user?.id,
 });
 
 // Unified task list
 const unifiedTasks = useMemo(() => {
   const unified: UnifiedTask[] = [];
 
   // 1. Add regular tasks
   tasks.forEach(task => {
     if (task.is_recurring_parent) return;
     
     const project = task.project_id ? projects.find(p => p.id === task.project_id) : null;
     
     unified.push({
       id: `task-${task.task_id}`,
       title: task.task_text,
       dueDate: task.scheduled_date || task.planned_day,
       isCompleted: task.is_completed,
       priority: task.priority,
       source: project ? 'project' : 'task',
       sourceLabel: project ? project.name : 'Personal Task',
       sourceIcon: project ? <Folder className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />,
       originalTask: task,
       projectId: task.project_id,
     });
   });
 
   // 2. Add editorial calendar items (creation dates)
   contentItems.forEach(item => {
     if (item.planned_creation_date && item.status !== 'Published') {
       unified.push({
         id: `content-create-${item.id}`,
         title: `Create: ${item.title}`,
         dueDate: item.planned_creation_date,
         isCompleted: false,
         source: 'editorial-create',
         sourceLabel: item.channel || 'Editorial Calendar',
         sourceIcon: <FileText className="h-3 w-3" />,
         originalContentId: item.id,
       });
     }
   });
 
   // 3. Add editorial calendar items (publish dates)
   contentItems.forEach(item => {
     if (item.planned_publish_date && item.status !== 'Published') {
       unified.push({
         id: `content-publish-${item.id}`,
         title: `Publish: ${item.title}`,
         dueDate: item.planned_publish_date,
         isCompleted: item.status === 'Published',
         source: 'editorial-publish',
         sourceLabel: item.channel || 'Editorial Calendar',
         sourceIcon: <Calendar className="h-3 w-3" />,
         originalContentId: item.id,
       });
     }
   });
 
   return unified;
 }, [tasks, projects, contentItems]);
 
 // Group tasks by date
 const groupedTasks = useMemo(() => {
   const groups: Record<GroupKey, UnifiedTask[]> = {
     overdue: [],
     today: [],
     tomorrow: [],
     this_week: [],
     next_week: [],
     later: [],
     unscheduled: [],
   };
 
   const today = startOfDay(new Date());
 
   unifiedTasks.forEach(task => {
     // Filter out completed tasks if not showing them
     if (!showCompleted && task.isCompleted) return;
 
     if (!task.dueDate) {
       groups.unscheduled.push(task);
       return;
     }
 
     const dueDate = startOfDay(parseISO(task.dueDate));
     const daysUntil = differenceInDays(dueDate, today);
 
     if (isPast(dueDate) && !isToday(dueDate)) {
       groups.overdue.push(task);
     } else if (isToday(dueDate)) {
       groups.today.push(task);
     } else if (isTomorrow(dueDate)) {
       groups.tomorrow.push(task);
     } else if (daysUntil <= 7) {
       groups.this_week.push(task);
     } else if (daysUntil <= 14) {
       groups.next_week.push(task);
     } else {
       groups.later.push(task);
     }
   });
 
   return groups;
 }, [unifiedTasks, showCompleted]);
 
 const toggleGroup = (key: GroupKey) => {
   setCollapsedGroups(prev => {
     const newSet = new Set(prev);
     if (newSet.has(key)) {
       newSet.delete(key);
     } else {
       newSet.add(key);
     }
     return newSet;
   });
 };
 
 const handleToggleComplete = (task: UnifiedTask) => {
   if (task.originalTask) {
     toggleComplete.mutate(task.originalTask.task_id);
   }
 };
 
 const handleTaskClick = (task: UnifiedTask) => {
   if (task.originalTask && task.projectId) {
     navigate(`/projects/${task.projectId}`);
   } else if (task.originalContentId) {
     navigate('/editorial-calendar');
   } else if (task.originalTask) {
     navigate('/tasks');
   }
 };
 
 const totalTasks = Object.values(groupedTasks).reduce((sum, tasks) => sum + tasks.length, 0);
 const completedTasks = unifiedTasks.filter(t => t.isCompleted).length;
 
 if (tasksLoading) {
   return (
     <Layout>
       <div className="flex items-center justify-center min-h-[60vh]">
         <div className="flex flex-col items-center gap-3">
           <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
           <p className="text-muted-foreground">Loading tasks...</p>
         </div>
       </div>
     </Layout>
   );
 }
 
 return (
   <Layout>
     <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
       {/* Header */}
       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
         <div>
           <h1 className="text-2xl font-bold">All Tasks</h1>
           <p className="text-sm text-muted-foreground">
             {totalTasks} tasks across projects, calendar, and personal
           </p>
         </div>
 
         <div className="flex items-center gap-2">
           <Checkbox
             id="show-completed"
             checked={showCompleted}
             onCheckedChange={(checked) => setShowCompleted(checked === true)}
           />
           <label htmlFor="show-completed" className="text-sm text-muted-foreground cursor-pointer">
             Show completed ({completedTasks})
           </label>
         </div>
       </div>
 
       {/* Task Groups */}
       <div className="space-y-2">
         {GROUPS.map(group => {
           const groupTasks = groupedTasks[group.key];
           if (groupTasks.length === 0) return null;
 
           const isCollapsed = collapsedGroups.has(group.key);
           const Icon = group.icon;
 
           return (
             <div key={group.key} className="border rounded-lg overflow-hidden bg-card">
               {/* Group Header */}
               <button
                 onClick={() => toggleGroup(group.key)}
                 className="w-full px-4 py-3 bg-muted/30 hover:bg-muted/50 flex items-center justify-between transition-colors"
               >
                 <div className="flex items-center gap-2">
                   {isCollapsed ? (
                     <ChevronRight className="h-4 w-4 text-muted-foreground" />
                   ) : (
                     <ChevronDown className="h-4 w-4 text-muted-foreground" />
                   )}
                   <Icon className={cn('h-4 w-4', group.color)} />
                   <span className="font-medium">{group.label}</span>
                   <Badge variant="secondary" className="ml-2">{groupTasks.length}</Badge>
                 </div>
               </button>
 
               {/* Task List */}
               {!isCollapsed && (
                 <div className="divide-y divide-border">
                   {groupTasks.map(task => (
                     <div
                       key={task.id}
                       className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors cursor-pointer"
                       onClick={() => handleTaskClick(task)}
                     >
                       <Checkbox
                         checked={task.isCompleted}
                         disabled={!task.originalTask}
                         onCheckedChange={() => handleToggleComplete(task)}
                         onClick={(e) => e.stopPropagation()}
                         className="mt-1"
                       />
 
                       <div className="flex-1 min-w-0">
                         <p className={cn(
                           'text-sm font-medium truncate',
                           task.isCompleted && 'line-through text-muted-foreground'
                         )}>
                           {task.title}
                         </p>
                         
                         <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                           <div className="flex items-center gap-1">
                             {task.sourceIcon}
                             <span>{task.sourceLabel}</span>
                           </div>
                           
                           {task.dueDate && (
                             <span className="flex items-center gap-1">
                               <Calendar className="h-3 w-3" />
                               {format(parseISO(task.dueDate), 'MMM d')}
                             </span>
                           )}
 
                           {task.priority && (
                             <Badge 
                               variant="outline" 
                               className={cn(
                                 'text-[10px] px-1.5 py-0',
                                 task.priority === 'high' && 'border-priority-high text-priority-high',
                                 task.priority === 'medium' && 'border-priority-medium text-priority-medium',
                                 task.priority === 'low' && 'border-priority-low text-priority-low'
                               )}
                             >
                               {task.priority}
                             </Badge>
                           )}
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
             </div>
           );
         })}
       </div>
 
       {/* Empty State */}
       {totalTasks === 0 && (
         <div className="flex flex-col items-center justify-center py-16 text-center">
           <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
           <p className="text-lg font-medium text-muted-foreground">No tasks found</p>
         </div>
       )}
     </div>
   </Layout>
 );
 }