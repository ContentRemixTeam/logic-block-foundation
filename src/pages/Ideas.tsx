import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Layout } from '@/components/Layout';
import { LoadingState } from '@/components/system/LoadingState';
import { ErrorState } from '@/components/system/ErrorState';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Zap, Edit, Trash2, Plus, ArrowUpDown, FolderKanban, Clock, Hash, X, Loader2 } from 'lucide-react';
import { PaginationInfo } from '@/components/ui/pagination-info';
import { normalizeString } from '@/lib/normalize';
import { cn } from '@/lib/utils';

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
  priority: string | null;
  tags: string[];
  project_id: string | null;
  created_at: string;
  updated_at: string;
}

const PRIORITY_OPTIONS = [
  { value: 'asap', label: 'ASAP', color: 'bg-red-500' },
  { value: 'next_week', label: 'Next Week', color: 'bg-orange-500' },
  { value: 'next_month', label: 'Next Month', color: 'bg-blue-500' },
  { value: 'someday', label: 'Someday', color: 'bg-gray-500' },
];

const PAGE_SIZE = 50;

export default function Ideas() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: projects = [] } = useProjects();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightIdeaId = searchParams.get('highlightIdea');
  const highlightedRef = useRef<HTMLDivElement>(null);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  
  // Clear highlight after 3 seconds
  useEffect(() => {
    if (highlightIdeaId) {
      const timer = setTimeout(() => {
        searchParams.delete('highlightIdea');
        setSearchParams(searchParams, { replace: true });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightIdeaId, searchParams, setSearchParams]);
  
  // Scroll to highlighted idea
  useEffect(() => {
    if (highlightIdeaId && !loading && highlightedRef.current) {
      highlightedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightIdeaId, loading, ideas]);
  
  // Add idea modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newCategoryId, setNewCategoryId] = useState<string>('');
  const [newPriority, setNewPriority] = useState<string>('');
  const [newTags, setNewTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [newProjectId, setNewProjectId] = useState<string>('');
  
  // Edit idea modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<string>('');
  const [editPriority, setEditPriority] = useState<string>('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editTagInput, setEditTagInput] = useState('');
  const [editProjectId, setEditProjectId] = useState<string>('');
  
  // Manage categories modal
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState('#FF3370');
  
  const [actionLoading, setActionLoading] = useState(false);

  // Inline category creation state for Add modal
  const [showInlineAddCategory, setShowInlineAddCategory] = useState(false);
  const [inlineAddCategoryName, setInlineAddCategoryName] = useState('');
  const [inlineAddCategoryColor, setInlineAddCategoryColor] = useState('#FF3370');

  // Inline category creation state for Edit modal
  const [showInlineEditCategory, setShowInlineEditCategory] = useState(false);
  const [inlineEditCategoryName, setInlineEditCategoryName] = useState('');
  const [inlineEditCategoryColor, setInlineEditCategoryColor] = useState('#FF3370');

  const handleInlineCategoryCreate = async (isEdit: boolean) => {
    const name = isEdit ? inlineEditCategoryName : inlineAddCategoryName;
    const color = isEdit ? inlineEditCategoryColor : inlineAddCategoryColor;
    
    if (!name.trim()) return;

    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const { data, error } = await supabase.functions.invoke('save-category', {
        body: {
          id: null,
          name: name.trim(),
          color: color,
        },
      });

      if (error) throw error;

      // Get the new category ID from the response or reload to get it
      await loadData();
      
      // Find the newly created category and select it
      const { data: refreshData } = await supabase.functions.invoke('get-ideas');
      const newCategories = Array.isArray(refreshData?.categories) ? refreshData.categories : [];
      const newCat = newCategories.find((c: any) => c.name === name.trim());
      
      if (newCat) {
        if (isEdit) {
          setEditCategoryId(newCat.id);
          setShowInlineEditCategory(false);
          setInlineEditCategoryName('');
          setInlineEditCategoryColor('#FF3370');
        } else {
          setNewCategoryId(newCat.id);
          setShowInlineAddCategory(false);
          setInlineAddCategoryName('');
          setInlineAddCategoryColor('#FF3370');
        }
      }

      toast({ title: 'Category created!' });
    } catch (error: any) {
      console.error('Error creating category:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const loadData = useCallback(async (loadMore = false) => {
    if (!user) return;

    if (loadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const offset = loadMore ? ideas.length : 0;
      const { data, error: fetchError } = await supabase.functions.invoke('get-ideas', {
        body: { limit: PAGE_SIZE, offset },
      });

      if (fetchError) throw fetchError;

      const safeCategories = Array.isArray(data?.categories) ? data.categories : [];
      setCategories(safeCategories
        .filter((cat: any) => cat && cat.id)
        .map((cat: any) => ({
          id: String(cat.id),
          name: normalizeString(cat.name),
          color: normalizeString(cat.color, '#3A3A3A'),
          created_at: normalizeString(cat.created_at),
        })));

      const safeIdeas = Array.isArray(data?.ideas) ? data.ideas : [];
      const parsedIdeas = safeIdeas
        .filter((idea: any) => idea && idea.id)
        .map((idea: any) => ({
          id: String(idea.id),
          content: normalizeString(idea.content),
          category_id: idea.category_id || null,
          priority: idea.priority || null,
          tags: Array.isArray(idea.tags) ? idea.tags : [],
          project_id: idea.project_id || null,
          created_at: normalizeString(idea.created_at),
          updated_at: normalizeString(idea.updated_at),
        }))
        .filter((idea: Idea) => idea.content.trim() !== '');

      if (loadMore) {
        setIdeas(prev => [...prev, ...parsedIdeas]);
      } else {
        setIdeas(parsedIdeas);
      }
      
      setTotalCount(data?.totalCount || parsedIdeas.length);
      setHasMore(data?.hasMore || false);
    } catch (err: any) {
      console.error('Error loading ideas:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user, ideas.length]);

  const handleLoadMore = useCallback(() => {
    loadData(true);
  }, [loadData]);

  useEffect(() => {
    loadData(false);
  }, [user]); // Only reload on user change, not loadData to prevent infinite loop

  const handleEditIdea = (idea: Idea) => {
    setEditingIdea(idea);
    setEditContent(idea.content);
    setEditCategoryId(idea.category_id || '');
    setEditPriority(idea.priority || '');
    setEditTags(idea.tags || []);
    setEditProjectId(idea.project_id || '');
    setEditModalOpen(true);
  };

  const resetAddForm = () => {
    setNewContent('');
    setNewCategoryId('');
    setNewPriority('');
    setNewTags([]);
    setNewTagInput('');
    setNewProjectId('');
    setShowInlineAddCategory(false);
    setInlineAddCategoryName('');
    setInlineAddCategoryColor('#FF3370');
  };

  const handleAddTag = (isEdit: boolean) => {
    const input = isEdit ? editTagInput : newTagInput;
    const tags = isEdit ? editTags : newTags;
    const setTags = isEdit ? setEditTags : setNewTags;
    const setInput = isEdit ? setEditTagInput : setNewTagInput;
    
    if (input.trim() && !tags.includes(input.trim())) {
      setTags([...tags, input.trim()]);
      setInput('');
    }
  };

  const handleRemoveTag = (tag: string, isEdit: boolean) => {
    const setTags = isEdit ? setEditTags : setNewTags;
    const tags = isEdit ? editTags : newTags;
    setTags(tags.filter(t => t !== tag));
  };

  const handleAddIdea = async () => {
    if (!newContent.trim()) return;

    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const { error } = await supabase.functions.invoke('save-idea', {
        body: {
          content: newContent.trim(),
          category_id: newCategoryId || null,
          priority: newPriority || null,
          tags: newTags,
          project_id: newProjectId || null,
        },
      });

      if (error) throw error;

      toast({ title: 'Idea added! ⚡' });
      setAddModalOpen(false);
      resetAddForm();
      loadData();
    } catch (error: any) {
      console.error('Error adding idea:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
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
          priority: editPriority || null,
          tags: editTags,
          project_id: editProjectId || null,
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

  const filteredIdeas = ideas
    .filter((idea) => selectedCategory === 'all' || idea.category_id === selectedCategory)
    .filter((idea) => selectedPriority === 'all' || idea.priority === selectedPriority)
    .filter((idea) => selectedProject === 'all' || idea.project_id === selectedProject)
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

  const getCategoryById = (id: string | null) => {
    if (!id) return null;
    return categories.find((cat) => cat.id === id);
  };

  const getProjectById = (id: string | null) => {
    if (!id) return null;
    return projects.find((p) => p.id === id);
  };

  const getPriorityOption = (value: string | null) => {
    if (!value) return null;
    return PRIORITY_OPTIONS.find((p) => p.value === value);
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest');
  };

  if (loading) return <Layout><LoadingState message="Loading ideas..." /></Layout>;
  if (error) return <Layout><ErrorState message={error} onRetry={loadData} /></Layout>;

  const IdeaFormFields = ({ isEdit = false }: { isEdit?: boolean }) => {
    const content = isEdit ? editContent : newContent;
    const setContent = isEdit ? setEditContent : setNewContent;
    const categoryId = isEdit ? editCategoryId : newCategoryId;
    const setCategoryId = isEdit ? setEditCategoryId : setNewCategoryId;
    const priority = isEdit ? editPriority : newPriority;
    const setPriority = isEdit ? setEditPriority : setNewPriority;
    const tags = isEdit ? editTags : newTags;
    const tagInput = isEdit ? editTagInput : newTagInput;
    const setTagInput = isEdit ? setEditTagInput : setNewTagInput;
    const projectId = isEdit ? editProjectId : newProjectId;
    const setProjectId = isEdit ? setEditProjectId : setNewProjectId;

    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor={isEdit ? "editContent" : "newContent"}>Idea</Label>
          <Textarea
            id={isEdit ? "editContent" : "newContent"}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            placeholder="What's your idea?"
            className="resize-none"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Category</Label>
            {(isEdit ? showInlineEditCategory : showInlineAddCategory) ? (
              <div className="space-y-2 p-3 border rounded-md bg-muted/30">
                <Input
                  placeholder="Category name"
                  value={isEdit ? inlineEditCategoryName : inlineAddCategoryName}
                  onChange={(e) => isEdit ? setInlineEditCategoryName(e.target.value) : setInlineAddCategoryName(e.target.value)}
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Color:</Label>
                  <input
                    type="color"
                    value={isEdit ? inlineEditCategoryColor : inlineAddCategoryColor}
                    onChange={(e) => isEdit ? setInlineEditCategoryColor(e.target.value) : setInlineAddCategoryColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border-0"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleInlineCategoryCreate(isEdit)}
                    disabled={actionLoading || !(isEdit ? inlineEditCategoryName : inlineAddCategoryName).trim()}
                  >
                    Create
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (isEdit) {
                        setShowInlineEditCategory(false);
                        setInlineEditCategoryName('');
                      } else {
                        setShowInlineAddCategory(false);
                        setInlineAddCategoryName('');
                      }
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Select value={categoryId || "uncategorized"} onValueChange={(val) => {
                if (val === "__create_new__") {
                  if (isEdit) {
                    setShowInlineEditCategory(true);
                  } else {
                    setShowInlineAddCategory(true);
                  }
                } else {
                  setCategoryId(val === "uncategorized" ? "" : val);
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uncategorized">No category</SelectItem>
                  {categories.filter(cat => cat.id).map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                  <SelectItem value="__create_new__">
                    <div className="flex items-center gap-2 text-primary">
                      <Plus className="h-3 w-3" />
                      Create new category
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          
          <div>
            <Label>Priority</Label>
            <Select value={priority || "none"} onValueChange={(val) => setPriority(val === "none" ? "" : val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No priority</SelectItem>
                {PRIORITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", opt.color)} />
                      {opt.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>Project</Label>
          <Select value={projectId || "none"} onValueChange={(val) => setProjectId(val === "none" ? "" : val)}>
            <SelectTrigger>
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No project</SelectItem>
              {projects.filter(p => !p.is_template).map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color || 'hsl(var(--primary))' }} />
                    {project.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Tags</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                <Hash className="h-3 w-3" />
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag, isEdit)}
                  className="ml-1 hover:bg-destructive/20 rounded-full"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag(isEdit);
                }
              }}
              placeholder="Add a tag..."
              className="flex-1"
            />
            <Button type="button" variant="outline" size="sm" onClick={() => handleAddTag(isEdit)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

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
          <div className="flex gap-2">
            <Button onClick={() => setAddModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Idea
            </Button>
            <Button onClick={() => setManageCategoriesOpen(true)} variant="outline">
              Manage Categories
            </Button>
          </div>
        </div>

        {/* Filter & Sort Bar */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="categoryFilter">Category:</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {categories.filter(cat => cat.id).map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      {cat.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Label>Priority:</Label>
            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {PRIORITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", opt.color)} />
                      {opt.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Label>Project:</Label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {projects.filter(p => !p.is_template).map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color || 'hsl(var(--primary))' }} />
                      {project.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button variant="outline" size="sm" onClick={toggleSortOrder}>
            <ArrowUpDown className="h-4 w-4 mr-2" />
            {sortOrder === 'newest' ? 'Newest first' : 'Oldest first'}
          </Button>
        </div>

        {/* Ideas Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredIdeas.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Zap className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No ideas yet — click "Add Idea" to get started!
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredIdeas.map((idea) => {
              const category = getCategoryById(idea.category_id);
              const project = getProjectById(idea.project_id);
              const priorityOpt = getPriorityOption(idea.priority);
              const isHighlighted = highlightIdeaId === idea.id;
              
              return (
                <Card
                  key={idea.id}
                  ref={isHighlighted ? highlightedRef : undefined}
                  className={cn(
                    "relative transition-all",
                    isHighlighted && "ring-2 ring-primary ring-offset-2 animate-pulse"
                  )}
                  style={{
                    borderLeft: category ? `4px solid ${category.color}` : undefined,
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap gap-1">
                          {category && (
                            <div
                              className="inline-block px-2 py-0.5 rounded text-xs"
                              style={{
                                backgroundColor: `${category.color}20`,
                                color: category.color,
                              }}
                            >
                              {category.name}
                            </div>
                          )}
                          {priorityOpt && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Clock className="h-3 w-3" />
                              {priorityOpt.label}
                            </Badge>
                          )}
                          {project && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <FolderKanban className="h-3 w-3" />
                              {project.name}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{idea.content}</p>
                        {idea.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {idea.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        )}
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
        
        {/* Pagination Info */}
        <PaginationInfo
          shownCount={filteredIdeas.length}
          totalCount={totalCount}
          hasMore={hasMore}
          isLoadingMore={loadingMore}
          onLoadMore={handleLoadMore}
          itemLabel="ideas"
        />
      </div>

      {/* Add Idea Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Idea</DialogTitle>
          </DialogHeader>
          <IdeaFormFields isEdit={false} />
          <Button onClick={handleAddIdea} disabled={actionLoading || !newContent.trim()} className="w-full">
            {actionLoading ? 'Adding...' : 'Add Idea'}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Edit Idea Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Idea</DialogTitle>
          </DialogHeader>
          <IdeaFormFields isEdit={true} />
          <Button onClick={handleSaveEdit} disabled={actionLoading} className="w-full">
            {actionLoading ? 'Saving...' : 'Save Changes'}
          </Button>
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
