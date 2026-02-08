import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarIcon, Clock } from 'lucide-react';
import { format, addDays, parseISO } from 'date-fns';
import { ContentChallengeWizardData, ScheduledContentItem, AVAILABLE_PLATFORMS } from '@/types/contentChallenge';

interface StepScheduleCalendarProps {
  data: ContentChallengeWizardData;
  setData: (updates: Partial<ContentChallengeWizardData>) => void;
  goNext: () => void;
  goBack: () => void;
}

const POSTING_TIMES = [
  { value: '06:00', label: '6:00 AM' },
  { value: '07:00', label: '7:00 AM' },
  { value: '08:00', label: '8:00 AM' },
  { value: '09:00', label: '9:00 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '13:00', label: '1:00 PM' },
  { value: '14:00', label: '2:00 PM' },
  { value: '15:00', label: '3:00 PM' },
  { value: '16:00', label: '4:00 PM' },
  { value: '17:00', label: '5:00 PM' },
  { value: '18:00', label: '6:00 PM' },
  { value: '19:00', label: '7:00 PM' },
  { value: '20:00', label: '8:00 PM' },
];

export default function StepScheduleCalendar({ data, setData }: StepScheduleCalendarProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    data.startDate ? parseISO(data.startDate) : undefined
  );

  // Generate scheduled content from finalized content
  const scheduledContent = useMemo(() => {
    if (!data.startDate) return [];

    const scheduled: ScheduledContentItem[] = [];
    const startDate = parseISO(data.startDate);

    // Iterate through all platforms
    Object.entries(data.contentByPlatform || {}).forEach(([platform, content]) => {
      const finalizedContent = content.filter(c => c.status === 'finalized');
      
      finalizedContent.forEach((item, index) => {
        const date = addDays(startDate, item.dayNumber - 1);
        scheduled.push({
          dayNumber: item.dayNumber,
          date: format(date, 'yyyy-MM-dd'),
          platform,
          pillarId: item.pillarId,
          title: item.title,
          hook: item.hook,
          fullCopy: item.fullCopy,
          postingTime: data.postingTimes?.[platform] || '09:00',
        });
      });
    });

    // Sort by date and day number
    scheduled.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.dayNumber - b.dayNumber;
    });

    return scheduled;
  }, [data.startDate, data.contentByPlatform, data.postingTimes]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setData({ 
        startDate: format(date, 'yyyy-MM-dd'),
        scheduledContent,
      });
      setCalendarOpen(false);
    }
  };

  const handlePostingTimeChange = (platform: string, time: string) => {
    setData({
      postingTimes: {
        ...data.postingTimes,
        [platform]: time,
      },
    });
  };

  // Group scheduled content by week
  const contentByWeek = useMemo(() => {
    const weeks: Record<number, ScheduledContentItem[]> = {};
    
    scheduledContent.forEach(item => {
      const weekNum = Math.ceil(item.dayNumber / 7);
      if (!weeks[weekNum]) weeks[weekNum] = [];
      weeks[weekNum].push(item);
    });

    return weeks;
  }, [scheduledContent]);

  const totalFinalizedCount = Object.values(data.contentByPlatform || {})
    .flat()
    .filter(c => c.status === 'finalized').length;

  return (
    <div className="space-y-6">
      {/* Start Date Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">When do you want to start?</CardTitle>
          <CardDescription>
            Select the first day of your 30-day content challenge
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'PPP') : 'Pick a start date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 pointer-events-auto">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  initialFocus
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>

            {selectedDate && (
              <div className="text-sm text-muted-foreground">
                Challenge ends: {format(addDays(selectedDate, 29), 'PPP')}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Posting Times per Platform */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Default Posting Times</CardTitle>
          <CardDescription>
            Set your preferred posting time for each platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.selectedPlatforms.map(platformId => {
              const platform = AVAILABLE_PLATFORMS.find(p => p.id === platformId);
              return (
                <div key={platformId} className="flex items-center gap-4">
                  <Label className="w-32 flex-shrink-0">{platform?.name}</Label>
                  <Select
                    value={data.postingTimes?.[platformId] || '09:00'}
                    onValueChange={(value) => handlePostingTimeChange(platformId, value)}
                  >
                    <SelectTrigger className="w-full">
                      <Clock className="mr-2 h-4 w-4" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {POSTING_TIMES.map(time => (
                        <SelectItem key={time.value} value={time.value}>
                          {time.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Calendar Preview */}
      {data.startDate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Calendar Preview</CardTitle>
            <CardDescription>
              {totalFinalizedCount} pieces of content scheduled over 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-6">
                {Object.entries(contentByWeek).map(([weekNum, items]) => (
                  <div key={weekNum}>
                    <h4 className="font-medium mb-3 sticky top-0 bg-background py-2">
                      Week {weekNum}
                    </h4>
                    <div className="space-y-2">
                      {items.map((item, index) => {
                        const platform = AVAILABLE_PLATFORMS.find(p => p.id === item.platform);
                        return (
                          <div
                            key={`${item.platform}-${item.dayNumber}-${index}`}
                            className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                          >
                            <div className="w-20 text-sm text-muted-foreground">
                              {format(parseISO(item.date), 'EEE, MMM d')}
                            </div>
                            <Badge variant="outline" className="font-mono text-xs">
                              Day {item.dayNumber}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {platform?.name}
                            </Badge>
                            <span className="flex-1 truncate text-sm">{item.title}</span>
                            <span className="text-xs text-muted-foreground">
                              {POSTING_TIMES.find(t => t.value === item.postingTime)?.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {scheduledContent.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No finalized content to schedule yet.
                    <br />
                    Go back to Step 4 to generate and finalize your content.
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
        <div>
          <span className="font-medium">{totalFinalizedCount} content pieces ready</span>
          {data.startDate && (
            <span className="text-muted-foreground ml-2">
              starting {format(parseISO(data.startDate), 'MMM d, yyyy')}
            </span>
          )}
        </div>
        {!data.startDate && (
          <span className="text-muted-foreground text-sm">
            Select a start date to continue
          </span>
        )}
      </div>
    </div>
  );
}
