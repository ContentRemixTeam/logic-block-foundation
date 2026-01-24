import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Mail, Video, Mic, FileText, MessageSquare, CheckCircle2 } from 'lucide-react';
import { LaunchWizardData } from '@/types/launch';

interface LaunchContentPlanProps {
  data: LaunchWizardData;
  onChange: (updates: Partial<LaunchWizardData>) => void;
}

export function LaunchContentPlan({ data, onChange }: LaunchContentPlanProps) {
  const contentFormats = data.contentFormats || {
    email: true,
    video: false,
    podcast: false,
    blog: false,
    social: true,
  };

  const podcastTopics = data.podcastTopics || ['', '', '', ''];
  const beliefShifts = data.beliefShifts || [];
  const objectionsToAddress = Array.isArray(data.objectionsToAddress) ? data.objectionsToAddress : [];
  const runwayWeeks = data.runwayWeeks || 4;

  const updateFormat = (format: keyof typeof contentFormats, checked: boolean) => {
    onChange({
      contentFormats: { ...contentFormats, [format]: checked },
    });
  };

  const updatePodcastTopic = (index: number, value: string) => {
    const newTopics = [...podcastTopics];
    newTopics[index] = value;
    onChange({ podcastTopics: newTopics });
  };

  // Generate suggested topics based on messaging strategy
  const getSuggestedTopics = () => {
    const topics = [];
    const firstObjection = objectionsToAddress[0] || 'common objection';
    
    topics.push({
      week: -runwayWeeks,
      title: 'Problem awareness content',
      description: beliefShifts[0]?.from 
        ? `Why "${beliefShifts[0].from}" is holding you back`
        : 'Are you struggling with [problem]?',
    });
    
    topics.push({
      week: Math.floor(-runwayWeeks * 0.75),
      title: 'Solution introduction',
      description: beliefShifts[0]?.to 
        ? `The shift: "${beliefShifts[0].to}"`
        : "Here's what actually works",
    });
    
    topics.push({
      week: Math.floor(-runwayWeeks * 0.5),
      title: `Address objection: "${firstObjection}"`,
      description: 'Pre-handle resistance before cart opens',
    });
    
    topics.push({
      week: -1,
      title: 'Social proof & case studies',
      description: 'Show transformation is possible',
    });
    
    return topics;
  };

  const suggestedTopics = getSuggestedTopics();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📝 Pre-Launch Content Topics
        </CardTitle>
        <CardDescription>
          Based on your messaging strategy, here are the topics you should cover in your 
          {runwayWeeks}-week runway period to warm up your list.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Auto-suggested based on belief shifts */}
        <div className="p-4 bg-primary/5 rounded-lg">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            🎯 Suggested Content Topics
          </h4>
          <p className="text-sm text-muted-foreground mb-3">
            Based on your belief shifts and objections:
          </p>
          <ul className="space-y-2 text-sm">
            {suggestedTopics.map((topic, index) => (
              <li key={index} className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                <span>
                  <strong>Week {topic.week}:</strong> {topic.title} - "{topic.description}"
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Content Format Planning */}
        <div className="space-y-3">
          <Label className="text-base font-medium">
            How will you deliver this content?
          </Label>
          
          <div className="space-y-3">
            {/* Email */}
            <div
              className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                contentFormats.email ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
              }`}
              onClick={() => updateFormat('email', !contentFormats.email)}
            >
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="font-medium">Email Sequence</p>
                  <p className="text-xs text-muted-foreground">3-7 emails during runway</p>
                </div>
              </div>
              <Checkbox
                checked={contentFormats.email}
                onCheckedChange={(checked) => updateFormat('email', !!checked)}
              />
            </div>

            {/* Video */}
            <div
              className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                contentFormats.video ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
              }`}
              onClick={() => updateFormat('video', !contentFormats.video)}
            >
              <div className="flex items-center gap-3">
                <Video className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium">Video Series</p>
                  <p className="text-xs text-muted-foreground">YouTube or email videos</p>
                </div>
              </div>
              <Checkbox
                checked={contentFormats.video}
                onCheckedChange={(checked) => updateFormat('video', !!checked)}
              />
            </div>

            {/* Video stats callout */}
            {contentFormats.video && (
              <Alert className="ml-6 bg-purple-50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800">
                <Video className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <AlertTitle className="text-purple-800 dark:text-purple-300">
                  Video Converts 2-3x Higher
                </AlertTitle>
                <AlertDescription className="text-sm text-purple-700 dark:text-purple-400">
                  <strong>Stats you should know:</strong>
                  <ul className="mt-2 space-y-1 ml-4 text-xs">
                    <li>• Email with video gets 96% higher click-through rate</li>
                    <li>• Video on landing page increases conversions by 80%</li>
                    <li>• People retain 95% of a message when watching vs 10% reading</li>
                    <li>• Video viewers are 64-85% more likely to buy</li>
                  </ul>
                  <p className="mt-2 font-medium">
                    💡 Recommendation: Record 3-5 short videos (5-10 min) during runway
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {/* Podcast */}
            <div
              className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                contentFormats.podcast ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
              }`}
              onClick={() => updateFormat('podcast', !contentFormats.podcast)}
            >
              <div className="flex items-center gap-3">
                <Mic className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Podcast Episodes</p>
                  <p className="text-xs text-muted-foreground">Release 2-4 episodes during runway</p>
                </div>
              </div>
              <Checkbox
                checked={contentFormats.podcast}
                onCheckedChange={(checked) => updateFormat('podcast', !!checked)}
              />
            </div>

            {/* Podcast topics */}
            {contentFormats.podcast && (
              <div className="ml-6 space-y-2">
                <Label className="text-sm">Podcast episode topics:</Label>
                {[0, 1, 2, 3].map((index) => (
                  <Input
                    key={index}
                    placeholder={`Episode ${index + 1} topic`}
                    value={podcastTopics[index] || ''}
                    onChange={(e) => updatePodcastTopic(index, e.target.value)}
                  />
                ))}
              </div>
            )}

            {/* Blog */}
            <div
              className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                contentFormats.blog ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
              }`}
              onClick={() => updateFormat('blog', !contentFormats.blog)}
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">Blog Posts / Long-Form</p>
                  <p className="text-xs text-muted-foreground">SEO & authority building</p>
                </div>
              </div>
              <Checkbox
                checked={contentFormats.blog}
                onCheckedChange={(checked) => updateFormat('blog', !!checked)}
              />
            </div>

            {/* Social */}
            <div
              className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                contentFormats.social ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
              }`}
              onClick={() => updateFormat('social', !contentFormats.social)}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium">Social Media Posts</p>
                  <p className="text-xs text-muted-foreground">Daily engagement & value</p>
                </div>
              </div>
              <Checkbox
                checked={contentFormats.social}
                onCheckedChange={(checked) => updateFormat('social', !!checked)}
              />
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="p-4 bg-muted/30 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Your Content Mix</h4>
          <div className="flex flex-wrap gap-2">
            {contentFormats.email && (
              <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded">
                📧 Email Series
              </span>
            )}
            {contentFormats.video && (
              <span className="text-xs px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded">
                🎬 Video
              </span>
            )}
            {contentFormats.podcast && (
              <span className="text-xs px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded">
                🎙️ Podcast
              </span>
            )}
            {contentFormats.blog && (
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded">
                📝 Blog
              </span>
            )}
            {contentFormats.social && (
              <span className="text-xs px-2 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 rounded">
                📱 Social
              </span>
            )}
          </div>
          {!Object.values(contentFormats).some(Boolean) && (
            <p className="text-xs text-amber-600 mt-2">
              ⚠️ Select at least one content format for your runway
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
