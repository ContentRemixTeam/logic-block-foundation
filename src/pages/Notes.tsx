import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, isToday, subDays } from 'date-fns';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CharacterCounter } from '@/components/ui/character-counter';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { 
  CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Search, 
  BookOpen, 
  Copy, 
  CheckCircle2,
  ExternalLink,
  Sparkles,
  X,
  Hash,
  Plus,
  FileText,
  Trash2,
  Pencil,
  FolderOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useProjects } from '@/hooks/useProjects';
import { PaginationInfo } from '@/components/ui/pagination-info';

const PAGE_SIZE = 50;

interface JournalEntry {
  day_id: string;
  date: string;
  scratch_pad_content: string;
  scratch_pad_title: string | null;
  scratch_pad_processed_at: string | null;
  thought: string | null;
  feeling: string | null;
  top_3_today: any;
  created_at: string;
  updated_at: string;
}

interface JournalPage {
  id: string;
  title: string;
  content: string;
  tags: string[];
  is_archived: boolean;
  project_id: string | null;
  project?: { id: string; name: string; color: string } | null;
  created_at: string;
  updated_at: string;
}

type DateRange = 'all' | '7days' | '30days' | '90days';
type ViewTab = 'entries' | 'pages';

const HASHTAG_FILTERS = ['#task', '#idea', '#thought', '#win', '#offer'];

export default function Notes() {
  const queryClient = useQueryClient();
  const { data: projects = [] } = useProjects();
  const [activeTab, setActiveTab] = useState<ViewTab>('entries');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [hashtagFilter, setHashtagFilter] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  
  // Page editor state
  const [pageModalOpen, setPageModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<JournalPage | null>(null);
  const [pageTitle, setPageTitle] = useState('');
  const [pageContent, setPageContent] = useState('');
  const [pageProjectId, setPageProjectId] = useState<string | null>(null);
  const [pageTags, setPageTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');

  // Fetch journal entries
  const { data, isLoading } = useQuery({
    queryKey: ['journal-entries', selectedDate?.toISOString(), searchQuery],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const params = new URLSearchParams();
      if (selectedDate) {
        params.set('date', format(selectedDate, 'yyyy-MM-dd'));
      }
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }
      params.set('limit', '100');

      const response = await supabase.functions.invoke('get-journal-entries', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw response.error;
      return response.data;
    },
  });

  // Fetch journal pages
  const { data: pagesData, isLoading: pagesLoading } = useQuery({
    queryKey: ['journal-pages', searchQuery, projectFilter, hashtagFilter],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('get-journal-pages', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    enabled: activeTab === 'pages',
  });

  // Save page mutation
  const savePageMutation = useMutation({
    mutationFn: async (pageData: { 
      id?: string; 
      title: string; 
      content: string;
      tags?: string[];
      project_id?: string | null;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('save-journal-page', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: pageData,
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-pages'] });
      toast.success(editingPage ? 'Page updated' : 'Page created');
      closePageModal();
    },
    onError: (error) => {
      toast.error('Failed to save page');
      console.error(error);
    },
  });

  // Delete page mutation
  const deletePageMutation = useMutation({
    mutationFn: async (pageId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('delete-journal-page', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { id: pageId },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-pages'] });
      toast.success('Page deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete page');
      console.error(error);
    },
  });

  const entries: JournalEntry[] = data?.data || [];
  const datesWithEntries: string[] = data?.datesWithEntries || [];
  const pages: JournalPage[] = pagesData?.pages || [];
  const allTags: string[] = pagesData?.allTags || [];
  const pagesTotalCount: number = pagesData?.totalCount || pages.length;
  const pagesHasMore: boolean = pagesData?.hasMore || false;

  // Filter entries based on search, date range, and hashtag
  const filteredEntries = useMemo(() => {
    let result = entries;

    // Filter by date range
    if (dateRange !== 'all') {
      const daysMap = { '7days': 7, '30days': 30, '90days': 90 };
      const cutoffDate = subDays(new Date(), daysMap[dateRange]);
      result = result.filter(entry => parseISO(entry.date) >= cutoffDate);
    }

    // Filter by hashtag
    if (hashtagFilter) {
      result = result.filter(entry => 
        entry.scratch_pad_content?.toLowerCase().includes(hashtagFilter.toLowerCase())
      );
    }

    // Filter by search query (in both title and content)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(entry => 
        entry.scratch_pad_content?.toLowerCase().includes(query) ||
        entry.scratch_pad_title?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [entries, searchQuery, dateRange, hashtagFilter]);

  // Filter pages based on search, project, and hashtag
  const { filteredPages, totalPagesCount } = useMemo(() => {
    let result = pages;
    const totalBeforeSearch = pages.length;

    // Filter by project
    if (projectFilter) {
      result = result.filter(page => page.project_id === projectFilter);
    }

    // Filter by hashtag
    if (hashtagFilter && activeTab === 'pages') {
      result = result.filter(page => {
        const pageTags = Array.isArray(page.tags) ? page.tags : [];
        return pageTags.some(t => t.toLowerCase().includes(hashtagFilter.toLowerCase()));
      });
    }

    // Filter by search query (includes title, content, and tags)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(page => {
        const matchesTitle = page.title?.toLowerCase().includes(query);
        const matchesContent = page.content?.toLowerCase().includes(query);
        const pageTags = Array.isArray(page.tags) ? page.tags : [];
        const matchesTags = pageTags.some(t => t.toLowerCase().includes(query));
        return matchesTitle || matchesContent || matchesTags;
      });
    }

    return { filteredPages: result, totalPagesCount: totalBeforeSearch };
  }, [pages, searchQuery, projectFilter, hashtagFilter, activeTab]);

  // Get filtered entries count for display
  const totalEntriesCount = entries.length;

  // Group entries by date for display
  const groupedEntries = useMemo(() => {
    const groups: Record<string, JournalEntry[]> = {};
    filteredEntries.forEach(entry => {
      const dateKey = entry.date;
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(entry);
    });
    return groups;
  }, [filteredEntries]);

  // Highlight search terms in text
  const highlightText = (text: string, searchTerm: string): React.ReactNode => {
    if (!searchTerm.trim()) return text;
    
    const parts = text.split(new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === searchTerm.toLowerCase() ? (
        <mark key={i} className="bg-primary/30 text-foreground rounded px-0.5">{part}</mark>
      ) : part
    );
  };

  // Get preview of content with search highlight
  const getPreview = (content: string, maxLength: number = 150): string => {
    if (!content) return '';
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  // Count matches in content
  const countMatches = (content: string, searchTerm: string): number => {
    if (!searchTerm.trim() || !content) return 0;
    const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    return (content.match(regex) || []).length;
  };

  const handleCopyContent = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    if (!selectedDate) return;
    
    const currentIndex = datesWithEntries.findIndex(d => d === format(selectedDate, 'yyyy-MM-dd'));
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'prev' ? currentIndex + 1 : currentIndex - 1;
    if (newIndex >= 0 && newIndex < datesWithEntries.length) {
      setSelectedDate(parseISO(datesWithEntries[newIndex]));
    }
  };

  const clearFilters = () => {
    setSelectedDate(undefined);
    setSearchQuery('');
    setDateRange('all');
    setHashtagFilter(null);
    setProjectFilter(null);
  };

  const toggleEntry = (id: string) => {
    setExpandedEntries(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const openNewPageModal = () => {
    setEditingPage(null);
    setPageTitle('');
    setPageContent('');
    setPageProjectId(null);
    setPageTags([]);
    setNewTagInput('');
    setPageModalOpen(true);
  };

  const openEditPageModal = (page: JournalPage) => {
    setEditingPage(page);
    setPageTitle(page.title);
    setPageContent(page.content);
    setPageProjectId(page.project_id);
    setPageTags(Array.isArray(page.tags) ? page.tags : []);
    setNewTagInput('');
    setPageModalOpen(true);
  };

  const closePageModal = () => {
    setPageModalOpen(false);
    setEditingPage(null);
    setPageTitle('');
    setPageContent('');
    setPageProjectId(null);
    setPageTags([]);
    setNewTagInput('');
  };

  const handleAddTag = () => {
    const tag = newTagInput.trim().toLowerCase();
    if (tag && !pageTags.includes(tag)) {
      const formattedTag = tag.startsWith('#') ? tag : `#${tag}`;
      setPageTags([...pageTags, formattedTag]);
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setPageTags(pageTags.filter(t => t !== tagToRemove));
  };

  const handleSavePage = () => {
    if (!pageTitle.trim() && !pageContent.trim()) {
      toast.error('Please add a title or content');
      return;
    }
    savePageMutation.mutate({
      id: editingPage?.id,
      title: pageTitle.trim() || 'Untitled Page',
      content: pageContent,
      tags: pageTags,
      project_id: pageProjectId,
    });
  };

  // Highlight dates with entries in calendar
  const modifiers = {
    hasEntry: datesWithEntries.map(d => parseISO(d)),
  };

  const modifiersStyles = {
    hasEntry: {
      backgroundColor: 'hsl(var(--primary) / 0.15)',
      borderRadius: '50%',
    },
  };

  const hasActiveFilters = selectedDate || searchQuery || dateRange !== 'all' || hashtagFilter || projectFilter;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BookOpen className="h-8 w-8 text-primary" />
              Notes
            </h1>
            <p className="text-muted-foreground">Review your entries and brainstorm ideas</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={openNewPageModal}>
              <Plus className="h-4 w-4 mr-2" />
              New Page
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/daily-plan">
                <Sparkles className="h-4 w-4 mr-2" />
                Today's Scratch Pad
              </Link>
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ViewTab)}>
          <TabsList className="grid w-full grid-cols-2 max-w-[300px]">
            <TabsTrigger value="entries" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Daily Entries
            </TabsTrigger>
            <TabsTrigger value="pages" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Pages
            </TabsTrigger>
          </TabsList>

          {/* Search - shared between tabs */}
          <Card className="mt-4">
            <CardContent className="py-4 space-y-4">
              <div className="flex flex-wrap gap-4 items-center">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={activeTab === 'entries' ? "Search entries..." : "Search pages, content, or tags..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-9"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setSearchQuery('')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                {/* Search results count */}
                {searchQuery && (
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {activeTab === 'entries' 
                      ? `${filteredEntries.length} of ${totalEntriesCount} entries`
                      : `${filteredPages.length} of ${totalPagesCount} pages`
                    }
                  </span>
                )}

                {/* Date Range Filter - only for entries */}
                {activeTab === 'entries' && (
                  <>
                    <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="7days">Last 7 Days</SelectItem>
                        <SelectItem value="30days">Last 30 Days</SelectItem>
                        <SelectItem value="90days">Last 90 Days</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Date Navigation */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigateDate('prev')}
                        disabled={!selectedDate || datesWithEntries.indexOf(format(selectedDate, 'yyyy-MM-dd')) === datesWithEntries.length - 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="min-w-[160px] justify-start">
                            <CalendarIcon className="h-4 w-4 mr-2" />
                            {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'Pick date...'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            modifiers={modifiers}
                            modifiersStyles={modifiersStyles}
                          />
                        </PopoverContent>
                      </Popover>

                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigateDate('next')}
                        disabled={!selectedDate || datesWithEntries.indexOf(format(selectedDate, 'yyyy-MM-dd')) === 0}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}

                {/* Project Filter - only for pages */}
                {activeTab === 'pages' && projects.length > 0 && (
                  <Select 
                    value={projectFilter || 'all'} 
                    onValueChange={(v) => setProjectFilter(v === 'all' ? null : v)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <FolderOpen className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="All Projects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects</SelectItem>
                      {projects.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: project.color || '#6B7280' }}
                            />
                            {project.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Hashtag Filters */}
              <div className="flex flex-wrap gap-2 items-center">
                <Hash className="h-4 w-4 text-muted-foreground" />
                {(activeTab === 'entries' 
                  ? HASHTAG_FILTERS 
                  : [...new Set([...HASHTAG_FILTERS, ...allTags])].sort()
                ).map(tag => (
                  <Badge
                    key={tag}
                    variant={hashtagFilter === tag ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/20 transition-colors"
                    onClick={() => setHashtagFilter(hashtagFilter === tag ? null : tag)}
                  >
                    {tag}
                  </Badge>
                ))}
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto">
                    <X className="h-4 w-4 mr-1" />
                    Clear filters
                  </Button>
                )}
              </div>

              {/* Stats */}
              <div className="flex gap-4 text-sm text-muted-foreground border-t pt-3">
                {activeTab === 'entries' ? (
                  <>
                    <span>{datesWithEntries.length} days with entries</span>
                    <span>• {filteredEntries.length} entries shown</span>
                  </>
                ) : (
                  <span>{filteredPages.length} page{filteredPages.length !== 1 ? 's' : ''}</span>
                )}
                {searchQuery && <span>• Searching for "{searchQuery}"</span>}
              </div>
            </CardContent>
          </Card>

          {/* Daily Entries Tab */}
          <TabsContent value="entries" className="mt-4">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading journal entries...</div>
            ) : filteredEntries.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  {hasActiveFilters ? (
                    <>
                      <h3 className="font-medium mb-2">No entries found</h3>
                      <p className="text-muted-foreground text-sm mb-4">
                        Try adjusting your search or filters
                      </p>
                      <Button variant="outline" onClick={clearFilters}>Clear filters</Button>
                    </>
                  ) : (
                    <>
                      <h3 className="font-medium mb-2">No journal entries yet</h3>
                      <p className="text-muted-foreground text-sm mb-4">
                        Start using the scratch pad in your Daily Plan to build your journal
                      </p>
                      <Button asChild>
                        <Link to="/daily-plan">Go to Daily Plan</Link>
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedEntries).map(([dateStr, dateEntries]) => (
                  <div key={dateStr} className="space-y-3">
                    {dateEntries.map((entry) => {
                      const isExpanded = expandedEntries.has(entry.day_id);
                      const matchCount = searchQuery ? countMatches(entry.scratch_pad_content + ' ' + (entry.scratch_pad_title || ''), searchQuery) : 0;
                      
                      return (
                        <Collapsible key={entry.day_id} open={isExpanded} onOpenChange={() => toggleEntry(entry.day_id)}>
                          <Card className="overflow-hidden">
                            <CollapsibleTrigger asChild>
                              <CardHeader className="bg-muted/30 py-3 cursor-pointer hover:bg-muted/50 transition-colors">
                                <div className="flex items-center justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <CalendarIcon className="h-4 w-4 text-primary shrink-0" />
                                      <CardTitle className="text-base">
                                        {format(parseISO(dateStr), 'EEEE, MMMM d, yyyy')}
                                      </CardTitle>
                                      {isToday(parseISO(dateStr)) && (
                                        <Badge variant="secondary">Today</Badge>
                                      )}
                                    </div>
                                    <p className={cn(
                                      "text-sm truncate",
                                      entry.scratch_pad_title ? "font-medium" : "text-muted-foreground italic"
                                    )}>
                                      {entry.scratch_pad_title || 'Untitled Entry'}
                                    </p>
                                    {!isExpanded && (
                                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                        {searchQuery ? highlightText(getPreview(entry.scratch_pad_content, 100), searchQuery) : getPreview(entry.scratch_pad_content, 100)}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {matchCount > 0 && (
                                      <Badge variant="outline" className="text-xs">
                                        {matchCount} match{matchCount > 1 ? 'es' : ''}
                                      </Badge>
                                    )}
                                    <ChevronDown className={cn(
                                      "h-5 w-5 text-muted-foreground transition-transform",
                                      isExpanded && "rotate-180"
                                    )} />
                                  </div>
                                </div>
                              </CardHeader>
                            </CollapsibleTrigger>

                            <CollapsibleContent>
                              <CardContent className="py-4 border-t">
                                {/* Mindset info if available */}
                                {(entry.thought || entry.feeling) && (
                                  <div className="flex flex-wrap gap-3 mb-3 text-sm">
                                    {entry.thought && (
                                      <Badge variant="outline" className="font-normal">
                                        💭 {entry.thought}
                                      </Badge>
                                    )}
                                    {entry.feeling && (
                                      <Badge variant="outline" className="font-normal">
                                        ✨ {entry.feeling}
                                      </Badge>
                                    )}
                                  </div>
                                )}

                                {/* Scratch pad content */}
                                <div className="relative group">
                                  <ScrollArea className="max-h-[400px]">
                                    <pre className="whitespace-pre-wrap font-mono text-sm bg-muted/30 rounded-lg p-4 border">
                                      {searchQuery ? highlightText(entry.scratch_pad_content, searchQuery) : entry.scratch_pad_content}
                                    </pre>
                                  </ScrollArea>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopyContent(entry.scratch_pad_content, entry.day_id);
                                    }}
                                  >
                                    {copiedId === entry.day_id ? (
                                      <>
                                        <CheckCircle2 className="h-4 w-4 mr-1" />
                                        Copied
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="h-4 w-4 mr-1" />
                                        Copy
                                      </>
                                    )}
                                  </Button>
                                </div>

                                {/* Metadata and actions */}
                                <div className="flex flex-wrap items-center justify-between gap-4 mt-3">
                                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                                    {entry.scratch_pad_processed_at && (
                                      <span className="flex items-center gap-1">
                                        <Sparkles className="h-3 w-3" />
                                        Processed: {format(parseISO(entry.scratch_pad_processed_at), 'MMM d, h:mm a')}
                                      </span>
                                    )}
                                    {entry.updated_at && (
                                      <span>
                                        Last updated: {format(parseISO(entry.updated_at), 'h:mm a')}
                                      </span>
                                    )}
                                  </div>
                                  <Button variant="ghost" size="sm" asChild>
                                    <Link to={`/daily-plan?date=${dateStr}`}>
                                      <ExternalLink className="h-4 w-4 mr-2" />
                                      View Day's Plan
                                    </Link>
                                  </Button>
                                </div>
                              </CardContent>
                            </CollapsibleContent>
                          </Card>
                        </Collapsible>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Pages Tab */}
          <TabsContent value="pages" className="mt-4">
            {pagesLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading pages...</div>
            ) : filteredPages.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  {searchQuery || projectFilter || hashtagFilter ? (
                    <>
                      <h3 className="font-medium mb-2">No pages found</h3>
                      <p className="text-muted-foreground text-sm mb-4">
                        Try adjusting your search or filters
                      </p>
                      <Button variant="outline" onClick={clearFilters}>Clear filters</Button>
                    </>
                  ) : (
                    <>
                      <h3 className="font-medium mb-2">No pages yet</h3>
                      <p className="text-muted-foreground text-sm mb-4">
                        Create a new page to start brainstorming ideas
                      </p>
                      <Button onClick={openNewPageModal}>
                        <Plus className="h-4 w-4 mr-2" />
                        New Page
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredPages.map((page) => (
                  <Card key={page.id} className="group hover:shadow-md transition-shadow">
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div 
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => openEditPageModal(page)}
                        >
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <FileText className="h-4 w-4 text-primary shrink-0" />
                            <h3 className="font-medium truncate">
                              {searchQuery ? highlightText(page.title, searchQuery) : page.title}
                            </h3>
                            {page.project && (
                              <Badge 
                                variant="outline" 
                                className="text-xs"
                                style={{ 
                                  borderColor: page.project.color || undefined,
                                  color: page.project.color || undefined,
                                }}
                              >
                                <FolderOpen className="h-3 w-3 mr-1" />
                                {page.project.name}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {searchQuery ? highlightText(getPreview(page.content, 120), searchQuery) : getPreview(page.content, 120)}
                          </p>
                          {/* Tags */}
                          {Array.isArray(page.tags) && page.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {page.tags.slice(0, 5).map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {page.tags.length > 5 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{page.tags.length - 5} more
                                </Badge>
                              )}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            Updated {format(parseISO(page.updated_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditPageModal(page)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete page?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete "{page.title}". This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deletePageMutation.mutate(page.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {/* Pagination Info */}
            {!pagesLoading && filteredPages.length > 0 && (
              <PaginationInfo
                shownCount={filteredPages.length}
                totalCount={pagesTotalCount}
                hasMore={pagesHasMore}
                isLoadingMore={false}
                onLoadMore={() => {}}
                itemLabel="pages"
              />
            )}
          </TabsContent>
        </Tabs>

        {/* Page Editor Modal */}
        <Dialog open={pageModalOpen} onOpenChange={setPageModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>
                {editingPage ? 'Edit Page' : 'New Page'}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 space-y-4 overflow-y-auto py-4">
              <Input
                placeholder="Page title..."
                value={pageTitle}
                onChange={(e) => setPageTitle(e.target.value)}
                className="text-lg font-medium"
                maxLength={100}
              />
              <CharacterCounter current={pageTitle.length} max={100} className="mt-1" />
              
              {/* Project Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Project
                </label>
                <Select 
                  value={pageProjectId || 'none'} 
                  onValueChange={(v) => setPageProjectId(v === 'none' ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No project</SelectItem>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: project.color || '#6B7280' }}
                          />
                          {project.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {pageTags.map(tag => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a tag (e.g., idea, task, win)..."
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    onClick={handleAddTag}
                    disabled={!newTagInput.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tip: Hashtags in your content (like #idea) are auto-extracted as tags
                </p>
              </div>

              <Textarea
                placeholder="Start writing your ideas... Use #hashtags to tag content automatically."
                value={pageContent}
                onChange={(e) => setPageContent(e.target.value)}
                className="min-h-[250px] resize-none"
                maxLength={10000}
              />
              <CharacterCounter current={pageContent.length} max={10000} className="mt-1" />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={closePageModal}>
                Cancel
              </Button>
              <Button 
                onClick={handleSavePage}
                disabled={savePageMutation.isPending}
              >
                {savePageMutation.isPending ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Saving...
                  </>
                ) : (
                  'Save Page'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}