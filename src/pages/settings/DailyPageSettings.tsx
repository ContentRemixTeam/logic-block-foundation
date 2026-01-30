import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Settings, 
  Check, 
  ArrowLeft, 
  RotateCcw,
  Eye,
  CheckSquare,
  Anchor,
  Brain,
  Target,
  ListOrdered,
  Sparkles,
  Calendar,
  CalendarDays,
  RotateCcw as CycleIcon,
  Pencil,
  CalendarClock,
  LayoutGrid,
  Send,
  Heart,
  Zap,
  CheckCircle,
  Moon,
  Focus,
  Info
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useDailyPageLayout } from '@/hooks/useDailyPageLayout';
import { 
  SectionId, 
  SectionZone,
  SECTION_DEFINITIONS, 
  DEFAULT_SECTION_ORDER 
} from '@/types/dailyPage';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  RotateCcw: CycleIcon,
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

// Category display config
const CATEGORY_CONFIG: Record<SectionZone, { label: string; description: string; color: string }> = {
  banners: { label: 'Banners', description: 'System notifications and alerts', color: 'bg-blue-500/10 text-blue-600' },
  morning: { label: 'Morning', description: 'Start your day with intention', color: 'bg-amber-500/10 text-amber-600' },
  context: { label: 'Context', description: 'Stay aligned with your goals', color: 'bg-purple-500/10 text-purple-600' },
  execution: { label: 'Execution', description: 'Get things done', color: 'bg-emerald-500/10 text-emerald-600' },
  evening: { label: 'Evening', description: 'Reflect and wind down', color: 'bg-indigo-500/10 text-indigo-600' },
  navigation: { label: 'Navigation', description: 'Quick actions', color: 'bg-slate-500/10 text-slate-600' },
};

// Group sections by zone
const getSectionsByCategory = (): Record<SectionZone, SectionId[]> => {
  const grouped: Record<SectionZone, SectionId[]> = {
    banners: [],
    morning: [],
    context: [],
    execution: [],
    evening: [],
    navigation: [],
  };

  DEFAULT_SECTION_ORDER.forEach(id => {
    const section = SECTION_DEFINITIONS[id];
    if (section) {
      grouped[section.zone].push(id);
    }
  });

  return grouped;
};

export default function DailyPageSettings() {
  const navigate = useNavigate();
  const { layout, isLoading, updateLayout, resetToDefault, isUpdating, isResetting } = useDailyPageLayout();
  const [localHiddenSections, setLocalHiddenSections] = useState<Set<SectionId>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Sync local state when layout loads
  useEffect(() => {
    if (layout) {
      setLocalHiddenSections(new Set(layout.hidden_sections));
      setHasChanges(false);
    }
  }, [layout]);

  const handleToggleSection = (sectionId: SectionId) => {
    const section = SECTION_DEFINITIONS[sectionId];
    
    // Don't allow hiding required sections
    if (!section.canHide) {
      toast.error(`${section.label} cannot be hidden`);
      return;
    }

    const newHidden = new Set(localHiddenSections);
    if (newHidden.has(sectionId)) {
      newHidden.delete(sectionId);
    } else {
      newHidden.add(sectionId);
    }
    
    setLocalHiddenSections(newHidden);
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updateLayout({ hidden_sections: Array.from(localHiddenSections) });
      setHasChanges(false);
      toast.success('Daily page layout saved');
    } catch (error) {
      toast.error('Failed to save layout');
    }
  };

  const handleReset = async () => {
    try {
      await resetToDefault();
      setLocalHiddenSections(new Set());
      setHasChanges(false);
    } catch (error) {
      // Error already handled in hook
    }
  };

  const sectionsByCategory = getSectionsByCategory();
  const visibleCount = DEFAULT_SECTION_ORDER.length - localHiddenSections.size;

  if (isLoading) {
    return (
      <Layout>
        <div className="container max-w-3xl py-8 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-3xl py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => {
                if (hasChanges) {
                  if (window.confirm('You have unsaved changes. Save before leaving?')) {
                    handleSave().then(() => navigate(-1));
                  } else {
                    navigate(-1);
                  }
                } else {
                  navigate(-1);
                }
              }}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Settings className="h-6 w-6" />
                Daily Page Customization
              </h1>
              <p className="text-muted-foreground">
                Choose which sections appear on your daily planning page
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Badge variant="outline" className="text-amber-600 border-amber-600">
                Unsaved changes
              </Badge>
            )}
            <Badge variant="secondary">
              {visibleCount} of {DEFAULT_SECTION_ORDER.length} visible
            </Badge>
          </div>
        </div>

        {/* Section Categories */}
        <div className="space-y-6">
          {(['morning', 'context', 'execution', 'evening'] as SectionZone[]).map(zone => {
            const sections = sectionsByCategory[zone];
            if (sections.length === 0) return null;

            const config = CATEGORY_CONFIG[zone];
            const visibleInCategory = sections.filter(id => !localHiddenSections.has(id)).length;

            return (
              <Card key={zone}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Badge className={config.color}>{config.label}</Badge>
                        <span className="text-sm font-normal text-muted-foreground">
                          {visibleInCategory} of {sections.length} visible
                        </span>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {config.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {sections.map(sectionId => {
                    const section = SECTION_DEFINITIONS[sectionId];
                    const Icon = ICON_MAP[section.icon] || CheckSquare;
                    const isHidden = localHiddenSections.has(sectionId);
                    const isRequired = !section.canHide;

                    return (
                      <div
                        key={sectionId}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                          isHidden ? 'bg-muted/50 opacity-60' : 'bg-card'
                        }`}
                      >
                        <Checkbox
                          id={sectionId}
                          checked={!isHidden}
                          onCheckedChange={() => handleToggleSection(sectionId)}
                          disabled={isRequired}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <label
                            htmlFor={sectionId}
                            className={`flex items-center gap-2 font-medium cursor-pointer ${
                              isRequired ? 'cursor-not-allowed' : ''
                            }`}
                          >
                            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="truncate">{section.label}</span>
                            {isRequired && (
                              <Badge variant="outline" className="text-xs shrink-0">
                                Required
                              </Badge>
                            )}
                            {section.isConditional && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{section.conditionDescription}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </label>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {section.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={handleReset}
              disabled={isResetting}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset to Default
            </Button>
            
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Daily Page Preview</DialogTitle>
                  <DialogDescription>
                    Sections that will appear on your daily planning page
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 mt-4">
                  {DEFAULT_SECTION_ORDER.filter(id => !localHiddenSections.has(id)).map(sectionId => {
                    const section = SECTION_DEFINITIONS[sectionId];
                    const Icon = ICON_MAP[section.icon] || CheckSquare;
                    const zoneConfig = CATEGORY_CONFIG[section.zone];

                    return (
                      <div
                        key={sectionId}
                        className="flex items-center gap-3 p-2 rounded-md bg-muted/50"
                      >
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 text-sm">{section.label}</span>
                        <Badge className={`${zoneConfig.color} text-xs`}>
                          {zoneConfig.label}
                        </Badge>
                      </div>
                    );
                  })}
                  {localHiddenSections.size > 0 && (
                    <p className="text-xs text-muted-foreground pt-2 border-t mt-4">
                      {localHiddenSections.size} section{localHiddenSections.size !== 1 ? 's' : ''} hidden
                    </p>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || isUpdating}
          >
            {isUpdating ? (
              <>Saving...</>
            ) : hasChanges ? (
              <>Save Changes</>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Saved
              </>
            )}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
