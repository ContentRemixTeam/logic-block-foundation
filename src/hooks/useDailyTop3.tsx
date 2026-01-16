import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useArcade } from '@/hooks/useArcade';
import { toast } from 'sonner';

interface Top3Task {
  id: string;
  position: number;
  task_id: string | null;
  completed_at: string | null;
  task?: {
    task_id: string;
    task_text: string;
    is_completed: boolean;
  };
}

export function useDailyTop3() {
  const { user } = useAuth();
  const { refreshPet, refreshWallet } = useArcade();
  const [top3Tasks, setTop3Tasks] = useState<Top3Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  const fetchTop3 = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('daily_top3_tasks')
        .select(`
          id,
          position,
          task_id,
          completed_at,
          tasks:task_id (
            task_id,
            task_text,
            is_completed
          )
        `)
        .eq('user_id', user.id)
        .eq('date', today)
        .order('position');

      if (error) throw error;

      const formatted: Top3Task[] = (data || []).map((item: any) => ({
        id: item.id,
        position: item.position,
        task_id: item.task_id,
        completed_at: item.completed_at,
        task: item.tasks ? {
          task_id: item.tasks.task_id,
          task_text: item.tasks.task_text,
          is_completed: item.tasks.is_completed,
        } : undefined,
      }));

      setTop3Tasks(formatted);
    } catch (err) {
      console.error('Failed to fetch top 3 tasks:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, today]);

  useEffect(() => {
    if (user) {
      fetchTop3();
    }
  }, [user, fetchTop3]);

  const selectTask = useCallback(async (taskId: string, position: 1 | 2 | 3) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('daily_top3_tasks')
        .upsert({
          user_id: user.id,
          date: today,
          position,
          task_id: taskId,
          completed_at: null,
        }, {
          onConflict: 'user_id,date,position',
        });

      if (error) throw error;

      await fetchTop3();
      toast.success('Task added to your top 3!');
    } catch (err) {
      console.error('Failed to select task:', err);
      toast.error('Failed to add task');
    }
  }, [user, today, fetchTop3]);

  const removeTask = useCallback(async (position: 1 | 2 | 3) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('daily_top3_tasks')
        .delete()
        .eq('user_id', user.id)
        .eq('date', today)
        .eq('position', position);

      if (error) throw error;

      await fetchTop3();
      toast.success('Task removed');
    } catch (err) {
      console.error('Failed to remove task:', err);
      toast.error('Failed to remove task');
    }
  }, [user, today, fetchTop3]);

  const completeTask = useCallback(async (position: 1 | 2 | 3) => {
    if (!user) return;

    try {
      // Mark as completed
      const { error } = await supabase
        .from('daily_top3_tasks')
        .update({ completed_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('date', today)
        .eq('position', position);

      if (error) throw error;

      // Award coins for completing a top 3 task
      const dedupeKey = `top3_completed:${user.id}:${today}:${position}`;
      
      await supabase.from('arcade_events').insert({
        user_id: user.id,
        event_type: 'top3_task_completed',
        coins_delta: 5,
        metadata: { position, date: today },
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

      // Progress pet
      const { data: petData } = await supabase
        .from('arcade_daily_pet')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (petData) {
        const newTasksCompleted = (petData.tasks_completed_today || 0) + 1;
        const newStage = newTasksCompleted >= 3 ? 'hatched' : 
                         newTasksCompleted >= 1 ? 'growing' : 'egg';
        
        await supabase
          .from('arcade_daily_pet')
          .update({
            tasks_completed_today: newTasksCompleted,
            stage: newStage,
            hatched_at: newStage === 'hatched' && !petData.hatched_at 
              ? new Date().toISOString() 
              : petData.hatched_at,
            updated_at: new Date().toISOString(),
          })
          .eq('id', petData.id);
      }

      await Promise.all([fetchTop3(), refreshWallet(), refreshPet()]);
      
      // Check if all 3 are now complete
      const { data: allTasks } = await supabase
        .from('daily_top3_tasks')
        .select('completed_at')
        .eq('user_id', user.id)
        .eq('date', today);

      const completedCount = (allTasks || []).filter(t => t.completed_at).length;
      
      if (completedCount === 3) {
        toast.success('🎉 All 3 tasks complete! Your pet hatched!', {
          duration: 5000,
        });
      } else {
        toast.success(`+5 coins! (${completedCount}/3 complete)`);
      }
    } catch (err) {
      console.error('Failed to complete task:', err);
      toast.error('Failed to complete task');
    }
  }, [user, today, fetchTop3, refreshWallet, refreshPet]);

  const completedCount = top3Tasks.filter(t => t.completed_at).length;
  const allComplete = top3Tasks.length === 3 && completedCount === 3;

  return {
    top3Tasks,
    isLoading,
    selectTask,
    removeTask,
    completeTask,
    refetch: fetchTop3,
    completedCount,
    allComplete,
  };
}
