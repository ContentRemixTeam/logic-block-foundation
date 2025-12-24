import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Layout } from '@/components/Layout';
import { LoadingState } from '@/components/system/LoadingState';
import { ErrorState } from '@/components/system/ErrorState';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Zap, Edit, Trash2, Plus } from 'lucide-react';
import { normalizeString, normalizeArray } from '@/lib/normalize';

interface Category {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

interface Idea {
  id: string;
  content: string;
  category_id: string | null;
  created_at: string;
  updated_at: string;
}

export default function Ideas() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Edit idea modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<string>('');
  
  // Manage categories modal
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState('#FF3370');
  
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const { data, error: fetchError } = await supabase.functions.invoke('get-ideas');

      if (fetchError) throw fetchError;

      setCategories(normalizeArray(data.categories).map((cat: any) => ({
        id: normalizeString(cat.id),
        name: normalizeString(cat.name),
        color: normalizeString(cat.color, '#3A3A3A'),
        created_at: normalizeString(cat.created_at),
      })));

      setIdeas(normalizeArray(data.ideas).map((idea: any) => ({
        id: normalizeString(idea.id),
        content: normalizeString(idea.content),
        category_id: idea.category_id || null,
        created_at: normalizeString(idea.created_at),
        updated_at: normalizeString(idea.updated_at),
      })).filter((idea: Idea) => idea.content.trim() !== ''));
    } catch (err: any) {
      console.error('Error loading ideas:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEditIdea = (idea: Idea) => {
    setEditingIdea(idea);
    setEditContent(idea.content);
    setEditCategoryId(idea.category_id || '');
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingIdea || !editContent.trim()) return;

    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const { error } = await supabase.functions.invoke('save-idea', {
        body: {
          id: editingIdea.id,
          content: editContent.trim(),
          category_id: editCategoryId || null,
        },
      });

      if (error) throw error;

      toast({ title: 'Idea updated! ⚡' });
      setEditModalOpen(false);
      loadData();
    } catch (error: any) {
      console.error('Error updating idea:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteIdea = async (id: string) => {
    if (!confirm('Delete this idea?')) return;

    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const { error } = await supabase.functions.invoke('delete-idea', {
        body: { id },
      });

      if (error) throw error;

      toast({ title: 'Idea deleted' });
      loadData();
    } catch (error: any) {
      console.error('Error deleting idea:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) return;

    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const { error } = await supabase.functions.invoke('save-category', {
        body: {
          id: editingCategory?.id || null,
          name: categoryName.trim(),
          color: categoryColor,
        },
      });

      if (error) throw error;

      toast({ title: editingCategory ? 'Category updated' : 'Category created' });
      setEditingCategory(null);
      setCategoryName('');
      setCategoryColor('#FF3370');
      loadData();
    } catch (error: any) {
      console.error('Error saving category:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Delete this category? This will only work if no ideas are using it.')) return;

    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const { error } = await supabase.functions.invoke('delete-category', {
        body: { id },
      });

      if (error) throw error;

      toast({ title: 'Category deleted' });
      loadData();
    } catch (error: any) {
      console.error('Error deleting category:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredIdeas = selectedCategory === 'all'
    ? ideas
    : ideas.filter((idea) => idea.category_id === selectedCategory);

  const getCategoryById = (id: string | null) => {
    if (!id) return null;
    return categories.find((cat) => cat.id === id);
  };

  if (loading) return <Layout><LoadingState message="Loading ideas..." /></Layout>;
  if (error) return <Layout><ErrorState message={error} onRetry={loadData} /></Layout>;

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Zap className="h-8 w-8 text-accent" />
              Ideas Board
            </h1>
            <p className="text-muted-foreground">
              Capture and organize your thoughts
            </p>
          </div>
          <Button onClick={() => setManageCategoriesOpen(true)} variant="outline">
            Manage Categories
          </Button>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-4">
          <Label htmlFor="categoryFilter">Filter by category:</Label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    {cat.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Ideas Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredIdeas.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Zap className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No ideas yet — capture something with the ⚡ button!
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredIdeas.map((idea) => {
              const category = getCategoryById(idea.category_id);
              return (
                <Card
                  key={idea.id}
                  className="relative"
                  style={{
                    borderLeft: category ? `4px solid ${category.color}` : undefined,
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        {category && (
                          <div
                            className="inline-block px-2 py-1 rounded text-xs mb-2"
                            style={{
                              backgroundColor: `${category.color}20`,
                              color: category.color,
                            }}
                          >
                            {category.name}
                          </div>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{idea.content}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEditIdea(idea)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDeleteIdea(idea.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground">
                      {new Date(idea.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Edit Idea Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Idea</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editContent">Idea</Label>
              <Textarea
                id="editContent"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
            <div>
              <Label htmlFor="editCategory">Category</Label>
              <Select value={editCategoryId || "uncategorized"} onValueChange={(val) => setEditCategoryId(val === "uncategorized" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uncategorized">No category</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSaveEdit} disabled={actionLoading} className="w-full">
              {actionLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Categories Modal */}
      <Dialog open={manageCategoriesOpen} onOpenChange={setManageCategoriesOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Categories</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Add/Edit Category Form */}
            <div className="p-4 border rounded-lg space-y-3">
              <h3 className="font-semibold">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h3>
              <div>
                <Label htmlFor="categoryName">Name</Label>
                <Input
                  id="categoryName"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g., Product Ideas"
                />
              </div>
              <div>
                <Label htmlFor="categoryColor">Color</Label>
                <Input
                  id="categoryColor"
                  type="color"
                  value={categoryColor}
                  onChange={(e) => setCategoryColor(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveCategory} disabled={actionLoading}>
                  {actionLoading ? 'Saving...' : editingCategory ? 'Update' : 'Add'}
                </Button>
                {editingCategory && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditingCategory(null);
                      setCategoryName('');
                      setCategoryColor('#FF3370');
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>

            {/* Categories List */}
            <div className="space-y-2">
              <h3 className="font-semibold">Existing Categories</h3>
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">No categories yet</p>
              ) : (
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-6 h-6 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span>{cat.name}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingCategory(cat);
                            setCategoryName(cat.name);
                            setCategoryColor(cat.color);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleDeleteCategory(cat.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
