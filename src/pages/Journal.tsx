import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, isToday } from 'date-fns';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { 
  CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  BookOpen, 
  Copy, 
  CheckCircle2,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface JournalEntry {
  day_id: string;
  date: string;
  scratch_pad_content: string;
  scratch_pad_processed_at: string | null;
  thought: string | null;
  feeling: string | null;
  top_3_today: any;
  created_at: string;
  updated_at: string;
}

export default function Journal() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch journal entries
  const { data, isLoading, refetch } = useQuery({
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
      params.set('limit', '50');

      const response = await supabase.functions.invoke('get-journal-entries', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw response.error;
      return response.data;
    },
  });

  const entries: JournalEntry[] = data?.data || [];
  const datesWithEntries: string[] = data?.datesWithEntries || [];

  // Filter entries based on search
  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const query = searchQuery.toLowerCase();
    return entries.filter(entry => 
      entry.scratch_pad_content?.toLowerCase().includes(query)
    );
  }, [entries, searchQuery]);

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

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BookOpen className="h-8 w-8 text-primary" />
              Journal
            </h1>
            <p className="text-muted-foreground">Review your past scratch pad entries</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/daily-plan">
                <Sparkles className="h-4 w-4 mr-2" />
                Today's Scratch Pad
              </Link>
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search entries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

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
                    <Button variant="outline" className="min-w-[180px] justify-start">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'Select date...'}
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

              {/* Clear filters */}
              {(selectedDate || searchQuery) && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>

            {/* Stats */}
            <div className="flex gap-4 mt-4 text-sm text-muted-foreground">
              <span>{datesWithEntries.length} days with entries</span>
              {searchQuery && <span>• {filteredEntries.length} matches</span>}
            </div>
          </CardContent>
        </Card>

        {/* Entries List */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading journal entries...</div>
        ) : filteredEntries.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              {searchQuery || selectedDate ? (
                <>
                  <h3 className="font-medium mb-2">No entries found</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Try adjusting your search or date filter
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
          <div className="space-y-6">
            {Object.entries(groupedEntries).map(([dateStr, dateEntries]) => (
              <Card key={dateStr} className="overflow-hidden">
                <CardHeader className="bg-muted/30 py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-primary" />
                      {format(parseISO(dateStr), 'EEEE, MMMM d, yyyy')}
                      {isToday(parseISO(dateStr)) && (
                        <Badge variant="secondary" className="ml-2">Today</Badge>
                      )}
                    </CardTitle>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/daily-plan?date=${dateStr}`}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Day
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                {dateEntries.map((entry) => (
                  <CardContent key={entry.day_id} className="py-4 border-t first:border-t-0">
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
                          {entry.scratch_pad_content}
                        </pre>
                      </ScrollArea>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleCopyContent(entry.scratch_pad_content, entry.day_id)}
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

                    {/* Metadata */}
                    <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
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
                  </CardContent>
                ))}
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
