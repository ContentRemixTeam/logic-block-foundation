import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Target, ChevronDown, ChevronUp, Sparkles, Flame, Users } from 'lucide-react';
import { useState, useEffect } from 'react';

interface CycleData {
  cycle_id: string;
  goal: string;
  why?: string | null;
  identity?: string | null;
  focus_area?: string | null;
  start_date: string;
  end_date: string;
  metric_1_name?: string | null;
  metric_1_start?: number | null;
  metric_1_goal?: number | null;
  metric_2_name?: string | null;
  metric_2_start?: number | null;
  metric_2_goal?: number | null;
  metric_3_name?: string | null;
  metric_3_start?: number | null;
  metric_3_goal?: number | null;
}

interface WeeklyCycleCheckInProps {
  cycle: CycleData | null;
  checkinNotes: string;
  onCheckinNotesChange: (value: string) => void;
}

export function WeeklyCycleCheckIn({ 
  cycle, 
  checkinNotes, 
  onCheckinNotesChange 
}: WeeklyCycleCheckInProps) {
  const [isOpen, setIsOpen] = useState(() => {
    const stored = localStorage.getItem('weeklyCycleCheckInOpen');
    return stored !== null ? stored === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem('weeklyCycleCheckInOpen', String(isOpen));
  }, [isOpen]);

  const getFocusAreaBadge = () => {
    if (!cycle?.focus_area) return null;
    
    const focusConfig: Record<string, { label: string; icon: typeof Sparkles; className: string }> = {
      discover: { label: 'DISCOVER', icon: Sparkles, className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
      nurture: { label: 'NURTURE', icon: Flame, className: 'bg-primary/10 text-primary border-primary/20' },
      convert: { label: 'CONVERT', icon: Users, className: 'bg-green-500/10 text-green-600 border-green-500/20' },
    };
    
    const config = focusConfig[cycle.focus_area.toLowerCase()];
    if (!config) return null;
    
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={`${config.className} text-xs font-medium`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  if (!cycle) {
    return (
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Target className="h-5 w-5" />
            <span className="text-sm">No active 90-day cycle</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Target className="h-5 w-5 text-primary shrink-0" />
                <CardTitle className="text-base">90-Day Goal Check-In</CardTitle>
                {getFocusAreaBadge()}
              </div>
              <p className="text-sm font-medium text-foreground leading-snug">
                {cycle.goal}
              </p>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="shrink-0 h-8 w-8 p-0">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Why & Identity */}
            <div className="grid gap-3 text-sm">
              {cycle.why && (
                <div className="bg-muted/30 rounded-md p-3">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Why</span>
                  <p className="text-foreground mt-1">{cycle.why}</p>
                </div>
              )}
              {cycle.identity && (
                <div className="bg-muted/30 rounded-md p-3">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Identity</span>
                  <p className="text-foreground mt-1">{cycle.identity}</p>
                </div>
              )}
            </div>

            {/* Weekly Check-in Notes */}
            <div className="space-y-2">
              <Label htmlFor="checkin-notes" className="text-sm font-medium">
                How are you progressing toward this goal?
              </Label>
              <Textarea
                id="checkin-notes"
                value={checkinNotes}
                onChange={(e) => onCheckinNotesChange(e.target.value)}
                placeholder="Reflect on your weekly progress toward your 90-day goal..."
                rows={3}
                className="resize-none"
              />
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
