import { useEffect, useState } from 'react';
import { PremiumCard, PremiumCardHeader, PremiumCardTitle, PremiumCardContent } from '@/components/ui/premium-card';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWithinInterval, addMonths, subMonths } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Promotion {
  name: string;
  offer: string;
  startDate: string;
  endDate: string;
  goal: string;
  launchType: string;
  notes?: string;
}

export function SalesCalendar() {
  const { user } = useAuth();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPromotions();
  }, [user]);

  const loadPromotions = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      const { data: cycle } = await supabase
        .from('cycles_90_day')
        .select('promotions, start_date')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      const rawPromos = cycle?.promotions;
      const promos = (Array.isArray(rawPromos) ? rawPromos : []) as unknown as Promotion[];
      
      if (promos.length > 0) {
        setPromotions(promos.filter(p => p.startDate));
        // Set current month to cycle start if available
        if (cycle?.start_date) {
          setCurrentMonth(new Date(cycle.start_date));
        }
      }
    } catch (error) {
      console.error('Error loading promotions:', error);
    } finally {
      setLoading(false);
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get the first day of the week (0 = Sunday)
  const firstDayOfWeek = monthStart.getDay();
  const leadingEmptyDays = Array(firstDayOfWeek).fill(null);

  const getPromotionForDay = (day: Date): Promotion | undefined => {
    return promotions.find((promo) => {
      if (!promo.startDate) return false;
      const start = new Date(promo.startDate);
      const end = promo.endDate ? new Date(promo.endDate) : start;
      return isWithinInterval(day, { start, end });
    });
  };

  const isStartDay = (day: Date, promo: Promotion): boolean => {
    return isSameDay(day, new Date(promo.startDate));
  };

  const isEndDay = (day: Date, promo: Promotion): boolean => {
    return promo.endDate ? isSameDay(day, new Date(promo.endDate)) : isSameDay(day, new Date(promo.startDate));
  };

  if (loading || promotions.length === 0) return null;

  return (
    <PremiumCard category="plan">
      <PremiumCardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-primary" />
            <PremiumCardTitle className="text-base">Sales Calendar</PremiumCardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium min-w-[80px] text-center">
              {format(currentMonth, 'MMM yyyy')}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </PremiumCardHeader>
      <PremiumCardContent>
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <div key={i} className="text-center text-xs text-muted-foreground font-medium py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Leading empty days */}
          {leadingEmptyDays.map((_, i) => (
            <div key={`empty-${i}`} className="h-7" />
          ))}
          
          {/* Days of month */}
          {daysInMonth.map((day, i) => {
            const promotion = getPromotionForDay(day);
            const isToday = isSameDay(day, new Date());
            const isStart = promotion ? isStartDay(day, promotion) : false;
            const isEnd = promotion ? isEndDay(day, promotion) : false;
            
            return (
              <div
                key={i}
                className={cn(
                  "h-7 flex items-center justify-center text-xs rounded transition-colors",
                  isToday && "ring-1 ring-primary font-bold",
                  promotion && "bg-primary/20 text-primary font-medium",
                  isStart && "rounded-l-full bg-primary text-primary-foreground",
                  isEnd && !isStart && "rounded-r-full",
                  !promotion && "text-muted-foreground hover:bg-muted/50"
                )}
                title={promotion ? `${promotion.name}${isStart ? ' (Start)' : ''}${isEnd && !isStart ? ' (End)' : ''}` : undefined}
              >
                {format(day, 'd')}
              </div>
            );
          })}
        </div>
        
        {/* Legend */}
        <div className="mt-3 space-y-1.5 pt-2 border-t">
          {promotions.slice(0, 3).map((promo, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
              <span className="truncate font-medium">{promo.name}</span>
              <span className="text-muted-foreground ml-auto flex-shrink-0">
                {format(new Date(promo.startDate), 'MMM d')}
                {promo.endDate && ` - ${format(new Date(promo.endDate), 'MMM d')}`}
              </span>
            </div>
          ))}
          {promotions.length > 3 && (
            <p className="text-xs text-muted-foreground">+{promotions.length - 3} more</p>
          )}
        </div>
      </PremiumCardContent>
    </PremiumCard>
  );
}
