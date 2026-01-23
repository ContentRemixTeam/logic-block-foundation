import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Filter, FileText, Mail, Video, Mic, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getContentItems, CONTENT_TYPES, ContentItem } from '@/lib/contentService';

interface ContentVaultSearchProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  suggestedKeywords?: string[];
  className?: string;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  email: <Mail className="h-4 w-4" />,
  social: <FileText className="h-4 w-4" />,
  blog: <FileText className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  podcast: <Mic className="h-4 w-4" />,
};

export function ContentVaultSearch({
  selectedIds,
  onSelectionChange,
  suggestedKeywords = [],
  className,
}: ContentVaultSearchProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [content, setContent] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadContent = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await getContentItems({
        types: typeFilter !== 'all' ? [typeFilter as ContentItem['type']] : undefined,
      });
      setContent(items);
    } catch (err) {
      console.error('Error loading content:', err);
    } finally {
      setIsLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const filteredContent = content.filter(item => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      item.title?.toLowerCase().includes(searchLower) ||
      item.body?.toLowerCase().includes(searchLower) ||
      item.tags?.some(tag => tag.toLowerCase().includes(searchLower))
    );
  });

  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(i => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const clearSelection = () => {
    onSelectionChange([]);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search your content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {CONTENT_TYPES.map(type => (
              <SelectItem key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Suggested Keywords */}
      {suggestedKeywords.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">Suggested:</span>
          {suggestedKeywords.map(keyword => (
            <Button
              key={keyword}
              variant="outline"
              size="sm"
              onClick={() => setSearch(keyword)}
              className="h-7 text-xs"
            >
              {keyword}
            </Button>
          ))}
        </div>
      )}

      {/* Selection Summary */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between py-2 px-3 bg-primary/10 rounded-lg">
          <span className="text-sm font-medium">
            {selectedIds.length} item{selectedIds.length !== 1 ? 's' : ''} selected
          </span>
          <Button variant="ghost" size="sm" onClick={clearSelection}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
      )}

      {/* Content Grid */}
      <ScrollArea className="h-[300px]">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : filteredContent.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No content found</p>
              <p className="text-sm">Try a different search or filter</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredContent.map(item => {
              const isSelected = selectedIds.includes(item.id);
              
              return (
                <button
                  key={item.id}
                  onClick={() => toggleSelection(item.id)}
                  className={cn(
                    'w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors',
                    isSelected 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <Checkbox 
                    checked={isSelected}
                    className="mt-0.5 pointer-events-none"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {TYPE_ICONS[item.type] || <FileText className="h-4 w-4" />}
                      </span>
                      <span className="font-medium truncate">{item.title || 'Untitled'}</span>
                    </div>
                    {item.body && (
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                        {item.body}
                      </p>
                    )}
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {item.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{item.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
