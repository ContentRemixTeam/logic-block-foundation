import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Info, RotateCcw } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  CopyControls, 
  CopyLength, 
  EmotionalIntensity, 
  UrgencyLevel, 
  ToneStyle,
  LENGTH_CONFIGS,
  EMOTION_CONFIGS,
  URGENCY_CONFIGS,
  TONE_CONFIGS,
  DEFAULT_COPY_CONTROLS
} from '@/types/copyControls';
import { cn } from '@/lib/utils';

interface CopyControlsPanelProps {
  value: CopyControls;
  onChange: (controls: CopyControls) => void;
  className?: string;
}

export function CopyControlsPanel({ 
  value, 
  onChange, 
  className
}: CopyControlsPanelProps) {
  
  const handleReset = () => {
    onChange(DEFAULT_COPY_CONTROLS);
  };
  
  const isDefault = JSON.stringify(value) === JSON.stringify(DEFAULT_COPY_CONTROLS);
  
  return (
    <Card className={cn("border-border/50", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Fine-Tune Your Copy</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    Customize length, emotional tone, urgency, and writing style. 
                    Defaults are optimized for each content type.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {!isDefault && (
            <Button variant="ghost" size="sm" onClick={handleReset} className="h-8">
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-5">
        {/* Length Control */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">📏 Length</Label>
          <RadioGroup 
            value={value.length} 
            onValueChange={(val) => onChange({ ...value, length: val as CopyLength })}
            className="flex gap-2 flex-wrap"
          >
            {Object.entries(LENGTH_CONFIGS).map(([key, config]) => (
              <label
                key={key}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-colors",
                  value.length === key 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50"
                )}
              >
                <RadioGroupItem value={key} className="sr-only" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{config.label}</span>
                  <span className="text-xs text-muted-foreground">{config.wordRange}</span>
                </div>
              </label>
            ))}
          </RadioGroup>
          <p className="text-xs text-muted-foreground">
            {LENGTH_CONFIGS[value.length].description}
          </p>
        </div>
        
        {/* Emotional Intensity Control */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">💭 Emotional Intensity</Label>
          <RadioGroup 
            value={value.emotion} 
            onValueChange={(val) => onChange({ ...value, emotion: val as EmotionalIntensity })}
            className="flex gap-2 flex-wrap"
          >
            {Object.entries(EMOTION_CONFIGS).map(([key, config]) => (
              <label
                key={key}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-colors",
                  value.emotion === key 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50"
                )}
              >
                <RadioGroupItem value={key} className="sr-only" />
                <span className="text-sm font-medium">{config.label}</span>
              </label>
            ))}
          </RadioGroup>
          <p className="text-xs text-muted-foreground">
            {EMOTION_CONFIGS[value.emotion].description}
          </p>
        </div>
        
        {/* Urgency Level Control */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">🎯 Urgency Level</Label>
          <RadioGroup 
            value={value.urgency} 
            onValueChange={(val) => onChange({ ...value, urgency: val as UrgencyLevel })}
            className="flex gap-2 flex-wrap"
          >
            {Object.entries(URGENCY_CONFIGS).map(([key, config]) => (
              <label
                key={key}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-colors",
                  value.urgency === key 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50"
                )}
              >
                <RadioGroupItem value={key} className="sr-only" />
                <span className="text-sm font-medium">{config.label}</span>
              </label>
            ))}
          </RadioGroup>
          <p className="text-xs text-muted-foreground">
            {URGENCY_CONFIGS[value.urgency].description}
          </p>
        </div>
        
        {/* Tone Style Control */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">🗣️ Tone</Label>
          <RadioGroup 
            value={value.tone} 
            onValueChange={(val) => onChange({ ...value, tone: val as ToneStyle })}
            className="flex gap-2 flex-wrap"
          >
            {Object.entries(TONE_CONFIGS).map(([key, config]) => (
              <label
                key={key}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-colors",
                  value.tone === key 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50"
                )}
              >
                <RadioGroupItem value={key} className="sr-only" />
                <span className="text-sm font-medium">{config.label}</span>
              </label>
            ))}
          </RadioGroup>
          <p className="text-xs text-muted-foreground">
            {TONE_CONFIGS[value.tone].description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
