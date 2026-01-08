import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

export interface TaskFiltersState {
  hideCompleted: boolean;
  status: string;
  priority: string;
  energyLevel: string;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  groupBy: string;
}

interface AdvancedFiltersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: TaskFiltersState;
  onFiltersChange: (filters: TaskFiltersState) => void;
}

export function AdvancedFiltersModal({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
}: AdvancedFiltersModalProps) {
  const [localFilters, setLocalFilters] = useState<TaskFiltersState>(filters);

  const handleApply = () => {
    onFiltersChange(localFilters);
    onOpenChange(false);
  };

  const handleReset = () => {
    const defaultFilters: TaskFiltersState = {
      hideCompleted: false,
      status: 'all',
      priority: 'all',
      energyLevel: 'all',
      sortBy: 'created_at',
      sortDirection: 'desc',
      groupBy: 'none',
    };
    setLocalFilters(defaultFilters);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Advanced Filters</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Quick Toggles */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Quick Toggles</h4>
            <div className="flex items-center justify-between">
              <Label htmlFor="hide-completed">Hide completed tasks</Label>
              <Switch
                id="hide-completed"
                checked={localFilters.hideCompleted}
                onCheckedChange={(checked) => setLocalFilters({ ...localFilters, hideCompleted: checked })}
              />
            </div>
          </div>

          <Separator />

          {/* Detailed Filters */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Filter by</h4>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Status</Label>
                  <Select
                    value={localFilters.status}
                    onValueChange={(value) => setLocalFilters({ ...localFilters, status: value })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="backlog">Backlog</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="waiting">Waiting</SelectItem>
                      <SelectItem value="someday">Someday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Priority</Label>
                  <Select
                    value={localFilters.priority}
                    onValueChange={(value) => setLocalFilters({ ...localFilters, priority: value })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Energy Level</Label>
                <Select
                  value={localFilters.energyLevel}
                  onValueChange={(value) => setLocalFilters({ ...localFilters, energyLevel: value })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Energy Levels</SelectItem>
                    <SelectItem value="high">High Energy</SelectItem>
                    <SelectItem value="medium">Medium Energy</SelectItem>
                    <SelectItem value="low">Low Energy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Sorting */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Sort by</h4>
            <div className="grid grid-cols-2 gap-3">
              <Select
                value={localFilters.sortBy}
                onValueChange={(value) => setLocalFilters({ ...localFilters, sortBy: value })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Date Created</SelectItem>
                  <SelectItem value="scheduled_date">Due Date</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="task_text">Name</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={localFilters.sortDirection}
                onValueChange={(value) => setLocalFilters({ ...localFilters, sortDirection: value as 'asc' | 'desc' })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Grouping */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Group by</h4>
            <Select
              value={localFilters.groupBy}
              onValueChange={(value) => setLocalFilters({ ...localFilters, groupBy: value })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Grouping</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="scheduled_date">Due Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={handleReset}>
            Reset
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply}>Apply Filters</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
