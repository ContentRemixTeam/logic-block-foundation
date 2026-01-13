import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { LoadingState } from '@/components/system/LoadingState';
import { Plus, Pencil, Trash2, Copy, ClipboardList, X, Link as LinkIcon, GripVertical, ExternalLink } from 'lucide-react';

interface ChecklistItem {
  id: string;
  text: string;
  order: number;
}

interface SOPLink {
  id: string;
  title: string;
  url: string;
}

interface SOP {
  sop_id: string;
  sop_name: string;
  description: string | null;
  checklist_items: ChecklistItem[];
  links: SOPLink[];
  notes: string | null;
  times_used: number;
  created_at: string;
  updated_at: string;
}

export default function SOPs() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sops, setSOPs] = useState<SOP[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [sopToDelete, setSOPToDelete] = useState<SOP | null>(null);
  
  // Form state
  const [editingSOP, setEditingSOP] = useState<SOP | null>(null);
  const [sopName, setSOPName] = useState('');
  const [description, setDescription] = useState('');
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [links, setLinks] = useState<SOPLink[]>([]);
  const [notes, setNotes] = useState('');
  const [newItemText, setNewItemText] = useState('');
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  useEffect(() => {
    if (user) {
      loadSOPs();
    }
  }, [user]);

  const loadSOPs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('get-sops');
      
      if (error) throw error;
      
      setSOPs(data.sops || []);
    } catch (error: any) {
      console.error('Error loading SOPs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load SOPs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingSOP(null);
    setSOPName('');
    setDescription('');
    setChecklistItems([]);
    setLinks([]);
    setNotes('');
    setNewItemText('');
    setNewLinkTitle('');
    setNewLinkUrl('');
    setIsDialogOpen(true);
  };

  const openEditDialog = (sop: SOP) => {
    setEditingSOP(sop);
    setSOPName(sop.sop_name);
    setDescription(sop.description || '');
    setChecklistItems(sop.checklist_items || []);
    setLinks(sop.links || []);
    setNotes(sop.notes || '');
    setNewItemText('');
    setNewLinkTitle('');
    setNewLinkUrl('');
    setIsDialogOpen(true);
  };

  const handleDuplicate = (sop: SOP) => {
    setEditingSOP(null);
    setSOPName(`${sop.sop_name} (Copy)`);
    setDescription(sop.description || '');
    setChecklistItems(sop.checklist_items.map(item => ({ ...item, id: crypto.randomUUID() })));
    setLinks(sop.links.map(link => ({ ...link, id: crypto.randomUUID() })));
    setNotes(sop.notes || '');
    setNewItemText('');
    setNewLinkTitle('');
    setNewLinkUrl('');
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!sopName.trim()) {
      toast({
        title: 'Error',
        description: 'SOP name is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      
      const { data, error } = await supabase.functions.invoke('save-sop', {
        body: {
          sop_id: editingSOP?.sop_id || null,
          sop_name: sopName,
          description,
          checklist_items: checklistItems,
          links,
          notes,
        },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: editingSOP ? 'SOP updated successfully' : 'SOP created successfully',
      });

      setIsDialogOpen(false);
      loadSOPs();
      queryClient.invalidateQueries({ queryKey: ['sops'] });
    } catch (error: any) {
      console.error('Error saving SOP:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save SOP',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!sopToDelete) return;

    try {
      const { error } = await supabase.functions.invoke('delete-sop', {
        body: { sop_id: sopToDelete.sop_id },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'SOP deleted successfully',
      });

      setIsDeleteDialogOpen(false);
      setSOPToDelete(null);
      loadSOPs();
      queryClient.invalidateQueries({ queryKey: ['sops'] });
    } catch (error: any) {
      console.error('Error deleting SOP:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete SOP',
        variant: 'destructive',
      });
    }
  };

  const addChecklistItem = () => {
    if (!newItemText.trim()) return;
    
    const newItem: ChecklistItem = {
      id: crypto.randomUUID(),
      text: newItemText.trim(),
      order: checklistItems.length + 1,
    };
    
    setChecklistItems([...checklistItems, newItem]);
    setNewItemText('');
  };

  const removeChecklistItem = (id: string) => {
    setChecklistItems(checklistItems.filter(item => item.id !== id));
  };

  const updateChecklistItem = (id: string, text: string) => {
    setChecklistItems(checklistItems.map(item => 
      item.id === id ? { ...item, text } : item
    ));
  };

  const addLink = () => {
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) return;
    
    const newLink: SOPLink = {
      id: crypto.randomUUID(),
      title: newLinkTitle.trim(),
      url: newLinkUrl.trim(),
    };
    
    setLinks([...links, newLink]);
    setNewLinkTitle('');
    setNewLinkUrl('');
  };

  const removeLink = (id: string) => {
    setLinks(links.filter(link => link.id !== id));
  };

  if (loading) {
    return (
      <Layout>
        <LoadingState message="Loading SOPs..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-primary" />
              SOPs
            </h1>
            <p className="text-muted-foreground">
              Reusable checklists for common tasks
            </p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Create New SOP
          </Button>
        </div>

        {/* SOPs List */}
        {sops.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No SOPs yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create reusable checklists for tasks you do repeatedly.
              </p>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First SOP
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sops.map((sop) => (
              <Card key={sop.sop_id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-start justify-between">
                    <span className="truncate">{sop.sop_name}</span>
                  </CardTitle>
                  {sop.description && (
                    <CardDescription className="line-clamp-2">
                      {sop.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span>{sop.checklist_items?.length || 0} steps</span>
                    <span>•</span>
                    <span>Used {sop.times_used} times</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(sop)}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDuplicate(sop)}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Duplicate
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSOPToDelete(sop);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSOP ? 'Edit SOP' : 'Create New SOP'}
            </DialogTitle>
            <DialogDescription>
              Create a reusable checklist for tasks you do regularly.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* SOP Name */}
            <div className="space-y-2">
              <Label htmlFor="sop-name">SOP Name *</Label>
              <Input
                id="sop-name"
                placeholder="e.g., Send Weekly Newsletter"
                value={sopName}
                onChange={(e) => setSOPName(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Process for creating and sending weekly newsletter..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            {/* Checklist Items */}
            <div className="space-y-3">
              <Label>Checklist Items</Label>
              
              {checklistItems.map((item, index) => (
                <div key={item.id} className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                  <Input
                    value={item.text}
                    onChange={(e) => updateChecklistItem(item.id, e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeChecklistItem(item.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <div className="flex items-center gap-2">
                <div className="w-4" />
                <span className="text-sm text-muted-foreground w-6">{checklistItems.length + 1}.</span>
                <Input
                  placeholder="Add a step..."
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addChecklistItem()}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={addChecklistItem}
                  disabled={!newItemText.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Useful Links */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                Useful Links
              </Label>
              
              {links.map((link) => (
                <div key={link.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{link.title}</p>
                    <a 
                      href={link.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline truncate block"
                    >
                      {link.url}
                    </a>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open(link.url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLink(link.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Link title..."
                    value={newLinkTitle}
                    onChange={(e) => setNewLinkTitle(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="https://..."
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={addLink}
                    disabled={!newLinkTitle.trim() || !newLinkUrl.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional tips, reminders, or best practices..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !sopName.trim()}>
              {saving ? 'Saving...' : editingSOP ? 'Save Changes' : 'Create SOP'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete SOP?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{sopToDelete?.sop_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
