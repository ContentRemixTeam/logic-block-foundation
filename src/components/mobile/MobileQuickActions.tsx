import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { 
  Zap, 
  X, 
  HandCoins, 
  CheckSquare, 
  TrendingUp, 
  Target, 
  Brain 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Drawer component for quick action modals
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';

interface QuickAction {
  id: string;
  label: string;
  icon: typeof Zap;
  color: string;
  bgColor: string;
  action: 'offer' | 'tasks' | 'metrics' | 'focus' | 'ctfar';
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'offer', label: 'Made an offer', icon: HandCoins, color: 'text-green-600', bgColor: 'bg-green-500/20', action: 'offer' },
  { id: 'tasks', label: 'Top 3 done', icon: CheckSquare, color: 'text-blue-600', bgColor: 'bg-blue-500/20', action: 'tasks' },
  { id: 'metrics', label: 'Update metrics', icon: TrendingUp, color: 'text-orange-600', bgColor: 'bg-orange-500/20', action: 'metrics' },
  { id: 'focus', label: "Today's focus", icon: Target, color: 'text-purple-600', bgColor: 'bg-purple-500/20', action: 'focus' },
  { id: 'ctfar', label: 'Self-coach', icon: Brain, color: 'text-pink-600', bgColor: 'bg-pink-500/20', action: 'ctfar' },
];

export function MobileQuickActions() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<QuickAction | null>(null);

  // Mutation to log an offer
  const logOfferMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Update daily_plans made_offer flag
      const { error } = await supabase
        .from('daily_plans')
        .upsert({
          user_id: user.id,
          date: today,
          made_offer: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,date' });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-plan'] });
      toast.success('Offer logged! 🎉');
      setIsOpen(false);
    },
    onError: () => {
      toast.error('Failed to log offer');
    },
  });

  const handleAction = useCallback((action: QuickAction) => {
    switch (action.action) {
      case 'offer':
        logOfferMutation.mutate();
        break;
      case 'tasks':
        navigate('/daily-plan');
        setIsOpen(false);
        break;
      case 'metrics':
        navigate('/metrics');
        setIsOpen(false);
        break;
      case 'focus':
        navigate('/daily-plan');
        setIsOpen(false);
        break;
      case 'ctfar':
        setActiveAction(action);
        setDrawerOpen(true);
        setIsOpen(false);
        break;
    }
  }, [navigate, logOfferMutation]);

  // Only show on mobile
  if (!isMobile) return null;

  return (
    <>
      {/* FAB Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="lg"
        className={cn(
          "fixed rounded-full shadow-lg hover:shadow-xl transition-all z-40",
          "left-4 bottom-[calc(env(safe-area-inset-bottom)+5rem)] h-12 w-12",
          isOpen && "bg-muted text-muted-foreground hover:bg-muted"
        )}
        aria-label="Quick actions"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="h-5 w-5" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Zap className="h-5 w-5" />
            </motion.div>
          )}
        </AnimatePresence>
      </Button>

      {/* Quick Action Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed left-4 bottom-[calc(env(safe-area-inset-bottom)+8rem)] z-40 flex flex-col gap-2"
          >
            {QUICK_ACTIONS.map((action, index) => (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.05 }}
              >
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAction(action)}
                  disabled={action.action === 'offer' && logOfferMutation.isPending}
                  className={cn(
                    "h-11 gap-3 shadow-md hover:shadow-lg transition-all",
                    "bg-card border border-border/50"
                  )}
                >
                  <div className={cn("h-7 w-7 rounded-md flex items-center justify-center", action.bgColor)}>
                    <action.icon className={cn("h-4 w-4", action.color)} />
                  </div>
                  <span className="font-medium">{action.label}</span>
                </Button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-30"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* CTFAR Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-pink-600" />
              Quick Self-Coach
            </DrawerTitle>
          </DrawerHeader>
          <div className="p-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Use the CTFAR model to coach yourself through a challenging situation.
            </p>
            <Button 
              className="w-full" 
              onClick={() => {
                navigate('/coach-yourself');
                setDrawerOpen(false);
              }}
            >
              Open Full Coach Tool
            </Button>
            <DrawerClose asChild>
              <Button variant="outline" className="w-full">
                Cancel
              </Button>
            </DrawerClose>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
