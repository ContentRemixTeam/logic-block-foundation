import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Palette, Send } from 'lucide-react';

interface ViewToggleProps {
  view: 'publish' | 'create';
  onViewChange: (view: 'publish' | 'create') => void;
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <Tabs value={view} onValueChange={(v) => onViewChange(v as 'publish' | 'create')}>
      <TabsList className="h-9">
        <TabsTrigger value="publish" className="gap-1.5 text-xs px-3">
          <Send className="h-3.5 w-3.5" />
          Publish
        </TabsTrigger>
        <TabsTrigger value="create" className="gap-1.5 text-xs px-3">
          <Palette className="h-3.5 w-3.5" />
          Create
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
