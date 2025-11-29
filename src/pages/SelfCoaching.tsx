import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Brain } from 'lucide-react';

export default function SelfCoaching() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [circumstance, setCircumstance] = useState('');
  const [thought, setThought] = useState('');
  const [feeling, setFeeling] = useState('');
  const [action, setAction] = useState('');
  const [result, setResult] = useState('');
  const [tags, setTags] = useState('');

  useEffect(() => {
    loadModels();
  }, [user]);

  const loadModels = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('ctfar')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setModels(data || []);
    } catch (error) {
      console.error('Error loading models:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const today = new Date().toISOString().split('T')[0];
      const tagArray = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const { error } = await supabase.from('ctfar').insert({
        user_id: user.id,
        date: today,
        circumstance,
        thought,
        feeling,
        action,
        result,
        tags: tagArray,
      });

      if (error) throw error;

      toast({
        title: 'Model saved!',
        description: 'Your CTFAR reflection has been recorded.',
      });

      // Reset form
      setCircumstance('');
      setThought('');
      setFeeling('');
      setAction('');
      setResult('');
      setTags('');
      
      loadModels();
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

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Self-Coaching</h1>
          <p className="text-muted-foreground">
            Use the CTFAR model to understand your patterns
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create CTFAR Model</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="circumstance">Circumstance</Label>
                <Textarea
                  id="circumstance"
                  value={circumstance}
                  onChange={(e) => setCircumstance(e.target.value)}
                  placeholder="What happened? (Facts only)"
                  rows={2}
                  required
                />
              </div>
              <div>
                <Label htmlFor="thought">Thought</Label>
                <Textarea
                  id="thought"
                  value={thought}
                  onChange={(e) => setThought(e.target.value)}
                  placeholder="What did you think about it?"
                  rows={2}
                  required
                />
              </div>
              <div>
                <Label htmlFor="feeling">Feeling</Label>
                <Input
                  id="feeling"
                  value={feeling}
                  onChange={(e) => setFeeling(e.target.value)}
                  placeholder="How did you feel? (One word)"
                  required
                />
              </div>
              <div>
                <Label htmlFor="action">Action</Label>
                <Textarea
                  id="action"
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  placeholder="What did you do (or not do)?"
                  rows={2}
                  required
                />
              </div>
              <div>
                <Label htmlFor="result">Result</Label>
                <Textarea
                  id="result"
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  placeholder="What was the outcome?"
                  rows={2}
                  required
                />
              </div>
              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g., work, relationships, health"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Saving...' : 'Save Model'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Your Models</h2>
          {models.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Brain className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No models yet. Create your first one!
                </p>
              </CardContent>
            </Card>
          ) : (
            models.map((model) => (
              <Card key={model.model_id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {new Date(model.date).toLocaleDateString()}
                    </CardTitle>
                    {model.tags && model.tags.length > 0 && (
                      <div className="flex gap-2">
                        {model.tags.map((tag: string, idx: number) => (
                          <span
                            key={idx}
                            className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      Circumstance
                    </div>
                    <div className="text-sm">{model.circumstance}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      Thought
                    </div>
                    <div className="text-sm">{model.thought}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      Feeling
                    </div>
                    <div className="text-sm">{model.feeling}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      Action
                    </div>
                    <div className="text-sm">{model.action}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      Result
                    </div>
                    <div className="text-sm">{model.result}</div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
