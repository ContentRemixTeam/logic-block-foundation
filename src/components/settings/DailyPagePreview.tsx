import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Monitor,
  Smartphone,
  X,
  CheckSquare,
  Anchor,
  Brain,
  Target,
  ListOrdered,
  Sparkles,
  Calendar,
  CalendarDays,
  RotateCcw,
  Pencil,
  CalendarClock,
  LayoutGrid,
  Send,
  Heart,
  Zap,
  CheckCircle,
  Moon,
  Focus,
  MessageSquare,
  Type,
  Hash,
  Star,
  Clock,
  ChevronDown,
} from 'lucide-react';
import { SectionId, SECTION_DEFINITIONS, CustomQuestion } from '@/types/dailyPage';
import { cn } from '@/lib/utils';

// Icon mapping
const ICON_MAP: Record<string, React.ElementType> = {
  CheckSquare,
  Anchor,
  Brain,
  Target,
  ListOrdered,
  Sparkles,
  Calendar,
  CalendarDays,
  RotateCcw,
  Pencil,
  CalendarClock,
  LayoutGrid,
  Send,
  Heart,
  Zap,
  CheckCircle,
  Moon,
  Focus,
};

// Custom question type icons
const QUESTION_TYPE_ICONS: Record<string, React.ElementType> = {
  checkbox: CheckSquare,
  text: Type,
  number: Hash,
  rating: Star,
  time: Clock,
  dropdown: ChevronDown,
};

// Zone colors for visual distinction
const ZONE_COLORS: Record<string, string> = {
  morning: 'border-l-amber-500',
  context: 'border-l-purple-500',
  execution: 'border-l-emerald-500',
  evening: 'border-l-indigo-500',
  banners: 'border-l-blue-500',
  navigation: 'border-l-slate-500',
};

interface DailyPagePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionOrder: SectionId[];
  hiddenSections: Set<SectionId>;
  customQuestions: CustomQuestion[];
}

export function DailyPagePreview({
  open,
  onOpenChange,
  sectionOrder,
  hiddenSections,
  customQuestions,
}: DailyPagePreviewProps) {
  const isMobileDevice = useIsMobile();
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  const visibleSections = sectionOrder.filter(id => !hiddenSections.has(id));

  const renderSectionPreview = (sectionId: SectionId, isMobileView: boolean) => {
    // Check if it's a custom question
    const isCustomQuestion = sectionId.startsWith('custom_question_');
    
    if (isCustomQuestion) {
      const customQuestion = customQuestions.find(q => q.section_id === sectionId);
      if (!customQuestion) return null;
      
      const TypeIcon = QUESTION_TYPE_ICONS[customQuestion.type] || MessageSquare;
      
      return (
        <Card key={sectionId} className={cn(
          "border-l-4 border-l-violet-500 transition-all",
          isMobileView ? "text-sm" : ""
        )}>
          <CardHeader className={cn("pb-2", isMobileView ? "p-3" : "p-4")}>
            <CardTitle className={cn(
              "flex items-center gap-2",
              isMobileView ? "text-sm" : "text-base"
            )}>
              <TypeIcon className={cn("text-violet-500", isMobileView ? "h-4 w-4" : "h-5 w-5")} />
              {customQuestion.question}
              <Badge variant="secondary" className="ml-auto text-xs bg-violet-500/10 text-violet-600">
                Custom
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className={cn(isMobileView ? "p-3 pt-0" : "p-4 pt-0")}>
            {renderCustomQuestionInput(customQuestion, isMobileView)}
          </CardContent>
        </Card>
      );
    }

    const section = SECTION_DEFINITIONS[sectionId];
    if (!section) return null;
    
    const Icon = ICON_MAP[section.icon] || CheckSquare;
    const zoneColor = ZONE_COLORS[section.zone] || 'border-l-muted';

    return (
      <Card key={sectionId} className={cn(
        "border-l-4 transition-all",
        zoneColor,
        isMobileView ? "text-sm" : ""
      )}>
        <CardHeader className={cn("pb-2", isMobileView ? "p-3" : "p-4")}>
          <CardTitle className={cn(
            "flex items-center gap-2",
            isMobileView ? "text-sm" : "text-base"
          )}>
            <Icon className={cn("text-muted-foreground", isMobileView ? "h-4 w-4" : "h-5 w-5")} />
            {section.label}
            {section.isConditional && (
              <Badge variant="outline" className="ml-auto text-xs">
                Conditional
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className={cn(isMobileView ? "p-3 pt-0" : "p-4 pt-0")}>
          <div className={cn(
            "bg-muted/50 rounded-md text-muted-foreground italic",
            isMobileView ? "p-2 text-xs" : "p-3 text-sm"
          )}>
            This is where <strong>{section.label}</strong> will appear
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderCustomQuestionInput = (question: CustomQuestion, isMobileView: boolean) => {
    const baseClasses = cn("bg-muted/30", isMobileView ? "h-8 text-xs" : "");
    
    switch (question.type) {
      case 'checkbox':
        return (
          <div className="flex items-center gap-2">
            <Checkbox disabled className="opacity-50" />
            <span className="text-muted-foreground text-sm">Click to check</span>
          </div>
        );
      case 'text':
        return (
          <Input 
            disabled 
            placeholder={question.placeholder || "Enter your answer..."} 
            className={baseClasses}
          />
        );
      case 'number':
        return (
          <Input 
            type="number" 
            disabled 
            placeholder={question.placeholder || "0"} 
            className={cn(baseClasses, "max-w-[120px]")}
          />
        );
      case 'rating':
        return (
          <div className="space-y-2">
            <Slider 
              disabled 
              defaultValue={[5]} 
              min={question.minValue || 1} 
              max={question.maxValue || 10} 
              className="opacity-50"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{question.minLabel || 'Low'}</span>
              <span>{question.maxLabel || 'High'}</span>
            </div>
          </div>
        );
      case 'time':
        return (
          <Input 
            type="time" 
            disabled 
            className={cn(baseClasses, "max-w-[150px]")}
          />
        );
      case 'dropdown':
        return (
          <div className={cn(
            "flex items-center justify-between border rounded-md bg-muted/30 text-muted-foreground",
            isMobileView ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm"
          )}>
            <span>{question.placeholder || "Select option..."}</span>
            <ChevronDown className="h-4 w-4" />
          </div>
        );
      default:
        return null;
    }
  };

  const previewContent = (
    <div className={cn(
      "mx-auto transition-all duration-300",
      viewMode === 'mobile' ? "max-w-[375px]" : "max-w-full"
    )}>
      {/* View toggle */}
      <div className="flex items-center justify-center gap-2 mb-4 pb-4 border-b">
        <Button
          variant={viewMode === 'desktop' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('desktop')}
          className="gap-2"
        >
          <Monitor className="h-4 w-4" />
          Desktop
        </Button>
        <Button
          variant={viewMode === 'mobile' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('mobile')}
          className="gap-2"
        >
          <Smartphone className="h-4 w-4" />
          Mobile
        </Button>
      </div>

      {/* Sections count */}
      <div className="flex items-center justify-between mb-4 text-sm text-muted-foreground">
        <span>{visibleSections.length} sections visible</span>
        {hiddenSections.size > 0 && (
          <span>{hiddenSections.size} hidden</span>
        )}
      </div>

      {/* Preview content */}
      <div className={cn(
        "space-y-3",
        viewMode === 'mobile' ? "space-y-2" : ""
      )}>
        {visibleSections.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <LayoutGrid className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No visible sections</p>
            <p className="text-sm">Enable some sections to see the preview</p>
          </div>
        ) : (
          visibleSections.map(sectionId => 
            renderSectionPreview(sectionId, viewMode === 'mobile')
          )
        )}
      </div>
    </div>
  );

  // Use Drawer for mobile devices
  if (isMobileDevice) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="flex items-center gap-2">
              Daily Page Preview
            </DrawerTitle>
            <DrawerDescription>
              Preview how your daily planning page will look
            </DrawerDescription>
          </DrawerHeader>
          <ScrollArea className="flex-1 px-4 pb-4 max-h-[calc(90vh-100px)]">
            {previewContent}
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Daily Page Preview
          </DialogTitle>
          <DialogDescription>
            Preview how your daily planning page will look
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4 -mr-4">
          {previewContent}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
