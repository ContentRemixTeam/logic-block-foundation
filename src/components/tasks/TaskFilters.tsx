import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Filter, Zap, Battery, BatteryLow, Tag, Target, X } from 'lucide-react';
import { EnergyLevel, ENERGY_LEVELS, CONTEXT_TAGS } from './types';

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
    <div className="flex items-center gap-2">
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
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Filter by Energy Level</DropdownMenuLabel>
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
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Filter by Context</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {CONTEXT_TAGS.map(tag => (
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
          className="gap-1 text-muted-foreground"
        >
          <X className="h-4 w-4" />
          Clear
        </Button>
      )}

      {/* Active filter badges */}
      {hasFilters && (
        <div className="flex items-center gap-1 ml-2">
          {selectedEnergy.map(energy => {
            const level = ENERGY_LEVELS.find(l => l.value === energy);
            return (
              <Badge 
                key={energy} 
                variant="secondary" 
                className="gap-1 cursor-pointer hover:bg-destructive/20"
                onClick={() => toggleEnergy(energy)}
              >
                {getEnergyIcon(energy)}
                {level?.label}
                <X className="h-3 w-3" />
              </Badge>
            );
          })}
          {selectedTags.map(tag => {
            const tagInfo = CONTEXT_TAGS.find(t => t.value === tag);
            return (
              <Badge 
                key={tag} 
                variant="secondary" 
                className="gap-1 cursor-pointer hover:bg-destructive/20"
                onClick={() => toggleTag(tag)}
              >
                {tagInfo?.icon} {tagInfo?.label}
                <X className="h-3 w-3" />
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
