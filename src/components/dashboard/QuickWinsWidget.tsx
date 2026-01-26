import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Trophy, Plus } from 'lucide-react';

interface QuickWinsWidgetProps {
  cycleId?: string;
  cycleStartDate?: string;
}

interface WidgetSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  elevated?: boolean;
}

function WidgetSection({ title, icon, children, elevated }: WidgetSectionProps) {
  return (
    <div className={`p-4 md:p-6 ${elevated ? 'bg-muted/30' : 'bg-card'}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-primary">{icon}</span>
        <h3 className="font-semibold text-base md:text-lg">{title}</h3>
      </div>
      {children}
    </div>
  );
}

interface Win {
  id: string;
  week_number: number;
  win_text: string;
  created_at: string;
}

export function QuickWinsWidget({ cycleId, cycleStartDate }: QuickWinsWidgetProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewAllOpen, setViewAllOpen] = useState(false);
  const [winText, setWinText] = useState('');

  // Calculate current week number
  const getCurrentWeekNumber = () => {
    if (!cycleStartDate) return 1;
    const start = parseISO(cycleStartDate);
    const today = new Date();
    const dayOfCycle = Math.max(1, differenceInDays(today, start) + 1);
    return Math.ceil(dayOfCycle / 7);
  };

  // Fetch wins for current cycle
  const { data: wins, isLoading } = useQuery({
    queryKey: ['wins', cycleId],
    queryFn: async () => {
      if (!cycleId) return [];
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];

      const { data } = await supabase
        .from('wins')
        .select('id, week_number, win_text, created_at')
        .eq('user_id', session.user.id)
        .eq('cycle_id', cycleId)
        .order('created_at', { ascending: false });

      return (data || []) as Win[];
    },
    enabled: !!cycleId,
    staleTime: 30 * 1000,
  });

  // Add win mutation
  const addWin = useMutation({
    mutationFn: async () => {
      if (!winText.trim()) throw new Error('Win text required');
      if (!cycleId) throw new Error('No active cycle');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const weekNumber = getCurrentWeekNumber();

      const { error } = await supabase
        .from('wins')
        .insert({
          user_id: session.user.id,
          cycle_id: cycleId,
          week_number: weekNumber,
          win_text: winText.trim(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wins'] });
      toast.success('🎉 Win celebrated!');
      setDialogOpen(false);
      setWinText('');
    },
    onError: () => {
      toast.error('Failed to add win');
    },
  });

  const recentWins = wins?.slice(0, 3) ?? [];
  const allWins = wins ?? [];

  // No cycle state
  if (!cycleId) {
    return null; // Don't show widget if no cycle
  }

  return (
    <WidgetSection title="Recent Wins" icon={<Trophy className="h-5 w-5" />} elevated>
      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {!isLoading && recentWins.length === 0 && (
        <div className="text-center py-4">
          <div className="h-12 w-12 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
            <Trophy className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm mb-1">No wins recorded yet</p>
          <p className="text-muted-foreground text-xs mb-3">Track your achievements to stay motivated!</p>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Win
              </Button>
            </DialogTrigger>
            <AddWinDialogContent
              winText={winText}
              setWinText={setWinText}
              onSave={() => addWin.mutate()}
              isPending={addWin.isPending}
              weekNumber={getCurrentWeekNumber()}
            />
          </Dialog>
        </div>
      )}

      {!isLoading && recentWins.length > 0 && (
        <div className="space-y-4">
          {/* Recent Wins List */}
          <div className="space-y-2">
            {recentWins.map((win) => (
              <div 
                key={win.id}
                className="p-3 rounded-md bg-background border border-border"
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg">🏆</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-1">
                      Week {win.week_number}
                    </p>
                    <p className="text-sm break-words">
                      {win.win_text}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Win
                </Button>
              </DialogTrigger>
              <AddWinDialogContent
                winText={winText}
                setWinText={setWinText}
                onSave={() => addWin.mutate()}
                isPending={addWin.isPending}
                weekNumber={getCurrentWeekNumber()}
              />
            </Dialog>
            
            {allWins.length > 3 && (
              <Dialog open={viewAllOpen} onOpenChange={setViewAllOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    View All ({allWins.length})
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>All Wins This Quarter</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2 py-4">
                    {allWins.map((win) => (
                      <div 
                        key={win.id}
                        className="p-3 rounded-md bg-muted/50 border border-border"
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-lg">🏆</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground mb-1">
                              Week {win.week_number} • {format(parseISO(win.created_at), 'MMM d')}
                            </p>
                            <p className="text-sm break-words">
                              {win.win_text}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      )}
    </WidgetSection>
  );
}

function AddWinDialogContent({
  winText,
  setWinText,
  onSave,
  isPending,
  weekNumber,
}: {
  winText: string;
  setWinText: (v: string) => void;
  onSave: () => void;
  isPending: boolean;
  weekNumber: number;
}) {
  const charCount = winText.length;
  const maxChars = 200;

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>🎉 Celebrate a Win</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <p className="text-sm text-muted-foreground">
          Week {weekNumber} of your 90-day cycle
        </p>
        <div className="space-y-2">
          <Label>What win are you celebrating?</Label>
          <Textarea
            value={winText}
            onChange={(e) => setWinText(e.target.value.slice(0, maxChars))}
            placeholder="e.g., Closed my first sale of the quarter!"
            rows={3}
          />
          <p className="text-xs text-muted-foreground text-right">
            {charCount}/{maxChars}
          </p>
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button 
          onClick={onSave}
          disabled={isPending || !winText.trim()}
        >
          {isPending ? 'Saving...' : 'Add Win'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
