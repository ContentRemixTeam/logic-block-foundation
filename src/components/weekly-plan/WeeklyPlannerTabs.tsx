import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface WeeklyPlannerTabsProps {
  activeTab: 'planner' | 'worksheet';
  onTabChange: (tab: 'planner' | 'worksheet') => void;
}

export function WeeklyPlannerTabs({ activeTab, onTabChange }: WeeklyPlannerTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as 'planner' | 'worksheet')} className="w-full">
      <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto bg-muted/50 p-1 rounded-lg">
        <TabsTrigger 
          value="planner" 
          className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
        >
          Task Planner
        </TabsTrigger>
        <TabsTrigger 
          value="worksheet"
          className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
        >
          Planning Worksheet
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
