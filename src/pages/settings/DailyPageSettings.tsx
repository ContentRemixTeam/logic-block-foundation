import { useState, useEffect, useMemo } from 'react';
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
  Info,
  GripVertical,
  LayoutTemplate,
  Wand2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { toast } from 'sonner';
import { useDailyPageLayout } from '@/hooks/useDailyPageLayout';
import { 
  SectionId, 
  SectionZone,
  SECTION_DEFINITIONS, 
  DEFAULT_SECTION_ORDER,
  CustomQuestion 
} from '@/types/dailyPage';
import { DAILY_PAGE_TEMPLATES, DailyPageTemplate } from '@/data/dailyPageTemplates';
import { DailyPagePreview } from '@/components/settings/DailyPagePreview';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableSectionItem } from '@/components/settings/SortableSectionItem';
import { CustomQuestionBuilder } from '@/components/settings/CustomQuestionBuilder';

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
  const [localSectionOrder, setLocalSectionOrder] = useState<SectionId[]>(DEFAULT_SECTION_ORDER);
  const [localCustomQuestions, setLocalCustomQuestions] = useState<CustomQuestion[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [templateConfirmOpen, setTemplateConfirmOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DailyPageTemplate | null>(null);

  // DnD sensors with touch support
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sync local state when layout loads
  useEffect(() => {
    if (layout) {
      setLocalHiddenSections(new Set(layout.hidden_sections));
      setLocalSectionOrder(layout.section_order);
      setLocalCustomQuestions(layout.custom_questions || []);
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
      await updateLayout({ 
        hidden_sections: Array.from(localHiddenSections),
        section_order: localSectionOrder,
        custom_questions: localCustomQuestions,
      });
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
      setLocalSectionOrder(DEFAULT_SECTION_ORDER);
      setLocalCustomQuestions([]);
      setHasChanges(false);
    } catch (error) {
      // Error already handled in hook
    }
  };

  // Handle drag end for reordering
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localSectionOrder.indexOf(active.id as SectionId);
      const newIndex = localSectionOrder.indexOf(over.id as SectionId);

      const newOrder = arrayMove(localSectionOrder, oldIndex, newIndex);
      setLocalSectionOrder(newOrder);
      setHasChanges(true);
    }
  };

  // Handle arrow button reordering
  const handleMoveSection = (sectionId: SectionId, direction: 'up' | 'down') => {
    const visibleSections = localSectionOrder.filter(id => !localHiddenSections.has(id));
    const currentIndex = visibleSections.indexOf(sectionId);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= visibleSections.length) return;

    // Find the actual indices in the full order
    const fullOldIndex = localSectionOrder.indexOf(sectionId);
    const targetSectionId = visibleSections[newIndex];
    const fullNewIndex = localSectionOrder.indexOf(targetSectionId);

    const newOrder = arrayMove(localSectionOrder, fullOldIndex, fullNewIndex);
    setLocalSectionOrder(newOrder);
    setHasChanges(true);
  };

  // Handle custom questions changes
  const handleCustomQuestionsChange = (questions: CustomQuestion[]) => {
    setLocalCustomQuestions(questions);
    setHasChanges(true);
  };

  // Add custom question section_id to section order
  const handleAddCustomQuestionToOrder = (sectionId: string) => {
    // Add at the end of the section order (user can reorder later)
    setLocalSectionOrder(prev => [...prev, sectionId as SectionId]);
    setHasChanges(true);
  };

  // Remove custom question section_id from section order
  const handleRemoveCustomQuestionFromOrder = (sectionId: string) => {
    setLocalSectionOrder(prev => prev.filter(id => id !== sectionId));
    setHasChanges(true);
  };

  // Check if current layout matches a template
  const currentTemplateMatch = useMemo(() => {
    const currentHiddenArray = Array.from(localHiddenSections).sort();
    const currentOrderArray = localSectionOrder.filter(id => !id.startsWith('custom_question_'));
    
    return DAILY_PAGE_TEMPLATES.find(template => {
      const templateHiddenArray = [...template.hidden_sections].sort();
      const templateOrderArray = template.section_order;
      
      // Check if hidden sections match
      if (currentHiddenArray.length !== templateHiddenArray.length) return false;
      if (!currentHiddenArray.every((id, i) => id === templateHiddenArray[i])) return false;
      
      // Check if visible order matches (just the built-in sections)
      if (currentOrderArray.length !== templateOrderArray.length) return false;
      return currentOrderArray.every((id, i) => id === templateOrderArray[i]);
    });
  }, [localHiddenSections, localSectionOrder]);

  // Apply a template
  const handleApplyTemplate = async (template: DailyPageTemplate, includeCustomQuestions: boolean) => {
    try {
      // Update local state
      setLocalSectionOrder([...template.section_order]);
      setLocalHiddenSections(new Set(template.hidden_sections));
      
      // Optionally add template's custom questions
      if (includeCustomQuestions && template.custom_questions && template.custom_questions.length > 0) {
        // Merge with existing custom questions (avoid duplicates by id)
        const existingIds = new Set(localCustomQuestions.map(q => q.id));
        const newQuestions = template.custom_questions.filter(q => !existingIds.has(q.id));
        
        if (newQuestions.length > 0) {
          const mergedQuestions = [...localCustomQuestions, ...newQuestions];
          setLocalCustomQuestions(mergedQuestions);
          
          // Add new custom question section_ids to section order
          const newSectionOrder = [...template.section_order];
          newQuestions.forEach(q => {
            newSectionOrder.push(q.section_id as SectionId);
          });
          setLocalSectionOrder(newSectionOrder);
        }
      }
      
      // Save immediately
      await updateLayout({
        section_order: includeCustomQuestions && template.custom_questions?.length 
          ? [...template.section_order, ...template.custom_questions.filter(q => !localCustomQuestions.find(lq => lq.id === q.id)).map(q => q.section_id as SectionId)]
          : [...template.section_order],
        hidden_sections: [...template.hidden_sections],
        custom_questions: includeCustomQuestions && template.custom_questions?.length
          ? [...localCustomQuestions, ...template.custom_questions.filter(q => !localCustomQuestions.find(lq => lq.id === q.id))]
          : localCustomQuestions,
      });
      
      setHasChanges(false);
      toast.success(`Template applied! You can customize further below.`);
    } catch (error) {
      toast.error('Failed to apply template');
    }
  };

  const sectionsByCategory = getSectionsByCategory();
  const visibleCount = DEFAULT_SECTION_ORDER.length - localHiddenSections.size;
  const visibleSections = localSectionOrder.filter(id => !localHiddenSections.has(id));

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
        {/* Breadcrumb Navigation */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/settings">Settings</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Daily Page</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => {
                if (hasChanges) {
                  if (window.confirm('You have unsaved changes. Save before leaving?')) {
                    handleSave().then(() => navigate('/settings'));
                  } else {
                    navigate('/settings');
                  }
                } else {
                  navigate('/settings');
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

        {/* Quick Start Templates */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5" />
              Quick Start Templates
            </CardTitle>
            <CardDescription>
              Choose a pre-configured layout, then customize further
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {DAILY_PAGE_TEMPLATES.map(template => {
                const isActive = currentTemplateMatch?.id === template.id;
                const visibleSectionsInTemplate = template.section_order.filter(
                  id => !template.hidden_sections.includes(id)
                );
                
                return (
                  <Card 
                    key={template.id}
                    className={`relative transition-colors ${
                      isActive ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/50'
                    }`}
                  >
                    {isActive && (
                      <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">
                        <Check className="mr-1 h-3 w-3" />
                        Current
                      </Badge>
                    )}
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {template.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Preview of included sections */}
                      <div className="flex flex-wrap gap-1">
                        {visibleSectionsInTemplate.slice(0, 5).map(sectionId => {
                          const section = SECTION_DEFINITIONS[sectionId];
                          if (!section) return null;
                          return (
                            <Badge 
                              key={sectionId}
                              variant="outline" 
                              className="text-xs py-0.5"
                            >
                              {section.label}
                            </Badge>
                          );
                        })}
                        {visibleSectionsInTemplate.length > 5 && (
                          <Badge variant="outline" className="text-xs py-0.5">
                            +{visibleSectionsInTemplate.length - 5} more
                          </Badge>
                        )}
                      </div>
                      
                      {/* Custom questions indicator */}
                      {template.custom_questions && template.custom_questions.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          + {template.custom_questions.length} custom question{template.custom_questions.length !== 1 ? 's' : ''}
                        </p>
                      )}
                      
                      <Button
                        size="sm"
                        variant={isActive ? "outline" : "default"}
                        className="w-full"
                        onClick={() => {
                          if (!isActive) {
                            setSelectedTemplate(template);
                            setTemplateConfirmOpen(true);
                          }
                        }}
                        disabled={isActive}
                      >
                        {isActive ? (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Applied
                          </>
                        ) : (
                          <>
                            <Wand2 className="mr-2 h-4 w-4" />
                            Use This Template
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

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

        {/* Section Reordering */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <GripVertical className="h-5 w-5" />
              Reorder Sections
            </CardTitle>
            <CardDescription>
              Drag to change the order sections appear on your daily page, or use the arrow buttons
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const builtInVisibleSections = visibleSections.filter(id => !id.startsWith('custom_question_'));
              
              return builtInVisibleSections.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No visible sections to reorder. Enable some sections above first.
                </p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={builtInVisibleSections}
                    strategy={verticalListSortingStrategy}
                  >
                  <div className="space-y-2">
                    {visibleSections
                      .filter(sectionId => !sectionId.startsWith('custom_question_'))
                      .map((sectionId, index, filteredSections) => (
                        <SortableSectionItem
                          key={sectionId}
                          id={sectionId}
                          index={index}
                          totalItems={filteredSections.length}
                          onMoveUp={() => handleMoveSection(sectionId, 'up')}
                          onMoveDown={() => handleMoveSection(sectionId, 'down')}
                          zoneConfig={CATEGORY_CONFIG[SECTION_DEFINITIONS[sectionId]?.zone || 'execution']}
                        />
                      ))}
                  </div>
                </SortableContext>
              </DndContext>
              );
            })()}
          </CardContent>
        </Card>

        {/* Custom Check-in Questions */}
        <CustomQuestionBuilder
          customQuestions={localCustomQuestions}
          onQuestionsChange={handleCustomQuestionsChange}
          onSectionOrderChange={handleAddCustomQuestionToOrder}
          onRemoveSectionFromOrder={handleRemoveCustomQuestionFromOrder}
        />

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
            
            <Button variant="outline" onClick={() => setPreviewOpen(true)}>
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
            
            <DailyPagePreview
              open={previewOpen}
              onOpenChange={setPreviewOpen}
              sectionOrder={localSectionOrder}
              hiddenSections={localHiddenSections}
              customQuestions={localCustomQuestions}
            />
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

      {/* Template Confirmation Dialog */}
      <AlertDialog open={templateConfirmOpen} onOpenChange={setTemplateConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply "{selectedTemplate?.name}" Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace your current layout with the template's section order and visibility settings. 
              Your existing custom questions will be preserved.
              {selectedTemplate?.custom_questions && selectedTemplate.custom_questions.length > 0 && (
                <span className="block mt-2">
                  This template includes {selectedTemplate.custom_questions.length} custom question{selectedTemplate.custom_questions.length !== 1 ? 's' : ''} that will be added to your layout.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedTemplate(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedTemplate) {
                  handleApplyTemplate(
                    selectedTemplate, 
                    (selectedTemplate.custom_questions?.length ?? 0) > 0
                  );
                }
                setTemplateConfirmOpen(false);
                setSelectedTemplate(null);
              }}
            >
              Apply Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
