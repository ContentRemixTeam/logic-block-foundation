import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Settings2,
  RotateCcw,
  Rocket,
  Target,
  Brain,
  ExternalLink,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { useDashboardWidgets, DASHBOARD_WIDGETS, DashboardWidget } from '@/hooks/useDashboardWidgets';

interface DashboardCustomizeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORY_INFO: Record<DashboardWidget['category'], { label: string; icon: React.ReactNode }> = {
  execution: { label: 'Execution', icon: <Rocket className="h-4 w-4" /> },
  strategy: { label: 'Strategy', icon: <Target className="h-4 w-4" /> },
  mindset: { label: 'Mindset', icon: <Brain className="h-4 w-4" /> },
  external: { label: 'External', icon: <ExternalLink className="h-4 w-4" /> },
};

export function DashboardCustomizeModal({ open, onOpenChange }: DashboardCustomizeModalProps) {
  const {
    enabledWidgets,
    toggleWidget,
    resetToDefaults,
    isWidgetEnabled,
    getOrderedWidgets,
    reorderWidgets,
  } = useDashboardWidgets();
  const [activeTab, setActiveTab] = useState<string>('all');

  const categories = Object.keys(CATEGORY_INFO) as DashboardWidget['category'][];

  const orderedMain = getOrderedWidgets('main');
  const orderedSidebar = getOrderedWidgets('sidebar');

  const getList = (): { widget: DashboardWidget; column: 'main' | 'sidebar'; index: number; total: number }[] => {
    const attach = (col: 'main' | 'sidebar', list: DashboardWidget[]) =>
      list.map((w, i) => ({ widget: w, column: col, index: i, total: list.length }));
    if (activeTab === 'main') return attach('main', orderedMain);
    if (activeTab === 'sidebar') return attach('sidebar', orderedSidebar);
    if (activeTab === 'all') return [...attach('main', orderedMain), ...attach('sidebar', orderedSidebar)];
    // Category filter — keep order within each column
    return [
      ...attach('main', orderedMain.filter(w => w.category === activeTab)),
      ...attach('sidebar', orderedSidebar.filter(w => w.category === activeTab)),
    ];
  };

  const enabledCount = Object.values(enabledWidgets).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 sm:p-6 flex flex-col gap-0 sm:gap-4">
        <DialogHeader className="p-4 sm:p-0 border-b sm:border-0">
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Customize your home
          </DialogTitle>
          <DialogDescription>
            Choose which sections show up and the order they appear in. Your home, your call.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between px-4 sm:px-0 py-2 border-b">
          <div className="text-sm text-muted-foreground">
            {enabledCount} of {DASHBOARD_WIDGETS.length} on
          </div>
          <Button variant="ghost" size="sm" onClick={resetToDefaults} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0 px-4 sm:px-0 pt-3">
          <TabsList className="w-full flex-wrap h-auto gap-1 bg-transparent p-0 mb-3 justify-start">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="main">Main</TabsTrigger>
            <TabsTrigger value="sidebar">Sidebar</TabsTrigger>
            {categories.map(cat => (
              <TabsTrigger key={cat} value={cat} className="gap-1">
                {CATEGORY_INFO[cat].icon}
                {CATEGORY_INFO[cat].label}
              </TabsTrigger>
            ))}
          </TabsList>

          <ScrollArea className="flex-1 pr-2">
            <div className="space-y-2 pb-4">
              {getList().map(({ widget, column, index, total }) => {
                const canReorder = activeTab === 'all' || activeTab === 'main' || activeTab === 'sidebar';
                return (
                  <div
                    key={`${column}-${widget.id}`}
                    className="flex items-center gap-2 p-3 rounded-lg border bg-card"
                  >
                    <div className="flex flex-col gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={!canReorder || index === 0}
                        onClick={() => reorderWidgets(column, index, index - 1)}
                        aria-label={`Move ${widget.label} up`}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={!canReorder || index === total - 1}
                        onClick={() => reorderWidgets(column, index, index + 1)}
                        aria-label={`Move ${widget.label} down`}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <Label htmlFor={`widget-${widget.id}`} className="font-medium cursor-pointer">
                          {widget.label}
                        </Label>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {widget.column}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{widget.description}</p>
                    </div>
                    <Switch
                      id={`widget-${widget.id}`}
                      checked={isWidgetEnabled(widget.id)}
                      onCheckedChange={() => toggleWidget(widget.id)}
                    />
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </Tabs>

        <div className="flex justify-end p-4 sm:p-0 sm:pt-4 border-t">
          <Button onClick={() => onOpenChange(false)} className="w-full sm:w-auto min-h-[44px]">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
