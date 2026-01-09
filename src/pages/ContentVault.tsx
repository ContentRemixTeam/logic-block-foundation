import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { 
  ContentTable, 
  ContentCards, 
  ContentEditorModal, 
  SendLog, 
  SubjectLineLibrary, 
  RepurposePanel,
} from '@/components/content';
import { 
  getContentItems, 
  duplicateContentItem,
  deleteContentItem,
  markAsPublished,
  createSendLog,
  ContentItem,
  ContentFilters,
  ContentType,
  ContentStatus,
  ContentChannel,
  CONTENT_TYPES,
  CONTENT_STATUSES,
} from '@/lib/contentService';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useActiveCycle } from '@/hooks/useActiveCycle';
import { 
  Plus, 
  Search, 
  LayoutGrid, 
  Table as TableIcon,
  Library,
  Send,
  Mail,
  Repeat,
  X,
  Loader2
} from 'lucide-react';

type ViewMode = 'table' | 'cards';

export default function ContentVault() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: activeCycle } = useActiveCycle();
  
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  
  // Filters
  const [selectedTypes, setSelectedTypes] = useState<ContentType[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<ContentStatus[]>([]);
  const [filterThisCycle, setFilterThisCycle] = useState(false);

  useEffect(() => {
    if (user) {
      loadItems();
    }
  }, [user, searchQuery, selectedTypes, selectedStatuses, filterThisCycle, activeCycle]);

  const loadItems = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const filters: ContentFilters = {
        search: searchQuery || undefined,
        types: selectedTypes.length > 0 ? selectedTypes : undefined,
        statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
        cycleId: filterThisCycle && activeCycle ? activeCycle.cycle_id : undefined,
      };
      
      const data = await getContentItems(filters);
      setItems(data);
    } catch (error) {
      console.error('Error loading content:', error);
      toast({
        title: 'Error loading content',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setEditorOpen(true);
  };

  const handleEdit = (item: ContentItem) => {
    setEditingItem(item);
    setEditorOpen(true);
  };

  const handleDuplicate = async (id: string) => {
    try {
      await duplicateContentItem(id);
      toast({ title: 'Content duplicated' });
      loadItems();
    } catch (error) {
      console.error('Error duplicating:', error);
      toast({ title: 'Error duplicating', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteContentItem(id);
      toast({ title: 'Content deleted' });
      loadItems();
    } catch (error) {
      console.error('Error deleting content:', error);
      toast({
        title: 'Error deleting content',
        variant: 'destructive',
      });
    }
  };

  const handleMarkPublished = async (id: string) => {
    try {
      await markAsPublished(id);
      toast({ title: 'Marked as published' });
      loadItems();
    } catch (error) {
      console.error('Error marking published:', error);
      toast({ title: 'Error updating', variant: 'destructive' });
    }
  };

  const handleLogSend = async (item: ContentItem) => {
    try {
      await createSendLog({
        content_item_id: item.id,
        channel: item.channel || 'Other',
        type: item.type,
        topic: item.topic,
        cycle_id: activeCycle?.cycle_id,
      });
      toast({ title: 'Logged ✅', description: 'Nurture touch recorded' });
    } catch (error) {
      console.error('Error logging send:', error);
      toast({ title: 'Error logging', variant: 'destructive' });
    }
  };

  const toggleFilter = <T extends string>(
    value: T,
    current: T[],
    setter: (val: T[]) => void
  ) => {
    if (current.includes(value)) {
      setter(current.filter(v => v !== value));
    } else {
      setter([...current, value]);
    }
  };

  const clearFilters = () => {
    setSelectedTypes([]);
    setSelectedStatuses([]);
    setFilterThisCycle(false);
    setSearchQuery('');
  };

  const hasActiveFilters = selectedTypes.length > 0 || selectedStatuses.length > 0 || filterThisCycle || searchQuery;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Content Vault</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Your personal library for emails, posts, reels, and more
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              New Content
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="library" className="space-y-4">
          <TabsList>
            <TabsTrigger value="library" className="gap-2">
              <Library className="h-4 w-4" />
              Library
            </TabsTrigger>
            <TabsTrigger value="send-log" className="gap-2">
              <Send className="h-4 w-4" />
              Send Log
            </TabsTrigger>
            <TabsTrigger value="subject-lines" className="gap-2">
              <Mail className="h-4 w-4" />
              Subject Lines
            </TabsTrigger>
            <TabsTrigger value="repurpose" className="gap-2">
              <Repeat className="h-4 w-4" />
              Repurpose
            </TabsTrigger>
          </TabsList>

          {/* Library Tab */}
          <TabsContent value="library" className="space-y-4">
            {/* View Toggle + Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <ToggleGroup
                type="single"
                value={viewMode}
                onValueChange={(val) => val && setViewMode(val as ViewMode)}
                className="border rounded-lg p-1"
              >
                <ToggleGroupItem value="table" size="sm">
                  <TableIcon className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="cards" size="sm">
                  <LayoutGrid className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>

              <div className="h-6 w-px bg-border" />

              {/* Type Filter */}
              <div className="flex flex-wrap gap-1">
                {CONTENT_TYPES.slice(0, 6).map((type) => (
                  <Badge
                    key={type}
                    variant={selectedTypes.includes(type) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleFilter(type, selectedTypes, setSelectedTypes)}
                  >
                    {type}
                  </Badge>
                ))}
              </div>

              <div className="h-6 w-px bg-border" />

              {/* Status Filter */}
              <div className="flex gap-1">
                {CONTENT_STATUSES.map((status) => (
                  <Badge
                    key={status}
                    variant={selectedStatuses.includes(status) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleFilter(status, selectedStatuses, setSelectedStatuses)}
                  >
                    {status}
                  </Badge>
                ))}
              </div>

              {/* Cycle Filter */}
              {activeCycle && (
                <>
                  <div className="h-6 w-px bg-border" />
                  <Badge
                    variant={filterThisCycle ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setFilterThisCycle(!filterThisCycle)}
                  >
                    This Cycle
                  </Badge>
                </>
              )}

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            {/* Content View */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : viewMode === 'table' ? (
              <ContentTable
                items={items}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onMarkPublished={handleMarkPublished}
                onLogSend={handleLogSend}
              />
            ) : (
              <ContentCards
                items={items}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onMarkPublished={handleMarkPublished}
                onLogSend={handleLogSend}
              />
            )}
          </TabsContent>

          {/* Send Log Tab */}
          <TabsContent value="send-log">
            <SendLog />
          </TabsContent>

          {/* Subject Lines Tab */}
          <TabsContent value="subject-lines">
            <SubjectLineLibrary onDuplicate={handleDuplicate} />
          </TabsContent>

          {/* Repurpose Tab */}
          <TabsContent value="repurpose">
            <RepurposePanel />
          </TabsContent>
        </Tabs>

        {/* Editor Modal */}
        <ContentEditorModal
          open={editorOpen}
          onOpenChange={setEditorOpen}
          item={editingItem}
          cycleId={activeCycle?.cycle_id}
          onSaved={loadItems}
        />

        {/* Help Text */}
        <p className="text-xs text-muted-foreground text-center pt-4">
          Content Vault is your personal library. Send Log is for consistency tracking.
        </p>
      </div>
    </Layout>
  );
}
