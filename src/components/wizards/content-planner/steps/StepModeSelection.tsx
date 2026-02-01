import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Calendar, FileText, Rocket, CalendarDays } from 'lucide-react';
import { ContentPlannerData, ContentPlanMode, PlanningPeriod } from '@/types/contentPlanner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { format, startOfWeek, endOfWeek, addWeeks, startOfMonth, endOfMonth } from 'date-fns';

interface StepModeSelectionProps {
  data: ContentPlannerData;
  onChange: (updates: Partial<ContentPlannerData>) => void;
}

interface Launch {
  id: string;
  name: string;
  cart_opens: string;
  cart_closes: string;
}

export function StepModeSelection({ data, onChange }: StepModeSelectionProps) {
  const { user } = useAuth();
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch user's launches for launch mode
  useEffect(() => {
    if (!user) return;
    
    const fetchLaunches = async () => {
      setIsLoading(true);
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const { data: launchData } = await supabase
        .from('launches')
        .select('id, name, cart_opens, cart_closes')
        .eq('user_id', user.id)
        .gte('cart_closes', today)
        .order('cart_opens');
      
      if (launchData) {
        setLaunches(launchData);
      }
      setIsLoading(false);
    };
    
    fetchLaunches();
  }, [user]);

  const handleModeChange = (mode: ContentPlanMode) => {
    onChange({ 
      mode,
      launchId: mode === 'regular' ? null : data.launchId,
    });
  };

  const handlePeriodChange = (period: PlanningPeriod) => {
    const now = new Date();
    let startDate = '';
    let endDate = '';
    
    if (period === 'this-week') {
      startDate = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      endDate = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    } else if (period === 'next-week') {
      const nextWeek = addWeeks(now, 1);
      startDate = format(startOfWeek(nextWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      endDate = format(endOfWeek(nextWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    } else if (period === 'this-month') {
      startDate = format(startOfMonth(now), 'yyyy-MM-dd');
      endDate = format(endOfMonth(now), 'yyyy-MM-dd');
    }
    
    onChange({
      planningPeriod: period,
      customStartDate: period === 'custom' ? data.customStartDate : startDate,
      customEndDate: period === 'custom' ? data.customEndDate : endDate,
    });
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">What are you planning?</h2>
        <p className="text-muted-foreground">
          Choose whether you're planning regular content or content for a specific launch
        </p>
      </div>

      {/* Mode Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card 
          className={cn(
            "cursor-pointer transition-all hover:border-primary",
            data.mode === 'regular' && "border-primary ring-2 ring-primary/20"
          )}
          onClick={() => handleModeChange('regular')}
        >
          <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
            <div className="p-4 rounded-full bg-primary/10">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Regular Content</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Weekly/monthly content for audience nurturing and growth
              </p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "cursor-pointer transition-all hover:border-primary",
            data.mode === 'launch' && "border-primary ring-2 ring-primary/20"
          )}
          onClick={() => handleModeChange('launch')}
        >
          <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
            <div className="p-4 rounded-full bg-orange-500/10">
              <Rocket className="h-8 w-8 text-orange-500" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Launch Content</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Content for an upcoming or active launch
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Launch Selection (when launch mode is selected) */}
      {data.mode === 'launch' && (
        <div className="space-y-3">
          <Label>Select Launch</Label>
          <Select
            value={data.launchId || ''}
            onValueChange={(value) => onChange({ launchId: value })}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={isLoading ? "Loading launches..." : "Select a launch"} />
            </SelectTrigger>
            <SelectContent>
              {launches.map((launch) => (
                <SelectItem key={launch.id} value={launch.id}>
                  <div className="flex items-center gap-2">
                    <Rocket className="h-4 w-4" />
                    <span>{launch.name}</span>
                    <span className="text-muted-foreground text-xs">
                      ({format(new Date(launch.cart_opens), 'MMM d')} - {format(new Date(launch.cart_closes), 'MMM d')})
                    </span>
                  </div>
                </SelectItem>
              ))}
              {launches.length === 0 && !isLoading && (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No upcoming launches found
                </div>
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Time Period Selection */}
      {data.mode && (
        <div className="space-y-4">
          <Label className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Time Period
          </Label>
          
          <RadioGroup
            value={data.planningPeriod}
            onValueChange={(value) => handlePeriodChange(value as PlanningPeriod)}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            <Label
              htmlFor="this-week"
              className={cn(
                "flex items-center justify-center p-4 border rounded-lg cursor-pointer transition-all",
                data.planningPeriod === 'this-week' 
                  ? "border-primary bg-primary/5" 
                  : "hover:border-muted-foreground/50"
              )}
            >
              <RadioGroupItem value="this-week" id="this-week" className="sr-only" />
              <span>This Week</span>
            </Label>
            
            <Label
              htmlFor="next-week"
              className={cn(
                "flex items-center justify-center p-4 border rounded-lg cursor-pointer transition-all",
                data.planningPeriod === 'next-week' 
                  ? "border-primary bg-primary/5" 
                  : "hover:border-muted-foreground/50"
              )}
            >
              <RadioGroupItem value="next-week" id="next-week" className="sr-only" />
              <span>Next Week</span>
            </Label>
            
            <Label
              htmlFor="this-month"
              className={cn(
                "flex items-center justify-center p-4 border rounded-lg cursor-pointer transition-all",
                data.planningPeriod === 'this-month' 
                  ? "border-primary bg-primary/5" 
                  : "hover:border-muted-foreground/50"
              )}
            >
              <RadioGroupItem value="this-month" id="this-month" className="sr-only" />
              <span>This Month</span>
            </Label>
            
            <Label
              htmlFor="custom"
              className={cn(
                "flex items-center justify-center p-4 border rounded-lg cursor-pointer transition-all",
                data.planningPeriod === 'custom' 
                  ? "border-primary bg-primary/5" 
                  : "hover:border-muted-foreground/50"
              )}
            >
              <RadioGroupItem value="custom" id="custom" className="sr-only" />
              <span>Custom</span>
            </Label>
          </RadioGroup>

          {/* Custom Date Range */}
          {data.planningPeriod === 'custom' && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={data.customStartDate}
                  onChange={(e) => onChange({ customStartDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={data.customEndDate}
                  onChange={(e) => onChange({ customEndDate: e.target.value })}
                  min={data.customStartDate}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
