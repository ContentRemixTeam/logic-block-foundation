import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckSquare,
  Lightbulb,
  StickyNote,
  Plus,
  ExternalLink,
  Loader2,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ManifestSwitcher } from '@/components/pwa/ManifestSwitcher';
import { IdeaQuickChips } from '@/components/quick-capture/IdeaQuickChips';
import { useProjects } from '@/hooks/useProjects';
import { useTaskMutations } from '@/hooks/useTasks';
import { routeForLine, type CaptureDestination } from '@/lib/captureTags';

type CaptureType = 'task' | 'idea' | 'note';

interface TypeOption {
  id: CaptureType;
  label: string;
  icon: React.ReactNode;
  placeholder: string;
  color: string;
}

const typeOptions: TypeOption[] = [
  {
    id: 'task',
    label: 'Task',
    icon: <CheckSquare className="h-4 w-4" />,
    placeholder: 'What needs to be done?',
    color: 'bg-primary text-primary-foreground',
  },
  {
    id: 'idea',
    label: 'Idea',
    icon: <Lightbulb className="h-4 w-4" />,
    placeholder: 'Capture your idea...',
    color: 'bg-accent text-accent-foreground',
  },
  {
    id: 'note',
    label: 'Note',
    icon: <StickyNote className="h-4 w-4" />,
    placeholder: 'Jot down a note...',
    color: 'bg-secondary text-secondary-foreground',
  },
];

interface IdeaData {
  categoryId: string | null;
  priority: string | null;
  tags: string[];
  projectId: string | null;
}

interface IdeaCategory {
  id: string;
  name: string;
  color: string;
}

export default function QuickAddApp() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: projects = [] } = useProjects();
  const { createTask } = useTaskMutations();
  const [selectedType, setSelectedType] = useState<CaptureType>('task');
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);

  const [ideaData, setIdeaData] = useState<IdeaData>({
    categoryId: null,
    priority: null,
    tags: [],
    projectId: null,
  });
  const [ideaCategories, setIdeaCategories] = useState<IdeaCategory[]>([]);

  const currentType = typeOptions.find((t) => t.id === selectedType)!;

  // Proactively validate session on PWA launch (iOS fix)
  useEffect(() => {
    const validateSession = async () => {
      if (authLoading || !user) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          await supabase.auth.refreshSession();
        }
      } catch (err) {
        console.error('Session validation error:', err);
      }
    };
    validateSession();
  }, [user, authLoading]);

  // Fetch idea categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase.functions.invoke('get-ideas', {});
        if (!error && data?.categories) {
          setIdeaCategories(data.categories);
        }
      } catch (err) {
        console.error('Failed to fetch idea categories:', err);
      }
    };
    fetchCategories();
  }, [user]);

  const saveOne = useCallback(
    async (text: string, dest: CaptureDestination) => {
      if (!user) throw new Error('Not logged in');
      const content = text.trim();
      if (!content) return;

      if (dest === 'task') {
        await createTask.mutateAsync({
          task_text: content,
          scheduled_date: new Date().toISOString().split('T')[0],
          status: 'scheduled',
          source: 'manual',
        });
      } else if (dest === 'idea' || dest === 'project') {
        const { error } = await supabase.from('ideas').insert({
          user_id: user.id,
          content,
          category_id: ideaData.categoryId,
          priority: ideaData.priority,
          project_id: ideaData.projectId,
          tags:
            dest === 'project'
              ? [...new Set([...(ideaData.tags || []), 'project'])]
              : ideaData.tags.length > 0
              ? ideaData.tags
              : null,
          source_note_title: 'Quick Add',
        });
        if (error) throw error;
      } else {
        // note
        const { error } = await supabase.from('journal_pages').insert({
          user_id: user.id,
          title: content.slice(0, 80) || 'Untitled note',
          content,
          page_type: 'note',
        } as any);
        if (error) throw error;
      }
    },
    [user, ideaData, createTask],
  );

  const handleSave = useCallback(async () => {
    if (!inputValue.trim()) return;
    if (!user) {
      toast({ title: 'Please log in to save', variant: 'destructive' });
      return;
    }

    setSaving(true);

    try {
      const lines = inputValue.split('\n').map((l) => l.trim()).filter(Boolean);
      let savedCount = 0;
      const failed: string[] = [];

      if (lines.length > 1) {
        for (const line of lines) {
          const routed = routeForLine(line, selectedType as CaptureDestination);
          try {
            await saveOne(routed.cleanedText, routed.destination);
            savedCount++;
          } catch (err: any) {
            failed.push(line);
          }
        }
      } else {
        const routed = routeForLine(inputValue.trim(), selectedType as CaptureDestination);
        await saveOne(routed.cleanedText, routed.destination);
        savedCount = 1;
      }

      setSessionCount((prev) => prev + savedCount);
      if (failed.length === 0) {
        setInputValue('');
        setIdeaData({ categoryId: null, priority: null, tags: [], projectId: null });
      } else {
        setInputValue(failed.join('\n'));
      }

      if (navigator.vibrate) navigator.vibrate(50);

      toast({
        title:
          savedCount === 1
            ? `${currentType.label} saved!`
            : `Saved ${savedCount} item${savedCount > 1 ? 's' : ''}`,
        description:
          failed.length > 0
            ? `${failed.length} item(s) kept for retry`
            : `Session total: ${sessionCount + savedCount}`,
      });
    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        title: 'Failed to save',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, [inputValue, selectedType, user, sessionCount, currentType, toast, saveOne]);

  // Auto-focus input on mount and type change
  useEffect(() => {
    const input = document.getElementById('quick-add-input');
    if (input) input.focus();
  }, [selectedType]);

  if (!authLoading && !user) {
    return (
      <>
        <ManifestSwitcher />
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-sm w-full">
            <CardContent className="pt-6 text-center space-y-4">
              <Zap className="h-12 w-12 mx-auto text-primary" />
              <h1 className="text-xl font-bold">Quick Add</h1>
              <p className="text-muted-foreground">
                Please log in to start capturing tasks, ideas, and notes.
              </p>
              <Button asChild className="w-full">
                <Link to="/auth">Log In</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (authLoading) {
    return (
      <>
        <ManifestSwitcher />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  return (
    <>
      <ManifestSwitcher />
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b bg-card px-4 py-3 safe-area-inset-top">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <h1 className="font-semibold">Quick Add</h1>
            </div>
            {sessionCount > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Plus className="h-3 w-3" />
                {sessionCount} saved
              </Badge>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 flex flex-col">
          {/* Type Selector */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {typeOptions.map((type) => (
              <button
                key={type.id}
                onClick={() => {
                  setSelectedType(type.id);
                  setIdeaData({ categoryId: null, priority: null, tags: [], projectId: null });
                }}
                className={cn(
                  'flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all',
                  selectedType === type.id
                    ? `${type.color} border-transparent shadow-md`
                    : 'bg-card border-border hover:border-primary/50',
                )}
              >
                {type.icon}
                <span className="text-xs font-medium">{type.label}</span>
              </button>
            ))}
          </div>

          <Card className="flex-1 flex flex-col">
            <CardContent className="pt-6 flex-1 flex flex-col gap-4">
              <div className="space-y-2">
                <Label htmlFor="quick-add-input" className="sr-only">
                  {currentType.placeholder}
                </Label>
                <Input
                  id="quick-add-input"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={currentType.placeholder}
                  className="h-14 text-lg"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSave();
                    }
                  }}
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground px-1">
                  Tip: use #task, #idea, #note, or #project to route lines automatically.
                </p>
              </div>

              {selectedType === 'idea' && inputValue.trim() && (
                <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div className="text-sm font-medium flex items-center gap-2 mb-2">
                    <Lightbulb className="h-4 w-4 text-accent-foreground" />
                    <span className="text-muted-foreground">Add details</span>
                  </div>
                  <IdeaQuickChips
                    ideaData={ideaData}
                    onUpdate={setIdeaData}
                    categories={ideaCategories}
                    projects={projects}
                  />
                </div>
              )}

              <div className="flex-1" />

              <Button
                onClick={handleSave}
                disabled={saving || !inputValue.trim()}
                size="lg"
                className={cn('h-14 text-lg w-full', currentType.color)}
              >
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-5 w-5 mr-2" />
                    Add {currentType.label}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <div className="mt-4 text-center">
            <button
              onClick={() => {
                toast({ title: 'Opening in your browser...' });
                setTimeout(() => {
                  window.location.href = '/dashboard';
                }, 300);
              }}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Open Full App
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        </main>
      </div>
    </>
  );
}
