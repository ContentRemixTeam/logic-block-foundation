import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Palette, Send, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CalendarDateMode = 'dual' | 'create-only' | 'publish-only';

interface DateModeSelectorProps {
  value: CalendarDateMode;
  onChange: (mode: CalendarDateMode) => void;
  className?: string;
}

const DATE_MODE_OPTIONS: { value: CalendarDateMode; label: string; description: string; icon: React.ElementType }[] = [
  { 
    value: 'dual', 
    label: 'Dual Lanes', 
    description: 'Show both creation and publish dates',
    icon: Layers,
  },
  { 
    value: 'create-only', 
    label: 'Create Only', 
    description: 'Focus on content creation',
    icon: Palette,
  },
  { 
    value: 'publish-only', 
    label: 'Publish Only', 
    description: 'Focus on publishing schedule',
    icon: Send,
  },
];

export function DateModeSelector({ value, onChange, className }: DateModeSelectorProps) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(v) => onChange(v as CalendarDateMode)}
      className={cn("grid gap-2", className)}
    >
      {DATE_MODE_OPTIONS.map((option) => {
        const Icon = option.icon;
        const isSelected = value === option.value;
        
        return (
          <Label
            key={option.value}
            htmlFor={`date-mode-${option.value}`}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
              isSelected 
                ? "border-primary bg-primary/5" 
                : "border-border hover:border-muted-foreground/30"
            )}
          >
            <RadioGroupItem
              value={option.value}
              id={`date-mode-${option.value}`}
              className="sr-only"
            />
            <div className={cn(
              "p-2 rounded-md",
              isSelected ? "bg-primary/10" : "bg-muted/50"
            )}>
              <Icon className={cn(
                "h-4 w-4",
                isSelected ? "text-primary" : "text-muted-foreground"
              )} />
            </div>
            <div className="flex-1">
              <p className={cn(
                "font-medium text-sm",
                isSelected ? "text-primary" : "text-foreground"
              )}>
                {option.label}
              </p>
              <p className="text-xs text-muted-foreground">
                {option.description}
              </p>
            </div>
          </Label>
        );
      })}
    </RadioGroup>
  );
}
