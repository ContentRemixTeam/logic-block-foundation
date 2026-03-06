import { useState, useMemo, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/system/LoadingState';
import { ErrorState } from '@/components/system/ErrorState';
import { BrainDumpCreateForm } from '@/components/brain-dump/BrainDumpCreateForm';
import { BrainDumpBoard } from '@/components/brain-dump/BrainDumpBoard';
import { BrainDumpGrid } from '@/components/brain-dump/BrainDumpGrid';
import { PeriodSelector, type PeriodType, getDateRangeForPeriod } from '@/components/financial/PeriodSelector';
import { useBrainDump, CATEGORY_CONFIG, type BrainDumpCategory, type BrainDumpItem } from '@/hooks/useBrainDump';
import { Search, LayoutGrid, Columns3, X, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseISO, isWithinInterval } from 'date-fns';

type ViewMode = 'board' | 'grid';
type FilterCategory = 'all' | BrainDumpCategory;

export default function BrainDump() {
  const { items, isLoading, error, createItem, deleteItem, updateItem, convertCategory } = useBrainDump();

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('brain-dump-view') as ViewMode) || 'board';
  });
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [datePeriod, setDatePeriod] = useState<PeriodType | null>(null);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);

  const setView = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('brain-dump-view', mode);
  }, []);

  const handlePeriodChange = useCallback((period: PeriodType, start: Date, end: Date) => {
    setDatePeriod(period);
    setDateRange({ start, end });
  }, []);

  const clearDateFilter = useCallback(() => {
    setDatePeriod(null);
    setDateRange(null);
  }, []);

  const filteredItems = useMemo(() => {
    let result = items;
    if (filterCategory !== 'all') {
      result = result.filter(i => i.category === filterCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(i => i.text.toLowerCase().includes(q));
    }
    if (dateRange) {
      result = result.filter(i => {
        const d = parseISO(i.created_at);
        return isWithinInterval(d, { start: dateRange.start, end: dateRange.end });
      });
    }
    return result;
  }, [items, filterCategory, search, dateRange]);

  const handleDelete = useCallback((item: BrainDumpItem) => {
    deleteItem.mutate(item);
  }, [deleteItem]);

  const handleUpdate = useCallback((item: BrainDumpItem, newText: string) => {
    updateItem.mutate({ item, newText });
  }, [updateItem]);

  const handleConvert = useCallback((item: BrainDumpItem, newCategory: BrainDumpCategory) => {
    convertCategory.mutate({ item, newCategory });
  }, [convertCategory]);

  const handleCreate = useCallback((text: string, category: BrainDumpCategory) => {
    createItem.mutate({ text, category });
  }, [createItem]);

  const FILTER_BUTTONS: { key: FilterCategory; label: string; emoji?: string }[] = useMemo(() => [
    { key: 'all' as FilterCategory, label: 'All' },
    ...Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => ({
      key: key as FilterCategory,
      label: cfg.label,
      emoji: cfg.emoji,
    })),
  ], []);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: items.length };
    items.forEach(i => {
      counts[i.category] = (counts[i.category] || 0) + 1;
    });
    return counts;
  }, [items]);

  if (error) {
    return (
      <Layout>
        <ErrorState message="Failed to load Brain Dump" />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              Brain Dump
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Capture everything. Categorize later. All notes flow to your planner automatically.
            </p>
          </div>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === 'board' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('board')}
              className="h-8 gap-1.5"
            >
              <Columns3 className="h-4 w-4" />
              <span className="hidden sm:inline">Board</span>
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('grid')}
              className="h-8 gap-1.5"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Grid</span>
            </Button>
          </div>
        </div>

        {/* Create Form */}
        <BrainDumpCreateForm onSubmit={handleCreate} isLoading={createItem.isPending} />

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes..."
              className="pl-9 h-9"
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearch('')}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {FILTER_BUTTONS.map(fb => (
              <Button
                key={fb.key}
                variant={filterCategory === fb.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterCategory(fb.key)}
                className={cn('h-8 text-xs gap-1', filterCategory === fb.key && 'shadow-sm')}
              >
                {fb.emoji && <span>{fb.emoji}</span>}
                {fb.label}
                <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[10px]">
                  {categoryCounts[fb.key] || 0}
                </Badge>
              </Button>
            ))}
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground font-medium">Date range:</span>
          <PeriodSelector
            selectedPeriod={datePeriod || 'month'}
            onPeriodChange={handlePeriodChange}
          />
          {datePeriod && (
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={clearDateFilter}>
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <LoadingState />
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">
              {search || filterCategory !== 'all' ? 'No matching notes' : 'Your brain dump is empty'}
            </p>
            <p className="text-sm mt-1">
              {search || filterCategory !== 'all' ? 'Try a different search or filter' : 'Start capturing your thoughts above!'}
            </p>
          </div>
        ) : viewMode === 'board' ? (
          <BrainDumpBoard
            items={filteredItems}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
            onConvertCategory={handleConvert}
          />
        ) : (
          <BrainDumpGrid
            items={filteredItems}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
          />
        )}
      </div>
    </Layout>
  );
}
