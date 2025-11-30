import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Zap, Plus } from 'lucide-react';
import { normalizeString } from '@/lib/normalize';

interface Category {
  id: string;
  name: string;
  color: string;
}

interface CaptureButtonProps {
  categories: Category[];
  onIdeaSaved: () => void;
}

export function CaptureButton({ categories, onIdeaSaved }: CaptureButtonProps) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#FF3370');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSaveIdea = async () => {
    if (!content.trim()) {
      toast({
        title: 'Content required',
        description: 'Please enter an idea before saving',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const { error } = await supabase.functions.invoke('save-idea', {
        body: {
          content: content.trim(),
          category_id: categoryId || null,
        },
      });

      if (error) throw error;

      toast({
        title: '⚡ Idea captured!',
      });

      setContent('');
      setCategoryId('');
      setOpen(false);
      onIdeaSaved();
    } catch (error: any) {
      console.error('Error saving idea:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNewCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a category name',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const { data, error } = await supabase.functions.invoke('save-category', {
        body: {
          name: newCategoryName.trim(),
          color: newCategoryColor,
        },
      });

      if (error) throw error;

      toast({
        title: 'Category created',
      });

      setNewCategoryName('');
      setNewCategoryColor('#FF3370');
      setShowNewCategory(false);
      setCategoryId(data.category.id);
      onIdeaSaved();
    } catch (error: any) {
      console.error('Error saving category:', error);
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
    <>
      <Button
        onClick={() => setOpen(true)}
        size="lg"
        className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg hover:shadow-xl transition-all z-50"
      >
        <Zap className="h-6 w-6" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-accent" />
              Capture Idea
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="content">Idea</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's on your mind?"
                rows={4}
                className="resize-none"
              />
            </div>

            <div>
              <Label htmlFor="category">Category (optional)</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No category</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: normalizeString(cat.color, '#3A3A3A') }}
                        />
                        {normalizeString(cat.name)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!showNewCategory && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNewCategory(true)}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            )}

            {showNewCategory && (
              <div className="space-y-3 p-4 border rounded-lg">
                <div>
                  <Label htmlFor="newCategoryName">Category Name</Label>
                  <Input
                    id="newCategoryName"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="e.g., Product Ideas"
                  />
                </div>
                <div>
                  <Label htmlFor="newCategoryColor">Color</Label>
                  <Input
                    id="newCategoryColor"
                    type="color"
                    value={newCategoryColor}
                    onChange={(e) => setNewCategoryColor(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveNewCategory} disabled={loading} size="sm">
                    Save Category
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowNewCategory(false);
                      setNewCategoryName('');
                      setNewCategoryColor('#FF3370');
                    }}
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <Button onClick={handleSaveIdea} disabled={loading} className="w-full">
              {loading ? 'Saving...' : 'Save Idea ⚡'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
