import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task } from '@/components/tasks/types';

interface ScorecardTaskRowProps {
  task: Task;
  pending?: boolean;
  onToggle: (task: Task) => void;
}

export function ScorecardTaskRow({ task, pending = false, onToggle }: ScorecardTaskRowProps) {
  return (
    <motion.button
      layout
      type="button"
      disabled={pending}
      onClick={() => onToggle(task)}
      whileTap={{ scale: 0.985 }}
      className={cn(
        'flex min-h-[68px] w-full items-center gap-4 border-2 border-[#111111] p-3 text-left transition-colors sm:p-4',
        task.is_completed ? 'bg-[#FFF0F5]' : 'bg-white hover:bg-[#FFF9FB]',
        pending && 'opacity-60',
      )}
    >
      <span
        className={cn(
          'grid h-10 w-10 shrink-0 place-items-center border-2 border-[#111111] transition-all',
          task.is_completed ? 'bg-[#C8145E] text-white' : 'bg-white text-transparent',
        )}
        aria-hidden="true"
      >
        <motion.span
          initial={false}
          animate={{ scale: task.is_completed ? 1 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 24 }}
        >
          <Check className="h-6 w-6 stroke-[3]" />
        </motion.span>
      </span>

      <span className="min-w-0 flex-1">
        <span className={cn('block font-bold leading-5', task.is_completed && 'line-through decoration-2')}>
          {task.task_text}
        </span>
        {task.category && (
          <span className="mt-1 block text-[11px] font-bold uppercase tracking-[0.12em] text-[#B8891E]">
            {task.category}
          </span>
        )}
      </span>
    </motion.button>
  );
}
