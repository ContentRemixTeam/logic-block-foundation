 import { memo, useCallback } from 'react';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Badge } from '@/components/ui/badge';
 import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
 import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
 import { Separator } from '@/components/ui/separator';
 import { cn } from '@/lib/utils';
 import { 
   Calendar, CalendarDays, List, CheckCircle2, 
   LayoutList, Columns, Search, X, Filter, SlidersHorizontal
 } from 'lucide-react';
 import { PrimaryTab, ViewMode, EnergyLevel, ENERGY_LEVELS } from './types';
 
 interface TasksPageToolbarProps {
   activeTab: PrimaryTab;
   onTabChange: (tab: PrimaryTab) => void;
   viewMode: ViewMode;
   onViewModeChange: (mode: ViewMode) => void;
   searchQuery: string;
   onSearchChange: (query: string) => void;
   filters: {
     priority: string[];
     tags: string[];
     cycle: string;
     energy: EnergyLevel[];
   };
   onFiltersChange: (filters: {
     priority: string[];
     tags: string[];
     cycle: string;
     energy: EnergyLevel[];
   }) => void;
   counts: {
     today: number;
     week: number;
     all: number;
     completed: number;
   };
 }
 
 const PRIORITY_OPTIONS = [
   { value: 'high', label: 'High', color: 'bg-destructive/20 text-destructive border-destructive/30' },
   { value: 'medium', label: 'Medium', color: 'bg-warning/20 text-warning-foreground border-warning/30' },
   { value: 'low', label: 'Low', color: 'bg-muted text-muted-foreground border-muted' },
 ];
 
 export const TasksPageToolbar = memo(function TasksPageToolbar({
   activeTab,
   onTabChange,
   viewMode,
   onViewModeChange,
   searchQuery,
   onSearchChange,
   filters,
   onFiltersChange,
   counts,
 }: TasksPageToolbarProps) {
   const activeFilterCount = 
     filters.priority.length + 
     filters.energy.length + 
     filters.tags.length + 
     (filters.cycle !== 'all' ? 1 : 0);
 
   const handleClearSearch = useCallback(() => {
     onSearchChange('');
   }, [onSearchChange]);
 
   const handleClearAllFilters = useCallback(() => {
     onFiltersChange({
       priority: [],
       tags: [],
       cycle: 'all',
       energy: [],
     });
   }, [onFiltersChange]);
 
   const togglePriority = useCallback((priority: string) => {
     const newPriorities = filters.priority.includes(priority)
       ? filters.priority.filter(p => p !== priority)
       : [...filters.priority, priority];
     onFiltersChange({ ...filters, priority: newPriorities });
   }, [filters, onFiltersChange]);
 
   const toggleEnergy = useCallback((energy: EnergyLevel) => {
     const newEnergy = filters.energy.includes(energy)
       ? filters.energy.filter(e => e !== energy)
       : [...filters.energy, energy];
     onFiltersChange({ ...filters, energy: newEnergy });
   }, [filters, onFiltersChange]);
 
   return (
     <div className="space-y-4">
       {/* Row 1: Primary Tabs + View Switcher */}
       <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
         {/* Primary Tabs */}
         <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as PrimaryTab)}>
           <TabsList className="grid grid-cols-4 w-full sm:w-auto">
             <TabsTrigger value="today" className="gap-1.5 text-xs sm:text-sm">
               <Calendar className="h-3.5 w-3.5 hidden sm:inline" />
               Today
               {counts.today > 0 && (
                 <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                   {counts.today}
                 </Badge>
               )}
             </TabsTrigger>
             <TabsTrigger value="week" className="gap-1.5 text-xs sm:text-sm">
               <CalendarDays className="h-3.5 w-3.5 hidden sm:inline" />
               Week
               {counts.week > 0 && (
                 <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                   {counts.week}
                 </Badge>
               )}
             </TabsTrigger>
             <TabsTrigger value="all" className="gap-1.5 text-xs sm:text-sm">
               <List className="h-3.5 w-3.5 hidden sm:inline" />
               All
               {counts.all > 0 && (
                 <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                   {counts.all}
                 </Badge>
               )}
             </TabsTrigger>
             <TabsTrigger value="completed" className="gap-1.5 text-xs sm:text-sm">
               <CheckCircle2 className="h-3.5 w-3.5 hidden sm:inline" />
               Done
             </TabsTrigger>
           </TabsList>
         </Tabs>
 
         {/* View Switcher */}
         <div className="flex items-center gap-1 border rounded-lg p-1">
           <Button
             variant={viewMode === 'list' ? 'secondary' : 'ghost'}
             size="sm"
             onClick={() => onViewModeChange('list')}
             className="h-8 px-3 gap-1.5"
           >
             <LayoutList className="h-4 w-4" />
             <span className="hidden sm:inline">List</span>
           </Button>
           <Button
             variant={viewMode === 'board' ? 'secondary' : 'ghost'}
             size="sm"
             onClick={() => onViewModeChange('board')}
             className="h-8 px-3 gap-1.5"
           >
             <Columns className="h-4 w-4" />
             <span className="hidden sm:inline">Board</span>
           </Button>
           <Button
             variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
             size="sm"
             onClick={() => onViewModeChange('calendar')}
             className="h-8 px-3 gap-1.5"
           >
             <Calendar className="h-4 w-4" />
             <span className="hidden sm:inline">Calendar</span>
           </Button>
         </div>
       </div>
 
       {/* Row 2: Search + Filters */}
       <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
         {/* Search */}
         <div className="relative flex-1 max-w-md">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
           <Input
             placeholder="Search tasks..."
             value={searchQuery}
             onChange={(e) => onSearchChange(e.target.value)}
             className="pl-9 pr-9"
           />
           {searchQuery && (
             <Button
               variant="ghost"
               size="sm"
               className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
               onClick={handleClearSearch}
             >
               <X className="h-4 w-4" />
             </Button>
           )}
         </div>
 
         {/* Filters Popover */}
         <Popover>
           <PopoverTrigger asChild>
             <Button 
               variant="outline" 
               size="sm" 
               className={cn(
                 "gap-2",
                 activeFilterCount > 0 && "border-primary"
               )}
             >
               <SlidersHorizontal className="h-4 w-4" />
               Filters
               {activeFilterCount > 0 && (
                 <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                   {activeFilterCount}
                 </Badge>
               )}
             </Button>
           </PopoverTrigger>
           <PopoverContent align="end" className="w-72">
             <div className="space-y-4">
               {/* Header with clear */}
               <div className="flex items-center justify-between">
                 <h4 className="font-medium text-sm">Filters</h4>
                 {activeFilterCount > 0 && (
                   <Button
                     variant="ghost"
                     size="sm"
                     onClick={handleClearAllFilters}
                     className="h-7 text-xs text-muted-foreground"
                   >
                     Clear all
                   </Button>
                 )}
               </div>
 
               <Separator />
 
               {/* Priority */}
               <div className="space-y-2">
                 <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                   Priority
                 </label>
                 <div className="flex flex-wrap gap-2">
                   {PRIORITY_OPTIONS.map(priority => (
                     <Badge
                       key={priority.value}
                       variant="outline"
                       className={cn(
                         "cursor-pointer transition-colors",
                         filters.priority.includes(priority.value)
                           ? priority.color
                           : "hover:bg-muted"
                       )}
                       onClick={() => togglePriority(priority.value)}
                     >
                       {priority.label}
                     </Badge>
                   ))}
                 </div>
               </div>
 
               {/* Energy */}
               <div className="space-y-2">
                 <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                   Energy Level
                 </label>
                 <div className="flex flex-wrap gap-2">
                   {ENERGY_LEVELS.map(energy => (
                     <Badge
                       key={energy.value}
                       variant="outline"
                       className={cn(
                         "cursor-pointer transition-colors",
                         filters.energy.includes(energy.value as EnergyLevel)
                           ? energy.bgColor
                           : "hover:bg-muted"
                       )}
                       onClick={() => toggleEnergy(energy.value as EnergyLevel)}
                     >
                       {energy.label}
                     </Badge>
                   ))}
                 </div>
               </div>
             </div>
           </PopoverContent>
         </Popover>
       </div>
     </div>
   );
 });