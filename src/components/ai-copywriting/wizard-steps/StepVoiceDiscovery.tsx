import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BrandWizardData, VoiceProfile } from '@/types/aiCopywriting';
import { OpenAIService } from '@/lib/openai-service';
import { Loader2, CheckCircle2, AlertTriangle, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface StepVoiceDiscoveryProps {
  data: BrandWizardData;
  onChange: (updates: Partial<BrandWizardData>) => void;
  apiKey: { key_status: string } | null;
}

export function StepVoiceDiscovery({ data, onChange, apiKey }: StepVoiceDiscoveryProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const updateSample = (type: 'voiceSamples' | 'transcriptSamples' | 'customerReviews', index: number, value: string) => {
    const updated = [...data[type]];
    updated[index] = value;
    onChange({ [type]: updated });
  };

  const totalValidSamples = [
    ...data.voiceSamples.filter(s => s.trim().length >= 50),
    ...data.transcriptSamples.filter(s => s.trim().length >= 50),
  ].length;

  const handleAnalyze = async () => {
    if (!apiKey || apiKey.key_status !== 'valid') {
      toast.error('Please configure your API key in Settings first');
      return;
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Not authenticated');
      return;
    }

    if (totalValidSamples < 2) {
      toast.error('Please provide at least 2 writing samples (50+ characters each)');
      return;
    }

    setIsAnalyzing(true);
    try {
      const allSamples = [
        ...data.voiceSamples.filter(s => s.trim().length >= 50),
        ...data.transcriptSamples.filter(s => s.trim().length >= 50),
      ];

      // Pass userId so the service can fetch the API key internally
      const result = await OpenAIService.analyzeVoice(user.id, allSamples);

      onChange({ voiceProfile: result, voiceAnalyzed: true });
      toast.success('Voice profile created! AI will now match your writing style.');
    } catch (error) {
      console.error('Voice analysis failed:', error);
      toast.error(error instanceof Error ? error.message : 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Learn Your Voice</h3>
        <p className="text-muted-foreground">
          Help AI understand your unique writing style
        </p>
      </div>

      {!apiKey && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You need to configure your OpenAI API key first. Go to the Settings tab.
          </AlertDescription>
        </Alert>
      )}

      <Card className="bg-muted/50 border-dashed">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-warning mt-0.5" />
            <div>
              <p className="font-medium text-sm">What makes good voice samples?</p>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li>• Emails you've sent to your list</li>
                <li>• Social media posts in your voice</li>
                <li>• Blog posts or articles you wrote</li>
                <li>• Sales page copy you created</li>
                <li>• Anything YOU wrote (not templates or AI)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="copy" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="copy">Your Writing</TabsTrigger>
          <TabsTrigger value="transcripts">Transcripts</TabsTrigger>
          <TabsTrigger value="reviews">Customer Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="copy" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Paste 2-3 examples of things YOU wrote (emails, posts, articles)
          </p>
          
          {[0, 1, 2].map((index) => (
            <div key={index}>
              <Label>Sample {index + 1} {index < 2 ? '*' : '(optional)'}</Label>
              <Textarea
                value={data.voiceSamples[index] || ''}
                onChange={(e) => updateSample('voiceSamples', index, e.target.value)}
                placeholder="Paste your writing here... (minimum 50 characters)"
                className="mt-2 min-h-[120px]"
                maxLength={2000}
              />
              {data.voiceSamples[index]?.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {data.voiceSamples[index].length} characters
                  {data.voiceSamples[index].length < 50 && ' (needs 50+ for analysis)'}
                </p>
              )}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="transcripts" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Transcripts from videos, podcasts, or webinars where you spoke naturally
          </p>
          
          {[0, 1, 2].map((index) => (
            <div key={index}>
              <Label>Transcript {index + 1} (optional)</Label>
              <Textarea
                value={data.transcriptSamples[index] || ''}
                onChange={(e) => updateSample('transcriptSamples', index, e.target.value)}
                placeholder="Paste transcript here..."
                className="mt-2 min-h-[120px]"
                maxLength={10000}
              />
            </div>
          ))}
        </TabsContent>

        <TabsContent value="reviews" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Customer testimonials or reviews (helps match tone your audience responds to)
          </p>
          
          {[0, 1, 2].map((index) => (
            <div key={index}>
              <Label>Review {index + 1} (optional)</Label>
              <Textarea
                value={data.customerReviews[index] || ''}
                onChange={(e) => updateSample('customerReviews', index, e.target.value)}
                placeholder="Paste customer review here..."
                className="mt-2 min-h-[100px]"
                maxLength={1000}
              />
            </div>
          ))}
        </TabsContent>
      </Tabs>

      {/* Voice Analysis Results */}
      {data.voiceAnalyzed && data.voiceProfile && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Voice Profile Created</CardTitle>
            </div>
            <CardDescription>
              AI will now match this writing style when generating copy
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-2">Style Summary:</p>
              <p className="text-sm text-muted-foreground">{data.voiceProfile.style_summary}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium">Formality</p>
                <p className="text-lg font-bold">{data.voiceProfile.tone_scores?.formality || 5}/10</p>
              </div>
              <div>
                <p className="text-xs font-medium">Energy</p>
                <p className="text-lg font-bold">{data.voiceProfile.tone_scores?.energy || 5}/10</p>
              </div>
              <div>
                <p className="text-xs font-medium">Humor</p>
                <p className="text-lg font-bold">{data.voiceProfile.tone_scores?.humor || 5}/10</p>
              </div>
              <div>
                <p className="text-xs font-medium">Emotion</p>
                <p className="text-lg font-bold">{data.voiceProfile.tone_scores?.emotion || 5}/10</p>
              </div>
            </div>

            {data.voiceProfile.signature_phrases && data.voiceProfile.signature_phrases.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Your Signature Phrases:</p>
                <div className="flex flex-wrap gap-2">
                  {data.voiceProfile.signature_phrases.slice(0, 6).map((phrase, i) => (
                    <span key={i} className="text-xs bg-background px-2 py-1 rounded border">
                      "{phrase}"
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Analysis Button */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-sm text-muted-foreground">
          {totalValidSamples} valid sample{totalValidSamples !== 1 ? 's' : ''} provided
          {totalValidSamples < 2 && ' (need 2+)'}
        </div>
        <Button
          onClick={handleAnalyze}
          disabled={!apiKey || apiKey.key_status !== 'valid' || totalValidSamples < 2 || isAnalyzing}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing Voice...
            </>
          ) : data.voiceAnalyzed ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Re-analyze Voice
            </>
          ) : (
            'Analyze Voice'
          )}
        </Button>
      </div>
    </div>
  );
}
