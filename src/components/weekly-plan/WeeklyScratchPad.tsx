import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SmartScratchPad } from '@/components/SmartScratchPad';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, NotebookPen } from 'lucide-react';

interface WeeklyScratchPadProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  weekId: string;
  userId: string;
}

export function WeeklyScratchPad({ 
  value, 
  onChange, 
  onBlur,
  weekId,
  userId,
}: WeeklyScratchPadProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processingTags, setProcessingTags] = useState(false);

  const handleProcessTags = async () => {
    if (!value.trim() || !weekId || !userId) return;

    setProcessingTags(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-scratch-pad-tags', {
        body: {
          scratch_pad_content: value,
          context: 'weekly',
          week_id: weekId,
        },
      });

      if (error) throw error;

      if (data?.success) {
        const processed = data.processed || {};
        const items = [];
        if (processed.tasks > 0) items.push(`${processed.tasks} task${processed.tasks > 1 ? 's' : ''}`);
        if (processed.ideas > 0) items.push(`${processed.ideas} idea${processed.ideas > 1 ? 's' : ''}`);
        if (processed.wins > 0) items.push(`${processed.wins} win${processed.wins > 1 ? 's' : ''}`);
        if (processed.thoughts > 0) items.push(`${processed.thoughts} thought${processed.thoughts > 1 ? 's' : ''}`);

        toast({
          title: '✨ Tags processed!',
          description: items.length > 0 
            ? `Created ${items.join(', ')}.` 
            : 'No tagged items found to process.',
        });

        // Invalidate caches so items appear immediately
        queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
        queryClient.invalidateQueries({ queryKey: ['ideas'] });
        queryClient.invalidateQueries({ queryKey: ['useful-thoughts'] });
      } else if (data?.error) {
        toast({
          title: 'Processing issue',
          description: data.error,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error processing tags:', error);
      toast({
        title: 'Error processing tags',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessingTags(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <NotebookPen className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Weekly Brain Dump</CardTitle>
        </div>
        <CardDescription>
          Capture everything on your mind. Use #task, #idea, #thought, or #win to tag items.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <SmartScratchPad
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          maxLength={10000}
          placeholder={`Dump your weekly thoughts here...

Example:
Launch new feature this week #task
Try batching content on Tuesdays #idea
Feeling more focused this quarter #thought
Closed 3 deals last week! #win`}
        />
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={handleProcessTags}
            disabled={processingTags || !value.trim()}
            variant="outline"
            size="sm"
          >
            {processingTags ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Process Tags
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
