import { format, addDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Settings2, CalendarDays, RefreshCw, Loader2, Calendar, Eye, GraduationCap, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { OfficeHoursBlock, formatOfficeHoursTime } from '@/hooks/useOfficeHours';

interface WeeklyPlannerHeaderProps {
  currentWeekStart: Date;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onGoToToday: () => void;
  isCurrentWeek: boolean;
  onOpenOfficeHours?: () => void;
  showWeekend?: boolean;
  onToggleWeekend?: () => void;
  // Office hours data - new format with multiple blocks
  officeHoursBlocks?: OfficeHoursBlock[];
  // Google Calendar props
  googleConnected?: boolean;
  googleCalendarName?: string;
  onConnectGoogle?: () => void;
  onSyncGoogle?: () => void;
  googleSyncing?: boolean;
  // Mastermind calls
  onOpenMastermindCalls?: () => void;
  showMastermindCalls?: boolean;
}

export function WeeklyPlannerHeader({
  currentWeekStart,
  onPreviousWeek,
  onNextWeek,
  onGoToToday,
  isCurrentWeek,
  onOpenOfficeHours,
  showWeekend = true,
  onToggleWeekend,
  officeHoursBlocks = [],
  googleConnected = false,
  googleCalendarName,
  onConnectGoogle,
  onSyncGoogle,
  googleSyncing = false,
  onOpenMastermindCalls,
  showMastermindCalls = true,
}: WeeklyPlannerHeaderProps) {
  const navigate = useNavigate();
  const weekEnd = addDays(currentWeekStart, 6);
  const weekLabel = `Week of ${format(currentWeekStart, 'MMMM d, yyyy')}`;

  // Get today's office hours blocks for display
  const todayDayOfWeek = new Date().getDay();
  const todayBlocks = officeHoursBlocks.filter(b => b.day_of_week === todayDayOfWeek);
  const hasOfficeHours = todayBlocks.length > 0;
  
  // Format today's hours for badge display
  const formatTodayHours = () => {
    if (todayBlocks.length === 0) return null;
    if (todayBlocks.length === 1) {
      return `${formatOfficeHoursTime(todayBlocks[0].start_time)} – ${formatOfficeHoursTime(todayBlocks[0].end_time)}`;
    }
    return `${todayBlocks.length} blocks today`;
  };

  return (
    <div className="flex items-center justify-between pb-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Weekly Planner</h1>
        {/* Office Hours Badge */}
        {hasOfficeHours && (
          <Badge 
            variant="outline" 
            className="text-xs font-normal gap-1.5 cursor-pointer hover:bg-muted"
            onClick={onOpenOfficeHours}
          >
            <Clock className="h-3 w-3" />
            {formatTodayHours()}
          </Badge>
        )}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/daily-plan')}
          className="gap-1.5"
        >
          <Eye className="h-4 w-4" />
          View Today
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {/* Google Calendar Status/Connect */}
        {googleConnected ? (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5 bg-green-500/10 text-green-600 border-green-500/30">
              <Calendar className="h-3 w-3" />
              {googleCalendarName || 'Calendar'}
            </Badge>
            {onSyncGoogle && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onSyncGoogle}
                disabled={googleSyncing}
                className="h-8 px-2"
              >
                {googleSyncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        ) : onConnectGoogle && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onConnectGoogle}
            className="gap-2"
          >
            <Calendar className="h-4 w-4" />
            Connect Calendar
          </Button>
        )}

        {showMastermindCalls && onOpenMastermindCalls && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onOpenMastermindCalls}
            className="gap-2 text-primary border-primary/30 hover:bg-primary/10 hover:text-primary"
          >
            <GraduationCap className="h-4 w-4" />
            Mastermind Calls
          </Button>
        )}

        {onToggleWeekend && (
          <Button 
            variant={showWeekend ? "outline" : "default"} 
            size="sm" 
            onClick={onToggleWeekend}
          >
            {showWeekend ? "Hide Weekend" : "Show Weekend"}
          </Button>
        )}

        {onOpenOfficeHours && (
          <Button variant="outline" size="sm" className="gap-2" onClick={onOpenOfficeHours}>
            <Settings2 className="h-4 w-4" />
            Office Hours
          </Button>
        )}

        <Button variant="outline" size="sm" onClick={onPreviousWeek}>
          Previous Week
        </Button>

        <Button variant="outline" size="sm" onClick={onNextWeek}>
          Next Week
        </Button>

        {!isCurrentWeek && (
          <Button variant="ghost" size="sm" onClick={onGoToToday} className="gap-1">
            <CalendarDays className="h-4 w-4" />
            Today
          </Button>
        )}
      </div>
    </div>
  );
}
