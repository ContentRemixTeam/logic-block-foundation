import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingState } from '@/components/system/LoadingState';
import { ErrorState } from '@/components/system/ErrorState';
import { toast } from '@/hooks/use-toast';
import { Star, Trash2, Edit, Plus, Zap } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Thought {
  id: string;
  text: string;
  category_id: string | null;
  is_favorite: boolean;
  created_at: string;
  mindset_categories: Category | null;
}

export default function UsefulThoughts() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [newThought, setNewThought] = useState('');
  const [newThoughtCategory, setNewThoughtCategory] = useState<string>('');
  const [editingThought, setEditingThought] = useState<Thought | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#10B8C7');
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadThoughts();
    }
  }, [user]);

  const loadThoughts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('get-thoughts');

      if (error) throw error;

      setThoughts(data.thoughts || []);
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Error loading thoughts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load thoughts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveThought = async () => {
    if (!newThought.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a thought',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase.functions.invoke('save-thought', {
        body: {
          id: editingThought?.id,
          text: newThought,
          category_id: newThoughtCategory || null,
        },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Thought ${editingThought ? 'updated' : 'saved'} ⚡`,
      });

      setNewThought('');
      setNewThoughtCategory('');
      setEditingThought(null);
      loadThoughts();
    } catch (error) {
      console.error('Error saving thought:', error);
      toast({
        title: 'Error',
        description: 'Failed to save thought',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleFavorite = async (thought: Thought) => {
    try {
      const { error } = await supabase.functions.invoke('toggle-thought-favorite', {
        body: {
          id: thought.id,
          is_favorite: !thought.is_favorite,
        },
      });

      if (error) throw error;

      setThoughts(thoughts.map(t => 
        t.id === thought.id ? { ...t, is_favorite: !t.is_favorite } : t
      ));
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: 'Error',
        description: 'Failed to update favorite',
        variant: 'destructive',
      });
    }
  };

  const deleteThought = async (id: string) => {
    if (!confirm('Delete this thought?')) return;

    try {
      const { error } = await supabase.functions.invoke('delete-thought', {
        body: { id },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Thought deleted',
      });

      loadThoughts();
    } catch (error) {
      console.error('Error deleting thought:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete thought',
        variant: 'destructive',
      });
    }
  };

  const saveCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      const { error } = await supabase.functions.invoke('save-mindset-category', {
        body: {
          name: newCategoryName,
          color: newCategoryColor,
        },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Category saved ⚡',
      });

      setNewCategoryName('');
      setNewCategoryColor('#10B8C7');
      setCategoryDialogOpen(false);
      loadThoughts();
    } catch (error) {
      console.error('Error saving category:', error);
      toast({
        title: 'Error',
        description: 'Failed to save category',
        variant: 'destructive',
      });
    }
  };

  const editThought = (thought: Thought) => {
    setEditingThought(thought);
    setNewThought(thought.text);
    setNewThoughtCategory(thought.category_id || '');
  };

  const filteredThoughts = thoughts.filter(t => 
    selectedCategory === 'all' || 
    selectedCategory === 'favorites' && t.is_favorite ||
    t.category_id === selectedCategory
  );

  if (loading) {
    return (
      <Layout>
        <LoadingState message="Loading useful thoughts..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Zap className="h-8 w-8 text-primary" />
              Useful Thoughts
            </h1>
            <p className="text-muted-foreground mt-2">Build your library of empowering thoughts</p>
          </div>
          <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Manage Categories</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Manage Categories</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Category name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                  />
                  <Input
                    type="color"
                    value={newCategoryColor}
                    onChange={(e) => setNewCategoryColor(e.target.value)}
                    className="w-20"
                  />
                  <Button onClick={saveCategory}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center gap-2 p-2 border rounded">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="flex-1">{cat.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editingThought ? 'Edit' : 'Add'} Thought</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Enter a useful thought..."
              value={newThought}
              onChange={(e) => setNewThought(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2">
              <Select value={newThoughtCategory} onValueChange={setNewThoughtCategory}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No category</SelectItem>
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
              <Button onClick={saveThought} disabled={saving}>
                {saving ? 'Saving...' : editingThought ? 'Update' : 'Save'}
              </Button>
              {editingThought && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditingThought(null);
                    setNewThought('');
                    setNewThoughtCategory('');
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="mb-4">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Thoughts</SelectItem>
              <SelectItem value="favorites">Favorites</SelectItem>
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

        <div className="space-y-3">
          {filteredThoughts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No thoughts yet. Add one above to get started! ⚡
              </CardContent>
            </Card>
          ) : (
            filteredThoughts.map((thought) => (
              <Card 
                key={thought.id}
                style={{
                  borderLeftWidth: '4px',
                  borderLeftColor: thought.mindset_categories?.color || 'transparent',
                }}
              >
                <CardContent className="py-4 flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-foreground">{thought.text}</p>
                    {thought.mindset_categories && (
                      <span className="text-xs text-muted-foreground mt-2 inline-block">
                        {thought.mindset_categories.name}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleFavorite(thought)}
                    >
                      <Star 
                        className={`h-4 w-4 ${thought.is_favorite ? 'fill-yellow-500 text-yellow-500' : ''}`}
                      />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => editThought(thought)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteThought(thought.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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