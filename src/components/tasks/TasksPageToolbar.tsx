import { memo, useCallback, useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  LayoutList, Columns, Calendar as CalendarIcon, Search, X, SlidersHorizontal,
  FolderKanban, Rocket, Zap, Battery, BatteryLow,
} from 'lucide-react';
import { PrimaryTab, ViewMode, EnergyLevel, ENERGY_LEVELS } from './types';

interface Project {
  id: string;
  name: string;
  color: string;
  is_launch?: boolean;
}

interface Launch {
  id: string;
  name: string;
}

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
    projectIds: string[];
    launchIds: string[];
  };
  onFiltersChange: (filters: TasksPageToolbarProps['filters']) => void;
  counts: {
    today: number;
    week: number;
    unscheduled?: number;
    projects?: number;
    all: number;
    completed: number;
  };
  projects?: Project[];
  launches?: Launch[];
}

const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const TABS: { value: PrimaryTab; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Week' },
  { value: 'all', label: 'All' },
  { value: 'completed', label: 'Completed' },
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
  projects = [],
  launches = [],
}: TasksPageToolbarProps) {
  const [searchOpen, setSearchOpen] = useState(!!searchQuery);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const activeFilterCount =
    filters.priority.length +
    filters.energy.length +
    filters.tags.length +
    filters.projectIds.length +
    filters.launchIds.length +
    (filters.cycle !== 'all' ? 1 : 0);

  const handleClearAllFilters = useCallback(() => {
    onFiltersChange({
      priority: [],
      tags: [],
      cycle: 'all',
      energy: [],
      projectIds: [],
      launchIds: [],
    });
  }, [onFiltersChange]);

  const togglePriority = (p: string) => {
    onFiltersChange({
      ...filters,
      priority: filters.priority.includes(p) ? filters.priority.filter(x => x !== p) : [...filters.priority, p],
    });
  };
  const toggleEnergy = (e: EnergyLevel) => {
    onFiltersChange({
      ...filters,
      energy: filters.energy.includes(e) ? filters.energy.filter(x => x !== e) : [...filters.energy, e],
    });
  };
  const toggleProject = (id: string) => {
    onFiltersChange({
      ...filters,
      projectIds: filters.projectIds.includes(id) ? filters.projectIds.filter(x => x !== id) : [...filters.projectIds, id],
    });
  };
  const toggleLaunch = (id: string) => {
    onFiltersChange({
      ...filters,
      launchIds: filters.launchIds.includes(id) ? filters.launchIds.filter(x => x !== id) : [...filters.launchIds, id],
    });
  };

  const regularProjects = projects.filter(p => !p.is_launch);

  const energyIcon = (e: EnergyLevel) => {
    switch (e) {
      case 'high_focus': return <Zap className="h-3 w-3" />;
      case 'medium': return <Battery className="h-3 w-3" />;
      case 'low_energy': return <BatteryLow className="h-3 w-3" />;
    }
  };

  const tabCount = (tab: PrimaryTab) => {
    if (tab === 'today') return counts.today;
    if (tab === 'week') return counts.week;
    if (tab === 'all') return counts.all;
    if (tab === 'completed') return counts.completed;
    return 0;
  };

  return (
    <div className="space-y-3">
      {/* Row 1: Tab pills + right cluster */}
      <div className="flex items-center justify-between gap-3">
        {/* Ghost tab pills with active underline */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {TABS.map(tab => {
            const isActive = activeTab === tab.value;
            const count = tabCount(tab.value);
            return (
              <button
                key={tab.value}
                onClick={() => onTabChange(tab.value)}
                className={cn(
                  "relative px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="flex items-center gap-1.5">
                  {tab.label}
                  {count > 0 && (
                    <span className={cn(
                      "text-[11px] tabular-nums",
                      isActive ? "text-muted-foreground" : "text-muted-foreground/60"
                    )}>
                      {count}
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "absolute left-2 right-2 -bottom-px h-[2px] rounded-full transition-all",
                    isActive ? "bg-foreground" : "bg-transparent"
                  )}
                />
              </button>
            );
          })}
        </div>

        {/* Right cluster: low-energy chip, search, filters, view */}
        <div className="flex items-center gap-1.5">
          {/* Low-energy quick toggle */}
          <button
            type="button"
            onClick={() => toggleEnergy('low_energy')}
            aria-pressed={filters.energy.includes('low_energy')}
            className={cn(
              "hidden sm:inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors",
              filters.energy.includes('low_energy')
                ? "bg-foreground text-background border-foreground"
                : "border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
            title="Show low-energy tasks"
          >
            <BatteryLow className="h-3.5 w-3.5" />
            Low energy
          </button>
          {/* Expanding search */}
          <div className="flex items-center">
            {searchOpen ? (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  ref={searchRef}
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onBlur={() => { if (!searchQuery) setSearchOpen(false); }}
                  placeholder="Search tasks, projects, tags…"
                  className="h-8 w-44 sm:w-64 pl-8 pr-7 text-sm rounded-full border-muted bg-muted/40 focus-visible:bg-background"
                />
                {searchQuery && (
                  <button
                    onClick={() => { onSearchChange(''); searchRef.current?.focus(); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                onClick={() => setSearchOpen(true)}
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Combined filter popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                aria-label="Filters"
              >
                <SlidersHorizontal className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <ScrollArea className="max-h-[70vh]">
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Filters</h4>
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
                    <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Priority
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {PRIORITY_OPTIONS.map(p => (
                        <Badge
                          key={p.value}
                          variant="outline"
                          className={cn(
                            "cursor-pointer rounded-full transition-colors",
                            filters.priority.includes(p.value) && "bg-foreground text-background border-foreground"
                          )}
                          onClick={() => togglePriority(p.value)}
                        >
                          {p.label}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Energy */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Energy
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {ENERGY_LEVELS.map(e => (
                        <Badge
                          key={e.value}
                          variant="outline"
                          className={cn(
                            "cursor-pointer rounded-full gap-1.5 transition-colors",
                            filters.energy.includes(e.value as EnergyLevel) && "bg-foreground text-background border-foreground"
                          )}
                          onClick={() => toggleEnergy(e.value as EnergyLevel)}
                        >
                          {energyIcon(e.value as EnergyLevel)}
                          {e.label}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Projects */}
                  {regularProjects.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <FolderKanban className="h-3 w-3" />
                        Project
                      </label>
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                        {regularProjects.map(project => (
                          <Badge
                            key={project.id}
                            variant="outline"
                            className={cn(
                              "cursor-pointer rounded-full gap-1.5 transition-colors",
                              filters.projectIds.includes(project.id) && "bg-accent border-accent-foreground/20"
                            )}
                            onClick={() => toggleProject(project.id)}
                          >
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                            <span className="truncate max-w-[120px]">{project.name}</span>
                          </Badge>
                        ))}
                        <Badge
                          variant="outline"
                          className={cn(
                            "cursor-pointer rounded-full transition-colors",
                            filters.projectIds.includes('no_project') && "bg-accent border-accent-foreground/20"
                          )}
                          onClick={() => toggleProject('no_project')}
                        >
                          No project
                        </Badge>
                      </div>
                    </div>
                  )}

                  {/* Launches */}
                  {launches.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Rocket className="h-3 w-3" />
                        Launch
                      </label>
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                        {launches.map(launch => (
                          <Badge
                            key={launch.id}
                            variant="outline"
                            className={cn(
                              "cursor-pointer rounded-full gap-1.5 transition-colors",
                              filters.launchIds.includes(launch.id) && "bg-accent border-accent-foreground/20"
                            )}
                            onClick={() => toggleLaunch(launch.id)}
                          >
                            <Rocket className="h-3 w-3" />
                            <span className="truncate max-w-[120px]">{launch.name}</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>

          {/* Segmented view switcher (hidden on mobile) */}
          <div className="hidden sm:flex items-center bg-muted/60 rounded-full p-0.5">
            <button
              onClick={() => onViewModeChange('list')}
              className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center transition-colors",
                viewMode === 'list' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
              aria-label="List view"
            >
              <LayoutList className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onViewModeChange('board')}
              className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center transition-colors",
                viewMode === 'board' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
              aria-label="Board view"
            >
              <Columns className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onViewModeChange('calendar')}
              className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center transition-colors",
                viewMode === 'calendar' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
              aria-label="Calendar view"
            >
              <CalendarIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Thin divider line under tabs */}
      <div className="h-px bg-border/60" />
    </div>
  );
});
