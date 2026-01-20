import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Lightbulb, Heart } from 'lucide-react';

interface Reflection {
  id: string;
  task_text: string | null;
  went_well: string | null;
  could_improve: string | null;
  created_at: string;
}

export function TodaysReflections() {
  const { user } = useAuth();
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const loadReflections = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('task_reflections')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setReflections(data);
      }
      setIsLoading(false);
    };

    loadReflections();

    // Subscribe to changes
    const channel = supabase
      .channel('reflections_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'task_reflections',
      }, () => {
        loadReflections();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, today]);

  if (isLoading) return null;
  if (reflections.length === 0) return null;

  // Filter to only show reflections with actual content
  const meaningfulReflections = reflections.filter(
    r => r.went_well?.trim() || r.could_improve?.trim()
  );

  if (meaningfulReflections.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-warning" />
          Today's Takeaways
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {meaningfulReflections.map((reflection) => (
          <div key={reflection.id} className="space-y-2 text-sm">
            {reflection.task_text && (
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle className="h-3.5 w-3.5 text-success" />
                {reflection.task_text}
              </div>
            )}
            {reflection.went_well && (
              <div className="flex items-start gap-2 text-muted-foreground pl-5">
                <Heart className="h-3.5 w-3.5 text-success mt-0.5 flex-shrink-0" />
                <span>{reflection.went_well}</span>
              </div>
            )}
            {reflection.could_improve && (
              <div className="flex items-start gap-2 text-muted-foreground pl-5">
                <Lightbulb className="h-3.5 w-3.5 text-warning mt-0.5 flex-shrink-0" />
                <span>{reflection.could_improve}</span>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
