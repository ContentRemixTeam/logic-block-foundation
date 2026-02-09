import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Lightbulb, 
  Loader2, 
  RefreshCw, 
  Sparkles, 
  PenLine,
  MessageSquare,
  ArrowRight,
  Check
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TopicIdea {
  topic: string;
  hook: string;
  angle: string;
}

interface SocialPostIdeationProps {
  platform: 'instagram_post' | 'linkedin_post' | 'twitter_thread' | 'social_post';
  onComplete: (context: { topic: string; userThoughts: string }) => void;
  onSkip: () => void;
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram_post: 'Instagram',
  linkedin_post: 'LinkedIn',
  twitter_thread: 'Twitter/X',
  social_post: 'Social Media',
};

const JOURNAL_PROMPTS = [
  "What's a mistake you made recently that taught you something valuable?",
  "What's a common belief in your industry that you disagree with?",
  "What's something you wish you knew when you started?",
  "What's a recent win (big or small) you could share?",
  "What question do you get asked most often?",
  "What's a simple habit that's made a big difference for you?",
  "What's frustrating you right now that your audience probably relates to?",
  "What's an unpopular opinion you hold about your field?",
];

export function SocialPostIdeation({ platform, onComplete, onSkip }: SocialPostIdeationProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [topics, setTopics] = useState<TopicIdea[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<TopicIdea | null>(null);
  const [userThoughts, setUserThoughts] = useState('');
  const [activeTab, setActiveTab] = useState<'braindump' | 'prompts'>('braindump');
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);

  const generateTopics = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-topic-ideas', {
        body: { platform },
      });

      if (error) throw error;
      
      setTopics(data.topics || []);
    } catch (error) {
      console.error('Failed to generate topics:', error);
      toast.error('Failed to generate topics. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectTopic = (topic: TopicIdea) => {
    setSelectedTopic(topic);
    setUserThoughts('');
    setSelectedPrompt(null);
  };

  const handleSelectPrompt = (prompt: string) => {
    setSelectedPrompt(prompt);
    setUserThoughts('');
  };

  const handleComplete = () => {
    if (!selectedTopic) {
      toast.error('Please select a topic first');
      return;
    }

    if (!userThoughts.trim()) {
      toast.error('Please share your thoughts on this topic');
      return;
    }

    onComplete({
      topic: `${selectedTopic.topic} - ${selectedTopic.angle}`,
      userThoughts: userThoughts.trim(),
    });
  };

  const platformLabel = PLATFORM_LABELS[platform] || 'Social';

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle>What do you want to post about?</CardTitle>
        </div>
        <CardDescription>
          Let's create a high-quality {platformLabel} post based on YOUR ideas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step 1: Generate or Select Topics */}
        {!selectedTopic && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Step 1: Pick a topic</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={generateTopics}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : topics.length > 0 ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    New Ideas
                  </>
                ) : (
                  <>
                    <Lightbulb className="h-4 w-4 mr-2" />
                    Suggest Topics
                  </>
                )}
              </Button>
            </div>

            {topics.length > 0 ? (
              <div className="grid gap-3">
                {topics.map((topic, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectTopic(topic)}
                    className={cn(
                      "text-left p-4 rounded-lg border transition-all hover:border-primary/50 hover:bg-muted/50",
                      "focus:outline-none focus:ring-2 focus:ring-primary/20"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <p className="font-medium">{topic.topic}</p>
                        <p className="text-sm text-muted-foreground">{topic.angle}</p>
                        <p className="text-xs text-primary/80 italic">"{topic.hook}"</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border rounded-lg bg-muted/30">
                <Lightbulb className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  Click "Suggest Topics" to get AI-generated topic ideas,<br />
                  or skip this step if you already know what to write about
                </p>
                <Button variant="ghost" size="sm" onClick={onSkip}>
                  Skip - I know what I want to write
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Brain Dump or Journal Prompts */}
        {selectedTopic && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Step 2: Share your thoughts</Label>
                <p className="text-xs text-muted-foreground">
                  Your ideas make the content authentic and high-quality
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTopic(null)}
              >
                ← Change Topic
              </Button>
            </div>

            {/* Selected Topic Display */}
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Check className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Selected Topic</span>
              </div>
              <p className="text-sm">{selectedTopic.topic}</p>
              <p className="text-xs text-muted-foreground">{selectedTopic.angle}</p>
            </div>

            {/* Tabs: Brain Dump or Journal Prompts */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'braindump' | 'prompts')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="braindump" className="gap-2">
                  <PenLine className="h-4 w-4" />
                  Brain Dump
                </TabsTrigger>
                <TabsTrigger value="prompts" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Journal Prompts
                </TabsTrigger>
              </TabsList>

              <TabsContent value="braindump" className="space-y-3 mt-4">
                <p className="text-sm text-muted-foreground">
                  Write freely about this topic. What do you want your audience to know? 
                  What's your take? Any examples or stories?
                </p>
                <Textarea
                  placeholder={`Share your thoughts on "${selectedTopic.topic}"...\n\nTip: Write like you're texting a friend. We'll polish it later.`}
                  value={userThoughts}
                  onChange={(e) => setUserThoughts(e.target.value)}
                  className="min-h-[150px]"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {userThoughts.length} characters {userThoughts.length < 50 && userThoughts.length > 0 && '(aim for 50+)'}
                </p>
              </TabsContent>

              <TabsContent value="prompts" className="space-y-3 mt-4">
                <p className="text-sm text-muted-foreground">
                  Pick a prompt to help you think about this topic:
                </p>
                <div className="grid gap-2">
                  {JOURNAL_PROMPTS.slice(0, 4).map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectPrompt(prompt)}
                      className={cn(
                        "text-left p-3 text-sm rounded-lg border transition-all",
                        selectedPrompt === prompt
                          ? "border-primary bg-primary/5"
                          : "hover:border-primary/50 hover:bg-muted/50"
                      )}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>

                {selectedPrompt && (
                  <div className="space-y-2 pt-2">
                    <Label className="text-sm">Your answer:</Label>
                    <Textarea
                      placeholder="Write your thoughts here..."
                      value={userThoughts}
                      onChange={(e) => setUserThoughts(e.target.value)}
                      className="min-h-[120px]"
                    />
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Complete Button */}
            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleComplete}
                disabled={!userThoughts.trim() || userThoughts.length < 20}
                className="flex-1"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Post from My Ideas
              </Button>
            </div>

            {userThoughts.length > 0 && userThoughts.length < 20 && (
              <p className="text-xs text-amber-600">
                Add a bit more detail (at least 20 characters) to create better content
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
