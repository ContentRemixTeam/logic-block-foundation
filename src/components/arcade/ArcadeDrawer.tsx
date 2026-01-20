import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatsTab } from './tabs/StatsTab';
import { PetGrowthCard } from './PetGrowthCard';
import { CheckSquare, BarChart3, Sparkles } from 'lucide-react';

interface ArcadeDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: string;
}

export function ArcadeDrawer({ open, onOpenChange, defaultTab = 'tasks' }: ArcadeDrawerProps) {
  // Map old tab names to new ones for backwards compatibility
  const normalizedTab = defaultTab === 'focus' ? 'tasks' : defaultTab;
  
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Daily Tasks & Rewards
          </DrawerTitle>
        </DrawerHeader>
        
        <div className="px-4 pb-6 overflow-y-auto">
          <Tabs defaultValue={normalizedTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tasks" className="flex items-center gap-1.5">
                <CheckSquare className="h-4 w-4" />
                <span>Tasks</span>
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4" />
                <span>Progress</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="tasks" className="mt-4">
              <PetGrowthCard />
            </TabsContent>
            
            <TabsContent value="stats" className="mt-4">
              <StatsTab />
            </TabsContent>
          </Tabs>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
