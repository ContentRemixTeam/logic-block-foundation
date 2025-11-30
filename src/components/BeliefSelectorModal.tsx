import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Zap, TrendingUp } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Belief {
  belief_id: string;
  upgraded_belief: string;
  confidence_score: number;
}

interface BeliefSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (belief: string) => void;
}

export default function BeliefSelectorModal({ open, onOpenChange, onSelect }: BeliefSelectorModalProps) {
  const [search, setSearch] = useState('');

  const { data: beliefs = [], isLoading } = useQuery({
    queryKey: ['beliefs'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('get-beliefs', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) throw error;
      return data as Belief[];
    },
    enabled: open
  });

  const filteredBeliefs = beliefs.filter(b =>
    b.upgraded_belief.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (belief: Belief) => {
    onSelect(belief.upgraded_belief);
    onOpenChange(false);
    setSearch('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Insert Upgraded Belief
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="Search beliefs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <ScrollArea className="h-[400px]">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading beliefs...</div>
            ) : filteredBeliefs.length === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">
                  {search ? 'No beliefs match your search' : 'No beliefs yet. Create one in the Belief Builder!'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredBeliefs.map((belief) => (
                  <Button
                    key={belief.belief_id}
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-3 px-4"
                    onClick={() => handleSelect(belief)}
                  >
                    <div className="flex-1">
                      <div className="flex items-start gap-2">
                        <Zap className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm">{belief.upgraded_belief}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="w-20 bg-muted rounded-full h-1.5">
                              <div 
                                className="bg-primary h-1.5 rounded-full"
                                style={{ width: `${(belief.confidence_score / 10) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {belief.confidence_score}/10
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
