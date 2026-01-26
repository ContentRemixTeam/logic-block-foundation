import { ListTodo, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface TextSelectionToolbarProps {
  x: number;
  y: number;
  onSaveAsTask: () => void;
  onSaveAsIdea: () => void;
  visible: boolean;
}

export function TextSelectionToolbar({
  x,
  y,
  onSaveAsTask,
  onSaveAsIdea,
  visible,
}: TextSelectionToolbarProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 5, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 5, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className={cn(
            "absolute z-50 flex items-center gap-1 p-1.5 rounded-lg",
            "bg-popover border border-border shadow-lg",
            "min-w-max"
          )}
          style={{
            left: `${x}px`,
            top: `${y}px`,
            transform: 'translate(-50%, -100%)',
          }}
          onMouseDown={(e) => e.preventDefault()} // Prevent losing selection
        >
          <Button
            size="sm"
            variant="ghost"
            onClick={onSaveAsTask}
            className="h-9 px-3 gap-2 hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-700 dark:hover:text-blue-300"
          >
            <ListTodo className="h-4 w-4" />
            <span className="hidden sm:inline">Task</span>
            <span className="sm:hidden">📋</span>
          </Button>
          <div className="w-px h-5 bg-border" />
          <Button
            size="sm"
            variant="ghost"
            onClick={onSaveAsIdea}
            className="h-9 px-3 gap-2 hover:bg-amber-100 dark:hover:bg-amber-900/40 hover:text-amber-700 dark:hover:text-amber-300"
          >
            <Lightbulb className="h-4 w-4" />
            <span className="hidden sm:inline">Idea</span>
            <span className="sm:hidden">💡</span>
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
