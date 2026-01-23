import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Search, FileText, Mail, Video, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { LaunchWizardData } from '@/types/launch';
import { Skeleton } from '@/components/ui/skeleton';

interface ContentItem {
  id: string;
  title: string;
  type: string;
  channel: string | null;
  created_at: string;
}

interface LaunchContentReuseProps {
  data: LaunchWizardData;
  onChange: (updates: Partial<LaunchWizardData>) => void;
}

export function LaunchContentReuse({ data, onChange }: LaunchContentReuseProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    setIsLoading(true);
    const { data: items } = await supabase
      .from('content_items')
      .select('id, title, type, channel, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    
    setContentItems(items || []);
    setIsLoading(false);
  };

  const filteredContent = contentItems.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || item.type === filterType;
    return matchesSearch && matchesType;
  });

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

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">What Content Can You Reuse?</h3>
        <p className="text-muted-foreground">
          Before you go creating all new launch content, let's see what you've already got.
        </p>
      </div>

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
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
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
          filteredContent.map((item) => {
            const isSelected = data.selectedContentIds.includes(item.id);
            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                }`}
                onClick={() => toggleContent(item.id)}
              >
                <Checkbox checked={isSelected} className="pointer-events-none" />
                <div className="flex items-center gap-2 text-muted-foreground">
                  {getIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {item.type}
                    </Badge>
                    {item.channel && (
                      <Badge variant="secondary" className="text-xs">
                        {item.channel}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

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
