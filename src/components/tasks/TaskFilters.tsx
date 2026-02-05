import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Zap, Battery, BatteryLow, Tag, X, Check } from 'lucide-react';
import { EnergyLevel, ENERGY_LEVELS } from './types';
import { useContextTags } from '@/hooks/useContextTags';

interface TaskFiltersProps {
  selectedEnergy: EnergyLevel[];
  onEnergyChange: (energy: EnergyLevel[]) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  onClearFilters: () => void;
}

export function TaskFilters({
  selectedEnergy,
  onEnergyChange,
  selectedTags,
  onTagsChange,
  onClearFilters,
}: TaskFiltersProps) {
  const { tags: contextTags } = useContextTags();
  const hasFilters = selectedEnergy.length > 0 || selectedTags.length > 0;

  const toggleEnergy = (energy: EnergyLevel) => {
    if (selectedEnergy.includes(energy)) {
      onEnergyChange(selectedEnergy.filter(e => e !== energy));
    } else {
      onEnergyChange([...selectedEnergy, energy]);
    }
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const getEnergyIcon = (energy: EnergyLevel) => {
    switch (energy) {
      case 'high_focus': return <Zap className="h-4 w-4" />;
      case 'medium': return <Battery className="h-4 w-4" />;
      case 'low_energy': return <BatteryLow className="h-4 w-4" />;
    }
  };

  return (
    <TooltipProvider>
    <div className="flex items-center gap-2 flex-wrap">
      {/* Energy Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={cn(
              "gap-2",
              selectedEnergy.length > 0 && "border-primary text-primary"
            )}
          >
            <Zap className="h-4 w-4" />
            Energy
            {selectedEnergy.length > 0 && (
              <Badge variant="secondary" className="h-5 w-5 p-0 justify-center">
                {selectedEnergy.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[180px]">
          <DropdownMenuLabel>Filter by Energy Level</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {/* Show All option */}
          <DropdownMenuItem
            onClick={() => onEnergyChange([])}
            className={cn(
              "gap-2 cursor-pointer",
              selectedEnergy.length === 0 && "bg-accent"
            )}
          >
            <Check className={cn(
              "h-4 w-4",
              selectedEnergy.length === 0 ? "opacity-100" : "opacity-0"
            )} />
            Show All
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {ENERGY_LEVELS.map(level => (
            <DropdownMenuCheckboxItem
              key={level.value}
              checked={selectedEnergy.includes(level.value as EnergyLevel)}
              onCheckedChange={() => toggleEnergy(level.value as EnergyLevel)}
            >
              <span className="flex items-center gap-2">
                {getEnergyIcon(level.value as EnergyLevel)}
                {level.label}
              </span>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Tags Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={cn(
              "gap-2",
              selectedTags.length > 0 && "border-primary text-primary"
            )}
          >
            <Tag className="h-4 w-4" />
            Tags
            {selectedTags.length > 0 && (
              <Badge variant="secondary" className="h-5 w-5 p-0 justify-center">
                {selectedTags.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[180px]">
          <DropdownMenuLabel>Filter by Context</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {/* Show All option */}
          <DropdownMenuItem
            onClick={() => onTagsChange([])}
            className={cn(
              "gap-2 cursor-pointer",
              selectedTags.length === 0 && "bg-accent"
            )}
          >
            <Check className={cn(
              "h-4 w-4",
              selectedTags.length === 0 ? "opacity-100" : "opacity-0"
            )} />
            Show All
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {contextTags.map(tag => (
            <DropdownMenuCheckboxItem
              key={tag.value}
              checked={selectedTags.includes(tag.value)}
              onCheckedChange={() => toggleTag(tag.value)}
            >
              <span className="flex items-center gap-2">
                <span>{tag.icon}</span>
                {tag.label}
              </span>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear filters */}
      {hasFilters && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClearFilters}
          className="gap-1 text-muted-foreground hover:text-destructive"
        >
          <X className="h-4 w-4" />
          Clear All
        </Button>
      )}

      {/* Active filter badges */}
      {hasFilters && (
        <div className="flex items-center gap-1 ml-2">
          {selectedEnergy.map(energy => {
            const level = ENERGY_LEVELS.find(l => l.value === energy);
            return (
              <Tooltip key={energy}>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="secondary" 
                    className="gap-1 cursor-pointer hover:bg-destructive/20 transition-colors"
                    onClick={() => toggleEnergy(energy)}
                  >
                    {getEnergyIcon(energy)}
                    {level?.label}
                    <X className="h-3 w-3" />
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Click to remove filter
                </TooltipContent>
              </Tooltip>
            );
          })}
          {selectedTags.map(tag => {
            const tagInfo = contextTags.find(t => t.value === tag);
            return (
              <Tooltip key={tag}>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="secondary" 
                    className="gap-1 cursor-pointer hover:bg-destructive/20 transition-colors"
                    onClick={() => toggleTag(tag)}
                  >
                    {tagInfo?.icon} {tagInfo?.label || tag}
                    <X className="h-3 w-3" />
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Click to remove filter
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      )}
    </div>
    </TooltipProvider>
  );
}
