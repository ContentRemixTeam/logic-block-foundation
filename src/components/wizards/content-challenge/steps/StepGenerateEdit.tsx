import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Loader2, Sparkles, Check, Edit2, ChevronRight, ChevronLeft,
  Instagram, Linkedin, Twitter, Video, Facebook, FileText, Youtube, Mail 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ContentChallengeWizardData, ContentDayDraft, AVAILABLE_PLATFORMS } from '@/types/contentChallenge';
import { toast } from 'sonner';

interface StepGenerateEditProps {
  data: ContentChallengeWizardData;
  setData: (updates: Partial<ContentChallengeWizardData>) => void;
  goNext: () => void;
  goBack: () => void;
}

const PLATFORM_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  linkedin: Linkedin,
  twitter: Twitter,
  tiktok: Video,
  facebook: Facebook,
  blog: FileText,
  youtube: Youtube,
  email: Mail,
};

export default function StepGenerateEdit({ data, setData }: StepGenerateEditProps) {
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);
  const [isGeneratingCopy, setIsGeneratingCopy] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [editingCopy, setEditingCopy] = useState('');

  const currentPlatform = data.platformOrder?.[data.currentPlatformIndex] || data.selectedPlatforms?.[0];
  const currentPlatformInfo = AVAILABLE_PLATFORMS.find(p => p.id === currentPlatform);
  const currentContent = data.contentByPlatform?.[currentPlatform] || [];
  const Icon = currentPlatform ? PLATFORM_ICONS[currentPlatform] || FileText : FileText;

  const handleGenerateIdeas = async () => {
    if (!currentPlatform) return;

    setIsGeneratingIdeas(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('generate-platform-content', {
        body: {
          platform: currentPlatform,
          pillars: data.newPillars,
          pillarIds: data.selectedPillarIds,
          idealCustomer: data.idealCustomer,
          problemsSolved: data.problemsSolved,
          promotionContext: data.promotionContext,
        },
      });

      if (error) throw error;

      if (result?.ideas) {
        const ideas: ContentDayDraft[] = result.ideas.map((idea: any, index: number) => ({
          dayNumber: index + 1,
          platform: currentPlatform,
          pillarId: idea.pillarId || null,
          pillarName: idea.pillarName || '',
          title: idea.title,
          hook: idea.hook,
          contentIdea: idea.contentIdea || '',
          fullCopy: '',
          status: 'idea' as const,
        }));

        setData({
          contentByPlatform: {
            ...data.contentByPlatform,
            [currentPlatform]: ideas,
          },
        });
        toast.success('30 content ideas generated!');
      }
    } catch (error) {
      console.error('Error generating ideas:', error);
      toast.error('Failed to generate content ideas');
    } finally {
      setIsGeneratingIdeas(false);
    }
  };

  const handleGenerateCopy = async (dayNumber: number) => {
    if (!currentPlatform) return;

    const dayContent = currentContent.find(c => c.dayNumber === dayNumber);
    if (!dayContent) return;

    setIsGeneratingCopy(dayNumber);
    try {
      const { data: result, error } = await supabase.functions.invoke('generate-single-post', {
        body: {
          platform: currentPlatform,
          title: dayContent.title,
          hook: dayContent.hook,
          contentIdea: dayContent.contentIdea,
          pillarName: dayContent.pillarName,
          idealCustomer: data.idealCustomer,
          promotionContext: data.promotionContext,
        },
      });

      if (error) throw error;

      if (result?.copy) {
        const updatedContent = currentContent.map(c =>
          c.dayNumber === dayNumber
            ? { ...c, fullCopy: result.copy, status: 'generated' as const }
            : c
        );

        setData({
          contentByPlatform: {
            ...data.contentByPlatform,
            [currentPlatform]: updatedContent,
          },
        });
        toast.success(`Day ${dayNumber} copy generated!`);
      }
    } catch (error) {
      console.error('Error generating copy:', error);
      toast.error('Failed to generate copy');
    } finally {
      setIsGeneratingCopy(null);
    }
  };

  const handleEditCopy = (dayNumber: number) => {
    const dayContent = currentContent.find(c => c.dayNumber === dayNumber);
    if (dayContent) {
      setSelectedDay(dayNumber);
      setEditingCopy(dayContent.fullCopy);
    }
  };

  const handleSaveCopy = () => {
    if (selectedDay === null) return;

    const updatedContent = currentContent.map(c =>
      c.dayNumber === selectedDay
        ? { ...c, fullCopy: editingCopy, status: 'edited' as const }
        : c
    );

    setData({
      contentByPlatform: {
        ...data.contentByPlatform,
        [currentPlatform]: updatedContent,
      },
    });

    setSelectedDay(null);
    setEditingCopy('');
    toast.success('Copy saved!');
  };

  const handleFinalize = (dayNumber: number) => {
    const updatedContent = currentContent.map(c =>
      c.dayNumber === dayNumber
        ? { ...c, status: 'finalized' as const }
        : c
    );

    setData({
      contentByPlatform: {
        ...data.contentByPlatform,
        [currentPlatform]: updatedContent,
      },
    });
  };

  const handleNextPlatform = () => {
    if (data.currentPlatformIndex < (data.platformOrder?.length || 1) - 1) {
      setData({ currentPlatformIndex: data.currentPlatformIndex + 1 });
      setSelectedDay(null);
    }
  };

  const handlePrevPlatform = () => {
    if (data.currentPlatformIndex > 0) {
      setData({ currentPlatformIndex: data.currentPlatformIndex - 1 });
      setSelectedDay(null);
    }
  };

  const finalizedCount = currentContent.filter(c => c.status === 'finalized').length;
  const generatedCount = currentContent.filter(c => c.status !== 'idea').length;
  const progress = (finalizedCount / 30) * 100;

  return (
    <div className="space-y-6">
      {/* Platform Navigation */}
      {data.selectedPlatforms.length > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevPlatform}
            disabled={data.currentPlatformIndex === 0}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous Platform
          </Button>
          <div className="text-center">
            <div className="flex items-center gap-2 justify-center">
              <Icon className="h-5 w-5" />
              <span className="font-medium">{currentPlatformInfo?.name}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              Platform {data.currentPlatformIndex + 1} of {data.selectedPlatforms.length}
            </span>
          </div>
          <Button
            variant="outline"
            onClick={handleNextPlatform}
            disabled={data.currentPlatformIndex === data.selectedPlatforms.length - 1}
          >
            Next Platform
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Progress Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">{currentPlatformInfo?.name}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {finalizedCount}/30 finalized
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>{currentContent.length} ideas</span>
            <span>{generatedCount} with copy</span>
            <span>{finalizedCount} finalized</span>
          </div>
        </CardContent>
      </Card>

      {/* Generate Ideas Button (if no content yet) */}
      {currentContent.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Icon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Generate 30 Days of {currentPlatformInfo?.name} Ideas</h3>
            <p className="text-sm text-muted-foreground mb-6">
              We'll create content ideas based on your pillars and ideal customer
            </p>
            <Button onClick={handleGenerateIdeas} disabled={isGeneratingIdeas} size="lg">
              {isGeneratingIdeas ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Ideas...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate 30 Ideas
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Content List */}
      {currentContent.length > 0 && (
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All (30)</TabsTrigger>
            <TabsTrigger value="ideas">Ideas ({currentContent.filter(c => c.status === 'idea').length})</TabsTrigger>
            <TabsTrigger value="generated">Generated ({generatedCount})</TabsTrigger>
            <TabsTrigger value="finalized">Finalized ({finalizedCount})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <ScrollArea className="h-[500px]">
              <div className="space-y-3 pr-4">
                {currentContent.map((day) => (
                  <ContentDayCard
                    key={day.dayNumber}
                    day={day}
                    isGenerating={isGeneratingCopy === day.dayNumber}
                    onGenerateCopy={() => handleGenerateCopy(day.dayNumber)}
                    onEdit={() => handleEditCopy(day.dayNumber)}
                    onFinalize={() => handleFinalize(day.dayNumber)}
                  />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="ideas" className="mt-4">
            <ScrollArea className="h-[500px]">
              <div className="space-y-3 pr-4">
                {currentContent.filter(c => c.status === 'idea').map((day) => (
                  <ContentDayCard
                    key={day.dayNumber}
                    day={day}
                    isGenerating={isGeneratingCopy === day.dayNumber}
                    onGenerateCopy={() => handleGenerateCopy(day.dayNumber)}
                    onEdit={() => handleEditCopy(day.dayNumber)}
                    onFinalize={() => handleFinalize(day.dayNumber)}
                  />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="generated" className="mt-4">
            <ScrollArea className="h-[500px]">
              <div className="space-y-3 pr-4">
                {currentContent.filter(c => c.status !== 'idea').map((day) => (
                  <ContentDayCard
                    key={day.dayNumber}
                    day={day}
                    isGenerating={isGeneratingCopy === day.dayNumber}
                    onGenerateCopy={() => handleGenerateCopy(day.dayNumber)}
                    onEdit={() => handleEditCopy(day.dayNumber)}
                    onFinalize={() => handleFinalize(day.dayNumber)}
                  />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="finalized" className="mt-4">
            <ScrollArea className="h-[500px]">
              <div className="space-y-3 pr-4">
                {currentContent.filter(c => c.status === 'finalized').map((day) => (
                  <ContentDayCard
                    key={day.dayNumber}
                    day={day}
                    isGenerating={isGeneratingCopy === day.dayNumber}
                    onGenerateCopy={() => handleGenerateCopy(day.dayNumber)}
                    onEdit={() => handleEditCopy(day.dayNumber)}
                    onFinalize={() => handleFinalize(day.dayNumber)}
                  />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      )}

      {/* Edit Modal */}
      {selectedDay !== null && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <CardHeader>
              <CardTitle>Edit Day {selectedDay} Copy</CardTitle>
              <CardDescription>
                {currentContent.find(c => c.dayNumber === selectedDay)?.title}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={editingCopy}
                onChange={(e) => setEditingCopy(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
                placeholder="Enter your content..."
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedDay(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveCopy}>
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Content Day Card Component
function ContentDayCard({
  day,
  isGenerating,
  onGenerateCopy,
  onEdit,
  onFinalize,
}: {
  day: ContentDayDraft;
  isGenerating: boolean;
  onGenerateCopy: () => void;
  onEdit: () => void;
  onFinalize: () => void;
}) {
  const statusColors = {
    idea: 'bg-muted text-muted-foreground',
    generated: 'bg-blue-500/10 text-blue-600',
    edited: 'bg-amber-500/10 text-amber-600',
    finalized: 'bg-green-500/10 text-green-600',
  };

  return (
    <Card className={day.status === 'finalized' ? 'border-green-500/30' : ''}>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="font-mono text-xs">
                Day {day.dayNumber}
              </Badge>
              {day.pillarName && (
                <Badge variant="secondary" className="text-xs">
                  {day.pillarName}
                </Badge>
              )}
              <Badge className={statusColors[day.status]}>
                {day.status}
              </Badge>
            </div>
            <h4 className="font-medium truncate">{day.title}</h4>
            {day.hook && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{day.hook}</p>
            )}
            {day.fullCopy && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-3 bg-muted/50 p-2 rounded">
                {day.fullCopy}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {day.status === 'idea' && (
              <Button size="sm" onClick={onGenerateCopy} disabled={isGenerating}>
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="mr-1 h-3 w-3" />
                    Generate
                  </>
                )}
              </Button>
            )}
            {day.status !== 'idea' && day.status !== 'finalized' && (
              <>
                <Button size="sm" variant="outline" onClick={onEdit}>
                  <Edit2 className="mr-1 h-3 w-3" />
                  Edit
                </Button>
                <Button size="sm" onClick={onFinalize}>
                  <Check className="mr-1 h-3 w-3" />
                  Finalize
                </Button>
              </>
            )}
            {day.status === 'finalized' && (
              <Button size="sm" variant="ghost" onClick={onEdit}>
                <Edit2 className="mr-1 h-3 w-3" />
                Edit
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
