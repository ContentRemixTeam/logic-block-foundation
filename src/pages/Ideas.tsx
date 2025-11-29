import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Lightbulb } from 'lucide-react';

export default function Ideas() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [ideas, setIdeas] = useState<any[]>([]);
  const [newIdea, setNewIdea] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadIdeas();
  }, [user]);

  const loadIdeas = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('ideas_db')
        .select('*')
        .eq('user_id', user.id)
        .order('date_added', { ascending: false });

      if (error) throw error;
      setIdeas(data || []);
    } catch (error) {
      console.error('Error loading ideas:', error);
    }
  };

  const addIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newIdea.trim()) return;
    setLoading(true);

    try {
      const { error } = await supabase.from('ideas_db').insert({
        user_id: user.id,
        idea: newIdea,
        category: newCategory || null,
        notes: newNotes || null,
      });

      if (error) throw error;

      toast({
        title: 'Idea saved!',
      });

      setNewIdea('');
      setNewCategory('');
      setNewNotes('');
      loadIdeas();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const categories = Array.from(
    new Set(ideas.map((i) => i.category).filter(Boolean))
  );

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Ideas</h1>
          <p className="text-muted-foreground">
            Capture your thoughts and insights
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Capture New Idea</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={addIdea} className="space-y-4">
              <div>
                <Label htmlFor="idea">Idea</Label>
                <Input
                  id="idea"
                  value={newIdea}
                  onChange={(e) => setNewIdea(e.target.value)}
                  placeholder="What's your idea?"
                  required
                />
              </div>
              <div>
                <Label htmlFor="category">Category (optional)</Label>
                <Input
                  id="category"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="e.g., Product, Content, Business"
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Additional thoughts..."
                  rows={3}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Saving...' : 'Save Idea'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {ideas.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Lightbulb className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No ideas yet. Capture your first one!</p>
              </CardContent>
            </Card>
          ) : (
            ideas.map((idea) => (
              <Card key={idea.idea_id}>
                <CardHeader>
                  <CardTitle className="text-base">{idea.idea}</CardTitle>
                  {idea.category && (
                    <div className="text-xs text-muted-foreground">
                      {idea.category}
                    </div>
                  )}
                </CardHeader>
                {idea.notes && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{idea.notes}</p>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
