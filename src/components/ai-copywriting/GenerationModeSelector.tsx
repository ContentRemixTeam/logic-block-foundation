import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { GENERATION_MODE_CONFIGS, GenerationMode } from '@/types/generationModes';
import { cn } from '@/lib/utils';

interface GenerationModeSelectorProps {
  value: GenerationMode;
  onChange: (mode: GenerationMode) => void;
  className?: string;
}

export function GenerationModeSelector({ 
  value, 
  onChange, 
  className 
}: GenerationModeSelectorProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <Label>Generation Quality</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>
                Choose between faster, cost-effective generation or premium multi-pass refinement. 
                You can change this for each generation.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <RadioGroup 
        value={value} 
        onValueChange={(v) => onChange(v as GenerationMode)}
        className="grid grid-cols-2 gap-3"
      >
        {Object.values(GENERATION_MODE_CONFIGS).map((config) => (
          <label
            key={config.mode}
            className={cn(
              "relative flex cursor-pointer rounded-lg border p-4 transition-colors",
              value === config.mode 
                ? "border-primary bg-primary/5" 
                : "border-border hover:border-primary/50"
            )}
          >
            <RadioGroupItem 
              value={config.mode} 
              className="sr-only"
            />
            
            <div className="flex flex-col gap-2 w-full">
              <div className="flex items-center gap-2">
                <span className="text-lg">{config.icon}</span>
                <span className="font-medium text-sm">{config.label}</span>
                {config.recommended && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                    Recommended
                  </Badge>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground leading-relaxed">
                {config.description}
              </p>
              
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                <span>💰 {config.estimatedCost}</span>
                <span>⏱️ {config.estimatedTime}</span>
                <span>🔄 {config.passes} passes</span>
              </div>
            </div>
          </label>
        ))}
      </RadioGroup>

      <p className="text-xs text-muted-foreground">
        💡 Costs are estimates based on OpenAI's GPT-4o pricing. Actual cost depends on content length and complexity.
      </p>
    </div>
  );
}
