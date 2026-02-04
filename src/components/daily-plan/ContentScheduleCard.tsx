import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Send, PenTool } from 'lucide-react';
import { format } from 'date-fns';
import { useContentForPlanner, ContentPlannerItem } from '@/hooks/useContentForPlanner';
import { cn } from '@/lib/utils';

interface ContentScheduleCardProps {
  date: Date;
}

export function ContentScheduleCard({ date }: ContentScheduleCardProps) {
  const { getContentForDate, showContentInPlanners, isLoading } = useContentForPlanner();
  
  if (!showContentInPlanners || isLoading) {
    return null;
  }

  const content = getContentForDate(date);
  
  if (content.length === 0) {
    return null;
  }

  const dateStr = format(date, 'yyyy-MM-dd');

  // Separate into create and publish items
  const createItems = content.filter(item => item.plannedCreationDate === dateStr);
  const publishItems = content.filter(item => item.plannedPublishDate === dateStr);

  return (
    <Card className="border-l-4 border-l-violet-500">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4 text-violet-500" />
          Content Schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="py-2 px-4 space-y-3">
        {/* Create items */}
        {createItems.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-teal-600 dark:text-teal-400">
              <PenTool className="h-3 w-3" />
              Create Today
            </div>
            {createItems.map((item) => (
              <ContentItem key={`create-${item.id}`} item={item} type="create" />
            ))}
          </div>
        )}

        {/* Publish items */}
        {publishItems.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-violet-600 dark:text-violet-400">
              <Send className="h-3 w-3" />
              Publish Today
            </div>
            {publishItems.map((item) => (
              <ContentItem key={`publish-${item.id}`} item={item} type="publish" />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ContentItem({ item, type }: { item: ContentPlannerItem; type: 'create' | 'publish' }) {
  return (
    <div 
      className={cn(
        "p-2 rounded-md text-xs",
        type === 'create' 
          ? "bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800" 
          : "bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800"
      )}
    >
      <div className="font-medium truncate">{item.title}</div>
      <div className="flex items-center gap-2 mt-1">
        {item.channel && (
          <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
            {item.channel}
          </Badge>
        )}
        {item.type && (
          <span className="text-muted-foreground">{item.type}</span>
        )}
        {item.scheduledTime && (
          <span className="text-muted-foreground">@ {item.scheduledTime}</span>
        )}
      </div>
    </div>
  );
}
