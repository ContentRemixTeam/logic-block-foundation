import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, Filter, ArrowUpDown, Columns, Plus, FolderPlus, X, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface BoardToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: Record<string, any>;
  onFiltersChange: (filters: Record<string, any>) => void;
  sortConfig: { field: string; direction: 'asc' | 'desc' } | null;
  onSortChange: (config: { field: string; direction: 'asc' | 'desc' } | null) => void;
  onOpenColumnCustomizer: () => void;
  onAddTask: () => void;
  onAddGroup: () => void;
}

const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const SORT_OPTIONS = [
  { field: 'scheduled_date', label: 'Due Date' },
  { field: 'priority', label: 'Priority' },
  { field: 'created_at', label: 'Created' },
  { field: 'task_text', label: 'Name' },
];

export function BoardToolbar({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  sortConfig,
  onSortChange,
  onOpenColumnCustomizer,
  onAddTask,
  onAddGroup,
}: BoardToolbarProps) {
  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  const clearFilter = (key: string) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onFiltersChange(newFilters);
  };

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-3 flex items-center gap-3 flex-wrap">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filter
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>Priority</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {/* Show All option */}
          <DropdownMenuItem
            onClick={() => onFiltersChange({})}
            className={cn(
              "gap-2",
              !filters.priority && "bg-accent"
            )}
          >
            <Check className={cn(
              "h-4 w-4",
              !filters.priority ? "opacity-100" : "opacity-0"
            )} />
            All Priorities
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {PRIORITY_OPTIONS.map(option => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onFiltersChange({ ...filters, priority: option.value })}
              className={cn(
                "gap-2",
                filters.priority === option.value && "bg-accent"
              )}
            >
              <Check className={cn(
                "h-4 w-4",
                filters.priority === option.value ? "opacity-100" : "opacity-0"
              )} />
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Active filters badges */}
      {filters.priority && (
        <Badge variant="secondary" className="gap-1 cursor-pointer hover:bg-destructive/20 transition-colors" onClick={() => clearFilter('priority')}>
          Priority: {filters.priority}
          <X className="h-3 w-3" />
        </Badge>
      )}

      {/* Sort */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowUpDown className="h-4 w-4" />
            Sort
            {sortConfig && (
              <span className="text-muted-foreground">
                ({SORT_OPTIONS.find(o => o.field === sortConfig.field)?.label})
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {SORT_OPTIONS.map(option => (
            <DropdownMenuItem
              key={option.field}
              onClick={() => {
                if (sortConfig?.field === option.field) {
                  onSortChange({
                    field: option.field,
                    direction: sortConfig.direction === 'asc' ? 'desc' : 'asc',
                  });
                } else {
                  onSortChange({ field: option.field, direction: 'asc' });
                }
              }}
            >
              {option.label}
              {sortConfig?.field === option.field && (
                <span className="ml-auto text-xs">
                  {sortConfig.direction === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </DropdownMenuItem>
          ))}
          {sortConfig && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onSortChange(null)}>
                Clear sort
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Customize Columns */}
      <Button variant="outline" size="sm" className="gap-2" onClick={onOpenColumnCustomizer}>
        <Columns className="h-4 w-4" />
        Columns
      </Button>

      <div className="flex-1" />

      {/* Add Group */}
      <Button variant="outline" size="sm" className="gap-2" onClick={onAddGroup}>
        <FolderPlus className="h-4 w-4" />
        Add Group
      </Button>

      {/* New Task */}
      <Button size="sm" className="gap-2" onClick={onAddTask}>
        <Plus className="h-4 w-4" />
        New Task
      </Button>
    </div>
  );
}
