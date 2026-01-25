import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Search, FileText, Mail, Video, CheckCircle2, Star, TrendingUp, Eye, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { LaunchWizardData } from '@/types/launch';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ContentItem {
  id: string;
  title: string;
  type: string;
  channel: string | null;
  created_at: string;
  // Performance metrics (available columns)
  open_rate?: number | null;
  views?: number | null;
  likes?: number | null;
  click_rate?: number | null;
}

interface LaunchContentReuseProps {
  data: LaunchWizardData;
  onChange: (updates: Partial<LaunchWizardData>) => void;
}

// Calculate a performance score for sorting
function calculatePerformanceScore(item: ContentItem): number {
  let score = 0;
  if (item.open_rate) score += item.open_rate * 100;
  if (item.views) score += Math.min(item.views / 100, 50);
  if (item.likes) score += Math.min(item.likes / 10, 30);
  if (item.click_rate) score += item.click_rate * 50;
  return score;
}

// Format metric for display
function formatMetric(value: number | null | undefined, type: 'percent' | 'number'): string | null {
  if (value === null || value === undefined) return null;
  if (type === 'percent') return `${Math.round(value * 100)}%`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toString();
}

export function LaunchContentReuse({ data, onChange }: LaunchContentReuseProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [hasAutoSearched, setHasAutoSearched] = useState(false);

  useEffect(() => {
    loadContent();
  }, []);

  // Auto-search when launch name exists and hasn't auto-searched yet
  useEffect(() => {
    if (!hasAutoSearched && data.name && data.name.trim().length > 2 && contentItems.length > 0) {
      setSearchQuery(data.name);
      setHasAutoSearched(true);
    }
  }, [data.name, contentItems, hasAutoSearched]);

  const loadContent = async () => {
    setIsLoading(true);
    const { data: items } = await supabase
      .from('content_items')
      .select('id, title, type, channel, created_at, open_rate, views, likes, click_rate')
      .order('created_at', { ascending: false })
      .limit(100);
    
    setContentItems(items || []);
    setIsLoading(false);
  };

  // Filter and sort content
  const filteredContent = useMemo(() => {
    return contentItems
      .filter((item) => {
        const matchesSearch =
          !searchQuery ||
          item.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === 'all' || item.type === filterType;
        return matchesSearch && matchesType;
      })
      .sort((a, b) => calculatePerformanceScore(b) - calculatePerformanceScore(a));
  }, [contentItems, searchQuery, filterType]);

  // Get recommended content (top 5 by performance)
  const recommendedContent = useMemo(() => {
    const withScores = contentItems
      .map(item => ({ item, score: calculatePerformanceScore(item) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    return withScores;
  }, [contentItems]);

  const toggleContent = (id: string) => {
    const current = data.selectedContentIds || [];
    const updated = current.includes(id)
      ? current.filter((c) => c !== id)
      : [...current, id];
    onChange({ selectedContentIds: updated });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const contentTypes = Array.from(new Set(contentItems.map((c) => c.type)));

  const renderContentItem = (item: ContentItem, isRecommended: boolean = false) => {
    const isSelected = data.selectedContentIds.includes(item.id);
    const openRateFormatted = formatMetric(item.open_rate, 'percent');
    const viewsFormatted = formatMetric(item.views, 'number');
    const likesFormatted = formatMetric(item.likes, 'number');

    return (
      <div
        key={item.id}
        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
          isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
        } ${isRecommended ? 'ring-1 ring-amber-400/50' : ''}`}
        onClick={() => toggleContent(item.id)}
      >
        <Checkbox checked={isSelected} className="pointer-events-none" />
        <div className="flex items-center gap-2 text-muted-foreground">
          {getIcon(item.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{item.title}</p>
            {isRecommended && (
              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <Badge variant="outline" className="text-xs">
              {item.type}
            </Badge>
            {item.channel && (
              <Badge variant="secondary" className="text-xs">
                {item.channel}
              </Badge>
            )}
            {/* Performance metrics */}
            {openRateFormatted && (
              <span className="flex items-center gap-0.5 text-emerald-600">
                <TrendingUp className="h-3 w-3" />
                {openRateFormatted}
              </span>
            )}
            {viewsFormatted && (
              <span className="flex items-center gap-0.5 text-blue-600">
                <Eye className="h-3 w-3" />
                {viewsFormatted}
              </span>
            )}
            {likesFormatted && (
              <span className="flex items-center gap-0.5 text-pink-600">
                <Heart className="h-3 w-3" />
                {likesFormatted}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">What Content Can You Reuse?</h3>
        <p className="text-muted-foreground">
          Before creating all new content, let's see what you've already got that performed well.
        </p>
      </div>

      {/* Recommended Section */}
      {!isLoading && recommendedContent.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" />
            <Label className="font-semibold text-amber-700 dark:text-amber-400">
              Top Performing Content
            </Label>
          </div>
          <div className="space-y-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            {recommendedContent.map(({ item }) => renderContentItem(item, true))}
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your past content..."
            className="pl-9"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 border rounded-md bg-background"
        >
          <option value="all">All types</option>
          {contentTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {/* Selection count */}
      {data.selectedContentIds.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-md">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <span className="font-medium">
            {data.selectedContentIds.length} piece{data.selectedContentIds.length !== 1 ? 's' : ''} selected to repurpose
          </span>
        </div>
      )}

      {/* Content list */}
      <ScrollArea className="h-[350px]">
        <div className="space-y-2 pr-4">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))
          ) : filteredContent.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No content found. That's okay - we'll create new stuff!</p>
            </div>
          ) : (
            filteredContent.map((item) => renderContentItem(item))
          )}
        </div>
      </ScrollArea>

      {/* What to look for */}
      <div className="p-4 bg-muted/50 rounded-lg border">
        <Label className="font-semibold">Search for launch-relevant content:</Label>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc list-inside">
          <li>Emails about this topic or offer</li>
          <li>Social posts about this offer</li>
          <li>Videos where you taught this</li>
          <li>Testimonials from past buyers</li>
          <li>Case studies or results</li>
        </ul>
      </div>
    </div>
  );
}
