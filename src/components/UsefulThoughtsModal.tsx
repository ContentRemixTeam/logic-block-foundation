import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Star, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Thought {
  id: string;
  text: string;
  category_id: string | null;
  is_favorite: boolean;
  created_at: string;
  mindset_categories: Category | null;
}

interface UsefulThoughtsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (thought: string) => void;
}

export function UsefulThoughtsModal({ open, onOpenChange, onSelect }: UsefulThoughtsModalProps) {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (open) {
      loadThoughts();
    }
  }, [open]);

  const loadThoughts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('get-thoughts');

      if (error) throw error;

      setThoughts(data.thoughts || []);
    } catch (error) {
      console.error('Error loading thoughts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load thoughts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (thought: Thought) => {
    onSelect(thought.text);
    onOpenChange(false);
    toast({
      title: 'Success',
      description: 'Thought added to your plan ⚡',
    });
  };

  const filteredThoughts = thoughts.filter(t =>
    t.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const favoriteThoughts = filteredThoughts.filter(t => t.is_favorite);
  const otherThoughts = filteredThoughts.filter(t => !t.is_favorite);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Useful Thoughts Library</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search thoughts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-[400px]">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredThoughts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No thoughts found. Add some in the Useful Thoughts page!
              </div>
            ) : (
              <div className="space-y-4">
                {favoriteThoughts.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                      Favorites
                    </h3>
                    <div className="space-y-2">
                      {favoriteThoughts.map((thought) => (
                        <Button
                          key={thought.id}
                          variant="outline"
                          className="w-full justify-start text-left h-auto py-3"
                          onClick={() => handleSelect(thought)}
                          style={{
                            borderLeftWidth: '3px',
                            borderLeftColor: thought.mindset_categories?.color || 'transparent',
                          }}
                        >
                          <div className="flex-1">
                            <p className="text-sm">{thought.text}</p>
                            {thought.mindset_categories && (
                              <span className="text-xs text-muted-foreground">
                                {thought.mindset_categories.name}
                              </span>
                            )}
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {otherThoughts.length > 0 && (
                  <div>
                    {favoriteThoughts.length > 0 && (
                      <h3 className="text-sm font-semibold mb-2">All Thoughts</h3>
                    )}
                    <div className="space-y-2">
                      {otherThoughts.map((thought) => (
                        <Button
                          key={thought.id}
                          variant="outline"
                          className="w-full justify-start text-left h-auto py-3"
                          onClick={() => handleSelect(thought)}
                          style={{
                            borderLeftWidth: '3px',
                            borderLeftColor: thought.mindset_categories?.color || 'transparent',
                          }}
                        >
                          <div className="flex-1">
                            <p className="text-sm">{thought.text}</p>
                            {thought.mindset_categories && (
                              <span className="text-xs text-muted-foreground">
                                {thought.mindset_categories.name}
                              </span>
                            )}
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}