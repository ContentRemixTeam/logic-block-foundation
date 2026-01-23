import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Plus, Lightbulb, Search, Check, X, Loader2, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ContentTopic {
  id: string;
  topic_text: string | null;
  topic_notes: string | null;
  planned_date: string | null;
  status: 'not_planned' | 'planned' | 'in_progress' | 'created';
  created_at: string;
}

interface TopicPlanningSectionProps {
  projectId?: string;
  date?: Date;
  cadence?: 'monthly' | 'weekly' | 'daily' | 'external';
  className?: string;
}

const STATUS_COLORS: Record<string, string> = {
  not_planned: 'bg-muted text-muted-foreground',
  planned: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  in_progress: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  created: 'bg-green-500/10 text-green-600 border-green-500/20',
};

export function TopicPlanningSection({
  projectId,
  date,
  cadence = 'weekly',
  className,
}: TopicPlanningSectionProps) {
  const { user } = useAuth();
  const [topics, setTopics] = useState<ContentTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadTopics();
    }
  }, [user, projectId, date]);

  const loadTopics = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      let query = supabase
        .from('content_topics')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (date) {
        query = query.eq('planned_date', format(date, 'yyyy-MM-dd'));
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Type assertion since we know the structure
      setTopics((data || []) as ContentTopic[]);
    } catch (error) {
      console.error('Error loading topics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTopic = async () => {
    if (!user || !newTopic.trim()) return;

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('content_topics')
        .insert({
          user_id: user.id,
          topic_text: newTopic.trim(),
          topic_notes: newNotes.trim() || null,
          planned_date: date ? format(date, 'yyyy-MM-dd') : null,
          status: 'planned',
        })
        .select()
        .single();

      if (error) throw error;

      setTopics(prev => [data as ContentTopic, ...prev]);
      setNewTopic('');
      setNewNotes('');
      setIsAdding(false);
      toast.success('Topic added');
    } catch (error) {
      console.error('Error adding topic:', error);
      toast.error('Failed to add topic');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStatus = async (topicId: string, newStatus: ContentTopic['status']) => {
    try {
      const { error } = await supabase
        .from('content_topics')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', topicId);

      if (error) throw error;

      setTopics(prev => prev.map(t => 
        t.id === topicId ? { ...t, status: newStatus } : t
      ));
    } catch (error) {
      console.error('Error updating topic status:', error);
      toast.error('Failed to update topic');
    }
  };

  const handleEditTopic = async (topicId: string) => {
    if (!editingText.trim()) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('content_topics')
        .update({ topic_text: editingText.trim(), updated_at: new Date().toISOString() })
        .eq('id', topicId);

      if (error) throw error;

      setTopics(prev => prev.map(t => 
        t.id === topicId ? { ...t, topic_text: editingText.trim() } : t
      ));
      setEditingId(null);
      setEditingText('');
    } catch (error) {
      console.error('Error updating topic:', error);
      toast.error('Failed to update topic');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    try {
      const { error } = await supabase
        .from('content_topics')
        .delete()
        .eq('id', topicId);

      if (error) throw error;

      setTopics(prev => prev.filter(t => t.id !== topicId));
      toast.success('Topic removed');
    } catch (error) {
      console.error('Error deleting topic:', error);
      toast.error('Failed to remove topic');
    }
  };

  const getCadenceLabel = () => {
    switch (cadence) {
      case 'daily': return "Today's Topics";
      case 'weekly': return "This Week's Topics";
      case 'monthly': return "This Month's Topics";
      default: return "Content Topics";
    }
  };

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{getCadenceLabel()}</CardTitle>
          </div>
          {!isAdding && (
            <Button variant="ghost" size="sm" onClick={() => setIsAdding(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Topic
            </Button>
          )}
        </div>
        <CardDescription>
          What content are you planning to create?
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Add new topic form */}
        {isAdding && (
          <div className="p-3 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 space-y-3">
            <Input
              placeholder="What's the topic?"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              className="bg-background"
              autoFocus
            />
            <Textarea
              placeholder="Any notes? (optional)"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              rows={2}
              className="bg-background resize-none"
            />
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={handleAddTopic}
                disabled={!newTopic.trim() || isSaving}
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                Add
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setIsAdding(false);
                  setNewTopic('');
                  setNewNotes('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Topics list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : topics.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No topics planned yet</p>
            <p className="text-xs">Add topics to plan your content</p>
          </div>
        ) : (
          <div className="space-y-2">
            {topics.map(topic => (
              <div 
                key={topic.id}
                className="group flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                {/* Status indicator */}
                <button
                  onClick={() => {
                    const nextStatus: Record<string, ContentTopic['status']> = {
                      not_planned: 'planned',
                      planned: 'in_progress',
                      in_progress: 'created',
                      created: 'planned',
                    };
                    handleUpdateStatus(topic.id, nextStatus[topic.status]);
                  }}
                  className={cn(
                    'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                    topic.status === 'created' 
                      ? 'bg-green-500 border-green-500 text-white' 
                      : 'border-muted-foreground/30 hover:border-primary'
                  )}
                >
                  {topic.status === 'created' && <Check className="h-3 w-3" />}
                </button>

                {/* Topic content */}
                <div className="flex-1 min-w-0">
                  {editingId === topic.id ? (
                    <div className="flex gap-2">
                      <Input
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEditTopic(topic.id);
                          if (e.key === 'Escape') {
                            setEditingId(null);
                            setEditingText('');
                          }
                        }}
                      />
                      <Button size="sm" onClick={() => handleEditTopic(topic.id)} disabled={isSaving}>
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p className={cn(
                        'text-sm font-medium',
                        topic.status === 'created' && 'line-through text-muted-foreground'
                      )}>
                        {topic.topic_text}
                      </p>
                      {topic.topic_notes && (
                        <p className="text-xs text-muted-foreground mt-1">{topic.topic_notes}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className={cn('text-xs', STATUS_COLORS[topic.status])}>
                          {topic.status.replace('_', ' ')}
                        </Badge>
                        {topic.planned_date && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(topic.planned_date), 'MMM d')}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      setEditingId(topic.id);
                      setEditingText(topic.topic_text || '');
                    }}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => handleDeleteTopic(topic.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
