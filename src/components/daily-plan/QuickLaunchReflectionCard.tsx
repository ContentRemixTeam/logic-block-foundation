import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Rocket, 
  Plus, 
  X, 
  Sparkles,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Zap,
  DollarSign
} from 'lucide-react';
import { ActiveLaunch } from '@/hooks/useActiveLaunches';
import { useDailyLaunchReflection } from '@/hooks/useDailyLaunchReflection';
import { cn } from '@/lib/utils';
import { differenceInDays, parseISO } from 'date-fns';

interface QuickLaunchReflectionCardProps {
  launch: ActiveLaunch;
  compact?: boolean;
  showMetrics?: boolean;
}

export function QuickLaunchReflectionCard({ 
  launch, 
  compact = false,
  showMetrics = false 
}: QuickLaunchReflectionCardProps) {
  const {
    reflection,
    isLoading,
    isSaving,
    addWhatWorked,
    addWhatDidntWork,
    removeWhatWorked,
    removeWhatDidntWork,
    updateQuickNote,
    updateMetrics,
  } = useDailyLaunchReflection({ launchId: launch.id });

  const [newWorked, setNewWorked] = useState('');
  const [newDidntWork, setNewDidntWork] = useState('');

  // Calculate day of launch
  const today = new Date();
  const cartOpens = parseISO(launch.cart_opens);
  const cartCloses = parseISO(launch.cart_closes);
  const isLive = today >= cartOpens && today <= cartCloses;
  const dayNumber = isLive 
    ? differenceInDays(today, cartOpens) + 1 
    : differenceInDays(today, cartOpens);
  const totalDays = differenceInDays(cartCloses, cartOpens) + 1;

  const handleAddWorked = () => {
    if (newWorked.trim()) {
      addWhatWorked(newWorked);
      setNewWorked('');
    }
  };

  const handleAddDidntWork = () => {
    if (newDidntWork.trim()) {
      addWhatDidntWork(newDidntWork);
      setNewDidntWork('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, type: 'worked' | 'didnt') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (type === 'worked') handleAddWorked();
      else handleAddDidntWork();
    }
  };

  if (isLoading) {
    return (
      <Card className={cn("border-accent/30", compact && "shadow-sm")}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Rocket className="h-4 w-4 animate-pulse" />
            <span>Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "border-accent/30 bg-gradient-to-br from-accent/5 to-transparent",
      compact && "shadow-sm"
    )}>
      <CardHeader className={cn("pb-2", compact && "p-3 pb-1")}>
        <CardTitle className={cn(
          "flex items-center justify-between",
          compact ? "text-sm" : "text-base"
        )}>
          <div className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-accent" />
            <span>Launch Pulse: {launch.name}</span>
          </div>
          <div className="flex items-center gap-2">
            {isSaving && (
              <Badge variant="outline" className="text-xs animate-pulse">
                Saving...
              </Badge>
            )}
            {isLive && (
              <Badge variant="default" className="text-xs bg-green-500">
                Day {dayNumber} of {totalDays}
              </Badge>
            )}
            {!isLive && launch.daysUntilOpen > 0 && (
              <Badge variant="secondary" className="text-xs">
                {launch.daysUntilOpen} days to go
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className={cn("space-y-4", compact ? "p-3 pt-2" : "pt-2")}>
        {/* Metrics (for live phase) */}
        {showMetrics && isLive && (
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                <Zap className="h-3 w-3" /> Offers
              </label>
              <Input
                type="number"
                min={0}
                value={reflection?.offers_made || ''}
                onChange={(e) => updateMetrics({ offers_made: parseInt(e.target.value) || 0 })}
                className="h-8 text-sm"
                placeholder="0"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Sales
              </label>
              <Input
                type="number"
                min={0}
                value={reflection?.sales_today || ''}
                onChange={(e) => updateMetrics({ sales_today: parseInt(e.target.value) || 0 })}
                className="h-8 text-sm"
                placeholder="0"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> Revenue
              </label>
              <Input
                type="number"
                min={0}
                value={reflection?.revenue_today || ''}
                onChange={(e) => updateMetrics({ revenue_today: parseFloat(e.target.value) || 0 })}
                className="h-8 text-sm"
                placeholder="0"
              />
            </div>
          </div>
        )}

        {/* What Worked */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-1.5 text-green-600">
            <TrendingUp className="h-4 w-4" />
            What worked today?
          </label>
          
          {/* Existing items */}
          <div className="space-y-1">
            {(reflection?.what_worked || []).map((item, index) => (
              <div 
                key={index} 
                className="flex items-center gap-2 text-sm bg-green-50 dark:bg-green-950/30 rounded-md px-2 py-1.5 group"
              >
                <span className="flex-1">{item}</span>
                <button
                  onClick={() => removeWhatWorked(index)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          
          {/* Add new */}
          <div className="flex gap-2">
            <Input
              value={newWorked}
              onChange={(e) => setNewWorked(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e, 'worked')}
              placeholder="Add what worked..."
              className="h-8 text-sm"
            />
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleAddWorked}
              disabled={!newWorked.trim()}
              className="h-8 px-2"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* What Didn't Work */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-1.5 text-orange-600">
            <TrendingDown className="h-4 w-4" />
            What didn't work?
          </label>
          
          {/* Existing items */}
          <div className="space-y-1">
            {(reflection?.what_didnt_work || []).map((item, index) => (
              <div 
                key={index} 
                className="flex items-center gap-2 text-sm bg-orange-50 dark:bg-orange-950/30 rounded-md px-2 py-1.5 group"
              >
                <span className="flex-1">{item}</span>
                <button
                  onClick={() => removeWhatDidntWork(index)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          
          {/* Add new */}
          <div className="flex gap-2">
            <Input
              value={newDidntWork}
              onChange={(e) => setNewDidntWork(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e, 'didnt')}
              placeholder="Add what didn't work..."
              className="h-8 text-sm"
            />
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleAddDidntWork}
              disabled={!newDidntWork.trim()}
              className="h-8 px-2"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Quick Note */}
        {!compact && (
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              Quick note (optional)
            </label>
            <Textarea
              value={reflection?.quick_note || ''}
              onChange={(e) => updateQuickNote(e.target.value)}
              placeholder="Any other thoughts for today..."
              className="min-h-[60px] text-sm resize-none"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
