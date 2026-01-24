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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Settings2, 
  RotateCcw,
  Rocket,
  Target,
  Brain,
  ExternalLink
} from 'lucide-react';
import { useDashboardWidgets, DASHBOARD_WIDGETS, DashboardWidget } from '@/hooks/useDashboardWidgets';

interface DashboardCustomizeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORY_INFO: Record<DashboardWidget['category'], { label: string; icon: React.ReactNode; description: string }> = {
  execution: { 
    label: 'Execution', 
    icon: <Rocket className="h-4 w-4" />,
    description: 'Daily and weekly task management'
  },
  strategy: { 
    label: 'Strategy', 
    icon: <Target className="h-4 w-4" />,
    description: 'Business planning and metrics'
  },
  mindset: { 
    label: 'Mindset', 
    icon: <Brain className="h-4 w-4" />,
    description: 'Identity, wins, and motivation'
  },
  external: { 
    label: 'External', 
    icon: <ExternalLink className="h-4 w-4" />,
    description: 'Resources and integrations'
  },
};

export function DashboardCustomizeModal({ open, onOpenChange }: DashboardCustomizeModalProps) {
  const { enabledWidgets, toggleWidget, resetToDefaults, isWidgetEnabled } = useDashboardWidgets();
  const [activeTab, setActiveTab] = useState<string>('all');

  const categories = Object.keys(CATEGORY_INFO) as DashboardWidget['category'][];
  
  const getFilteredWidgets = () => {
    if (activeTab === 'all') return DASHBOARD_WIDGETS;
    if (activeTab === 'main' || activeTab === 'sidebar') {
      return DASHBOARD_WIDGETS.filter(w => w.column === activeTab);
    }
    return DASHBOARD_WIDGETS.filter(w => w.category === activeTab);
  };

  const enabledCount = Object.values(enabledWidgets).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Customize Your Dashboard
          </DialogTitle>
          <DialogDescription>
            Choose which widgets to display on your dashboard. Toggle sections on or off based on what's most important to your business.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between py-2 border-b">
          <div className="text-sm text-muted-foreground">
            {enabledCount} of {DASHBOARD_WIDGETS.length} widgets enabled
          </div>
          <Button variant="ghost" size="sm" onClick={resetToDefaults} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset to Defaults
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full flex-wrap h-auto gap-1 bg-transparent p-0 mb-4">
            <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              All
            </TabsTrigger>
            <TabsTrigger value="main" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Main
            </TabsTrigger>
            <TabsTrigger value="sidebar" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Sidebar
            </TabsTrigger>
            {categories.map(cat => (
              <TabsTrigger 
                key={cat} 
                value={cat}
                className="gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {CATEGORY_INFO[cat].icon}
                {CATEGORY_INFO[cat].label}
              </TabsTrigger>
            ))}
          </TabsList>

          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {getFilteredWidgets().map(widget => (
                <div 
                  key={widget.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Label 
                        htmlFor={`widget-${widget.id}`} 
                        className="font-medium cursor-pointer"
                      >
                        {widget.label}
                      </Label>
                      <Badge variant="outline" className="text-xs capitalize">
                        {widget.column}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{widget.description}</p>
                  </div>
                  <Switch
                    id={`widget-${widget.id}`}
                    checked={isWidgetEnabled(widget.id)}
                    onCheckedChange={() => toggleWidget(widget.id)}
                  />
                </div>
              ))}
            </div>
          </ScrollArea>
        </Tabs>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
