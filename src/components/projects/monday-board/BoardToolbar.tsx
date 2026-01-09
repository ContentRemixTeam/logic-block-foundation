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
import { Search, Filter, ArrowUpDown, Columns, Plus, FolderPlus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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

const STATUS_OPTIONS = [
  { value: 'focus', label: 'Focus' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'backlog', label: 'Backlog' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'someday', label: 'Someday' },
];

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
          <DropdownMenuLabel>Status</DropdownMenuLabel>
          {STATUS_OPTIONS.map(option => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onFiltersChange({ ...filters, status: option.value })}
              className={filters.status === option.value ? 'bg-accent' : ''}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Priority</DropdownMenuLabel>
          {PRIORITY_OPTIONS.map(option => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onFiltersChange({ ...filters, priority: option.value })}
              className={filters.priority === option.value ? 'bg-accent' : ''}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
          {activeFiltersCount > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onFiltersChange({})}>
                Clear all filters
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Active filters badges */}
      {filters.status && (
        <Badge variant="secondary" className="gap-1">
          Status: {filters.status}
          <X className="h-3 w-3 cursor-pointer" onClick={() => clearFilter('status')} />
        </Badge>
      )}
      {filters.priority && (
        <Badge variant="secondary" className="gap-1">
          Priority: {filters.priority}
          <X className="h-3 w-3 cursor-pointer" onClick={() => clearFilter('priority')} />
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
