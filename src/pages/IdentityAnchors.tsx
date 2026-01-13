import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Zap, Loader2 } from 'lucide-react';
import { normalizeArray } from '@/lib/normalize';
import { useQueryClient } from '@tanstack/react-query';

interface IdentityAnchor {
  id: string;
  identity_statement: string;
  supporting_habits: string[];
  supporting_actions: string[];
  created_at: string;
}

// Local storage key for form backup
const FORM_BACKUP_KEY = 'identity_anchors_form_backup';

export default function IdentityAnchors() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [anchors, setAnchors] = useState<IdentityAnchor[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Form state
  const [editingAnchor, setEditingAnchor] = useState<IdentityAnchor | null>(null);
  const [identityStatement, setIdentityStatement] = useState('');
  const [supportingHabits, setSupportingHabits] = useState<string[]>(['']);
  const [supportingActions, setSupportingActions] = useState<string[]>(['']);

  // Save form to local storage
  const saveFormBackup = useCallback(() => {
    if (!isDialogOpen) return;
    try {
      localStorage.setItem(FORM_BACKUP_KEY, JSON.stringify({
        identityStatement,
        supportingHabits,
        supportingActions,
        editingId: editingAnchor?.id || null,
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Failed to save backup:', error);
    }
  }, [identityStatement, supportingHabits, supportingActions, editingAnchor, isDialogOpen]);

  // Backup form on changes when dialog is open
  useEffect(() => {
    if (isDialogOpen && (identityStatement || supportingHabits.some(h => h) || supportingActions.some(a => a))) {
      saveFormBackup();
    }
  }, [identityStatement, supportingHabits, supportingActions, isDialogOpen, saveFormBackup]);

  // Clear form backup
  const clearFormBackup = () => {
    try {
      localStorage.removeItem(FORM_BACKUP_KEY);
    } catch (error) {
      console.error('Failed to clear backup:', error);
    }
  };

  // Load backup when dialog opens
  useEffect(() => {
    if (isDialogOpen && !editingAnchor) {
      try {
        const stored = localStorage.getItem(FORM_BACKUP_KEY);
        if (stored) {
          const backup = JSON.parse(stored);
          // Only restore if there's actual content and it's not for a specific anchor
          if (backup.identityStatement && !backup.editingId) {
            setIdentityStatement(backup.identityStatement || '');
            setSupportingHabits(backup.supportingHabits?.length > 0 ? backup.supportingHabits : ['']);
            setSupportingActions(backup.supportingActions?.length > 0 ? backup.supportingActions : ['']);
            toast({
              title: '📋 Draft restored',
              description: 'Your previous identity anchor draft has been restored.',
            });
          }
        }
      } catch (error) {
        console.error('Failed to load backup:', error);
      }
    }
  }, [isDialogOpen, editingAnchor]);

  useEffect(() => {
    if (user) {
      loadAnchors();
    }
  }, [user]);

  const loadAnchors = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('get-identity-anchors');

      if (error) throw error;

      const normalized = (data || []).map((anchor: any) => ({
        ...anchor,
        supporting_habits: normalizeArray(anchor.supporting_habits),
        supporting_actions: normalizeArray(anchor.supporting_actions),
      }));

      setAnchors(normalized);
    } catch (error) {
      console.error('Error loading anchors:', error);
      toast({
        title: 'Error',
        description: 'Failed to load identity anchors',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingAnchor(null);
    setIdentityStatement('');
    setSupportingHabits(['']);
    setSupportingActions(['']);
    clearFormBackup();
  };

  const openEditDialog = (anchor: IdentityAnchor) => {
    setEditingAnchor(anchor);
    setIdentityStatement(anchor.identity_statement);
    setSupportingHabits(anchor.supporting_habits.length > 0 ? anchor.supporting_habits : ['']);
    setSupportingActions(anchor.supporting_actions.length > 0 ? anchor.supporting_actions : ['']);
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!identityStatement.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Identity statement is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      const payload = {
        identity_statement: identityStatement.trim(),
        supporting_habits: supportingHabits.filter(h => h.trim()),
        supporting_actions: supportingActions.filter(a => a.trim()),
      };

      const functionName = editingAnchor ? 'update-identity-anchor' : 'create-identity-anchor';
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: editingAnchor ? { ...payload, id: editingAnchor.id } : payload,
      });

      if (error) throw error;

      toast({
        title: '⚡ Success',
        description: `Identity anchor ${editingAnchor ? 'updated' : 'created'} successfully`,
      });

      setIsDialogOpen(false);
      resetForm();
      loadAnchors();
      queryClient.invalidateQueries({ queryKey: ['identity-anchors'] });
    } catch (error) {
      console.error('Error saving anchor:', error);
      toast({
        title: 'Error',
        description: 'Failed to save identity anchor',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase.functions.invoke('delete-identity-anchor', {
        body: { id: deleteId },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Identity anchor deleted',
      });

      setDeleteId(null);
      loadAnchors();
      queryClient.invalidateQueries({ queryKey: ['identity-anchors'] });
    } catch (error) {
      console.error('Error deleting anchor:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete identity anchor',
        variant: 'destructive',
      });
    }
  };

  const addHabit = () => {
    if (supportingHabits.length < 5) {
      setSupportingHabits([...supportingHabits, '']);
    }
  };

  const removeHabit = (index: number) => {
    setSupportingHabits(supportingHabits.filter((_, i) => i !== index));
  };

  const updateHabit = (index: number, value: string) => {
    const newHabits = [...supportingHabits];
    newHabits[index] = value;
    setSupportingHabits(newHabits);
  };

  const addAction = () => {
    if (supportingActions.length < 5) {
      setSupportingActions([...supportingActions, '']);
    }
  };

  const removeAction = (index: number) => {
    setSupportingActions(supportingActions.filter((_, i) => i !== index));
  };

  const updateAction = (index: number, value: string) => {
    const newActions = [...supportingActions];
    newActions[index] = value;
    setSupportingActions(newActions);
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      // Clear backup when closing without saving
      clearFormBackup();
    }
    setIsDialogOpen(open);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Zap className="h-8 w-8 text-primary" />
              Identity Anchors
            </h1>
            <p className="text-muted-foreground mt-1">
              Define who you are and align your habits and actions
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                New Anchor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingAnchor ? 'Edit Identity Anchor' : 'Create Identity Anchor'}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                <div>
                  <Label htmlFor="identity-statement">Identity Statement *</Label>
                  <Textarea
                    id="identity-statement"
                    value={identityStatement}
                    onChange={(e) => setIdentityStatement(e.target.value)}
                    placeholder="I am someone who..."
                    rows={3}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Supporting Habits (3-5)</Label>
                  <div className="space-y-2 mt-2">
                    {supportingHabits.map((habit, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={habit}
                          onChange={(e) => updateHabit(index, e.target.value)}
                          placeholder={`Habit ${index + 1}`}
                        />
                        {supportingHabits.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeHabit(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {supportingHabits.length < 5 && (
                      <Button type="button" variant="outline" onClick={addHabit} className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Habit
                      </Button>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Supporting Actions (3-5)</Label>
                  <div className="space-y-2 mt-2">
                    {supportingActions.map((action, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={action}
                          onChange={(e) => updateAction(index, e.target.value)}
                          placeholder={`Action ${index + 1}`}
                        />
                        {supportingActions.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeAction(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {supportingActions.length < 5 && (
                      <Button type="button" variant="outline" onClick={addAction} className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Action
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => handleDialogClose(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Anchor'
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {anchors.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No identity anchors yet. Create your first one to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {anchors.map((anchor) => (
              <Card key={anchor.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <Zap className="h-5 w-5 text-primary" />
                        {anchor.identity_statement}
                      </CardTitle>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(anchor)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(anchor.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    {anchor.supporting_habits.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2 text-sm">Supporting Habits</h4>
                        <ul className="space-y-1">
                          {anchor.supporting_habits.map((habit, idx) => (
                            <li key={idx} className="text-sm text-muted-foreground">
                              • {habit}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {anchor.supporting_actions.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2 text-sm">Supporting Actions</h4>
                        <ul className="space-y-1">
                          {anchor.supporting_actions.map((action, idx) => (
                            <li key={idx} className="text-sm text-muted-foreground">
                              • {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Identity Anchor?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this identity anchor.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
