import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, differenceInDays, addDays } from 'date-fns';
import { Trash2, RotateCcw, Loader2, AlertTriangle, CheckSquare, ListTodo, Lightbulb, ClipboardList, Flame } from 'lucide-react';

type DeletedItemType = 'tasks' | 'ideas' | 'sops' | 'habits';

interface DeletedItem {
  id: string;
  name: string;
  type: DeletedItemType;
  deleted_at: string;
  days_until_permanent: number;
}

const TYPE_CONFIG: Record<DeletedItemType, { icon: typeof Trash2; label: string; idField: string; nameField: string }> = {
  tasks: { icon: ListTodo, label: 'Tasks', idField: 'task_id', nameField: 'task_text' },
  ideas: { icon: Lightbulb, label: 'Ideas', idField: 'id', nameField: 'content' },
  sops: { icon: ClipboardList, label: 'SOPs', idField: 'sop_id', nameField: 'sop_name' },
  habits: { icon: Flame, label: 'Habits', idField: 'habit_id', nameField: 'habit_name' },
};

export default function Trash() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<DeletedItemType>('tasks');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  // Fetch deleted items for current tab
  const { data: deletedItems = [], isLoading } = useQuery({
    queryKey: ['deleted-items', activeTab, user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const config = TYPE_CONFIG[activeTab];
      let data: any[] = [];
      let error: any = null;

      // Query each table type separately to avoid type issues
      if (activeTab === 'tasks') {
        const res = await supabase
          .from('tasks')
          .select('task_id, task_text, deleted_at')
          .eq('user_id', user.id)
          .not('deleted_at', 'is', null)
          .order('deleted_at', { ascending: false });
        data = res.data || [];
        error = res.error;
      } else if (activeTab === 'ideas') {
        const res = await supabase
          .from('ideas')
          .select('id, content, deleted_at')
          .eq('user_id', user.id)
          .not('deleted_at', 'is', null)
          .order('deleted_at', { ascending: false });
        data = res.data || [];
        error = res.error;
      } else if (activeTab === 'sops') {
        const res = await supabase
          .from('sops')
          .select('sop_id, sop_name, deleted_at')
          .eq('user_id', user.id)
          .not('deleted_at', 'is', null)
          .order('deleted_at', { ascending: false });
        data = res.data || [];
        error = res.error;
      } else if (activeTab === 'habits') {
        const res = await supabase
          .from('habits')
          .select('habit_id, habit_name, deleted_at')
          .eq('user_id', user.id)
          .not('deleted_at', 'is', null)
          .order('deleted_at', { ascending: false });
        data = res.data || [];
        error = res.error;
      }

      if (error) throw error;

      const now = new Date();
      return data.map((item: any) => {
        const deletedAt = new Date(item.deleted_at);
        const permanentDeleteDate = addDays(deletedAt, 30);
        const daysUntilPermanent = differenceInDays(permanentDeleteDate, now);
        
        return {
          id: item[config.idField],
          name: item[config.nameField],
          type: activeTab,
          deleted_at: item.deleted_at,
          days_until_permanent: Math.max(0, daysUntilPermanent),
        };
      }) as DeletedItem[];
    },
    enabled: !!user,
  });

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const config = TYPE_CONFIG[activeTab];
      let error: any = null;
      
      if (activeTab === 'tasks') {
        const res = await supabase.from('tasks').update({ deleted_at: null }).eq('task_id', itemId).eq('user_id', user!.id);
        error = res.error;
      } else if (activeTab === 'ideas') {
        const res = await supabase.from('ideas').update({ deleted_at: null }).eq('id', itemId).eq('user_id', user!.id);
        error = res.error;
      } else if (activeTab === 'sops') {
        const res = await supabase.from('sops').update({ deleted_at: null }).eq('sop_id', itemId).eq('user_id', user!.id);
        error = res.error;
      } else if (activeTab === 'habits') {
        const res = await supabase.from('habits').update({ deleted_at: null }).eq('habit_id', itemId).eq('user_id', user!.id);
        error = res.error;
      }
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deleted-items'] });
      queryClient.invalidateQueries({ queryKey: [activeTab] });
      toast({ title: 'Item restored!', description: 'The item has been moved back from trash.' });
    },
    onError: (error) => {
      console.error('Restore error:', error);
      toast({ title: 'Failed to restore', variant: 'destructive' });
    },
  });

  // Permanent delete mutation
  const permanentDeleteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      let error: any = null;
      
      if (activeTab === 'tasks') {
        const res = await supabase.from('tasks').delete().eq('task_id', itemId).eq('user_id', user!.id);
        error = res.error;
      } else if (activeTab === 'ideas') {
        const res = await supabase.from('ideas').delete().eq('id', itemId).eq('user_id', user!.id);
        error = res.error;
      } else if (activeTab === 'sops') {
        const res = await supabase.from('sops').delete().eq('sop_id', itemId).eq('user_id', user!.id);
        error = res.error;
      } else if (activeTab === 'habits') {
        const res = await supabase.from('habits').delete().eq('habit_id', itemId).eq('user_id', user!.id);
        error = res.error;
      }
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deleted-items'] });
      setConfirmDelete(null);
      toast({ title: 'Permanently deleted', description: 'The item has been permanently removed.' });
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast({ title: 'Failed to delete', variant: 'destructive' });
    },
  });

  // Bulk restore
  const handleBulkRestore = async () => {
    const promises = Array.from(selectedItems).map(id => restoreMutation.mutateAsync(id));
    await Promise.all(promises);
    setSelectedItems(new Set());
  };

  // Bulk permanent delete
  const handleBulkPermanentDelete = async () => {
    const promises = Array.from(selectedItems).map(id => permanentDeleteMutation.mutateAsync(id));
    await Promise.all(promises);
    setSelectedItems(new Set());
    setConfirmBulkDelete(false);
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedItems);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedItems(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === deletedItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(deletedItems.map(item => item.id)));
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as DeletedItemType);
    setSelectedItems(new Set());
  };

  return (
    <Layout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trash2 className="h-8 w-8" />
            Trash
          </h1>
          <p className="text-muted-foreground mt-1">
            Deleted items are kept for 30 days before permanent removal
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <div className="flex items-center justify-between mb-4">
                <TabsList>
                  {(Object.keys(TYPE_CONFIG) as DeletedItemType[]).map((type) => {
                    const config = TYPE_CONFIG[type];
                    const Icon = config.icon;
                    return (
                      <TabsTrigger key={type} value={type} className="gap-2">
                        <Icon className="h-4 w-4" />
                        {config.label}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {selectedItems.size > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkRestore}
                      disabled={restoreMutation.isPending}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restore ({selectedItems.size})
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setConfirmBulkDelete(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Permanently
                    </Button>
                  </div>
                )}
              </div>

              {(Object.keys(TYPE_CONFIG) as DeletedItemType[]).map((type) => (
                <TabsContent key={type} value={type}>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : deletedItems.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Trash2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No deleted {TYPE_CONFIG[type].label.toLowerCase()} found</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <Checkbox
                          checked={selectedItems.size === deletedItems.length && deletedItems.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                        <span className="text-sm text-muted-foreground">
                          Select all ({deletedItems.length})
                        </span>
                      </div>

                      <ScrollArea className="h-[400px]">
                        <div className="space-y-2">
                          {deletedItems.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                            >
                              <Checkbox
                                checked={selectedItems.has(item.id)}
                                onCheckedChange={() => toggleSelection(item.id)}
                              />
                              
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{item.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-muted-foreground">
                                    Deleted {formatDistanceToNow(new Date(item.deleted_at), { addSuffix: true })}
                                  </span>
                                  {item.days_until_permanent <= 7 && (
                                    <Badge variant="destructive" className="text-xs">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      {item.days_until_permanent} days left
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => restoreMutation.mutate(item.id)}
                                  disabled={restoreMutation.isPending}
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => setConfirmDelete(item.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">About Trash</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• Deleted items are automatically removed after 30 days</p>
            <p>• Restore items to bring them back to your active list</p>
            <p>• Permanently deleted items cannot be recovered</p>
          </CardContent>
        </Card>
      </div>

      {/* Single item delete confirmation */}
      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete this item?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The item will be permanently removed from your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDelete && permanentDeleteMutation.mutate(confirmDelete)}
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirmation */}
      <AlertDialog open={confirmBulkDelete} onOpenChange={setConfirmBulkDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete {selectedItems.size} items?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. These items will be permanently removed from your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleBulkPermanentDelete}
            >
              Delete All Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
