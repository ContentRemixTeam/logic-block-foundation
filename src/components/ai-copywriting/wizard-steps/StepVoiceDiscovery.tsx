import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BrandWizardData, VoiceProfile } from '@/types/aiCopywriting';
import { OpenAIService } from '@/lib/openai-service';
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

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
      toast.error('Please configure your API key first');
      return;
    }

    setIsAnalyzing(true);
    try {
      const allSamples = [
        ...data.voiceSamples.filter(s => s.trim().length >= 50),
        ...data.transcriptSamples.filter(s => s.trim().length >= 50),
      ];

      // We need to get the decrypted key - for now we'll call through the service
      const result = await OpenAIService.analyzeVoice(
        '', // The service will fetch the key internally
        allSamples
      );

      onChange({ voiceProfile: result, voiceAnalyzed: true });
      toast.success('Voice profile created!');
    } catch (error) {
      console.error('Voice analysis failed:', error);
      toast.error('Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Learn Your Voice</h3>
        <p className="text-muted-foreground">
          Help AI understand how you write by providing examples
        </p>
      </div>

      {!apiKey && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Configure your API key first to analyze your voice.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="copy" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="copy">My Copy</TabsTrigger>
          <TabsTrigger value="transcripts">Transcripts</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="copy" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Paste 2-5 examples of your best copy (emails, posts, content)
          </p>
          {data.voiceSamples.map((sample, i) => (
            <Textarea
              key={i}
              value={sample}
              onChange={(e) => updateSample('voiceSamples', i, e.target.value)}
              placeholder="Paste an email, post, or excerpt here..."
              className="min-h-[120px]"
              maxLength={2000}
            />
          ))}
        </TabsContent>

        <TabsContent value="transcripts" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Paste transcripts from podcasts, videos, or calls
          </p>
          {data.transcriptSamples.map((sample, i) => (
            <Textarea
              key={i}
              value={sample}
              onChange={(e) => updateSample('transcriptSamples', i, e.target.value)}
              placeholder="Paste transcript here..."
              className="min-h-[150px]"
              maxLength={10000}
            />
          ))}
        </TabsContent>

        <TabsContent value="reviews" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Paste customer testimonials or reviews (optional)
          </p>
          {data.customerReviews.map((sample, i) => (
            <Textarea
              key={i}
              value={sample}
              onChange={(e) => updateSample('customerReviews', i, e.target.value)}
              placeholder="Paste review or testimonial..."
              className="min-h-[100px]"
              maxLength={1000}
            />
          ))}
        </TabsContent>
      </Tabs>

      {data.voiceAnalyzed && data.voiceProfile ? (
        <div className="p-4 border rounded-lg bg-muted/50">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <span className="font-medium">Voice Profile Created</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {data.voiceProfile.style_summary}
          </p>
        </div>
      ) : (
        <Button
          onClick={handleAnalyze}
          disabled={totalValidSamples < 2 || isAnalyzing || !apiKey}
          className="w-full"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing your voice... (30-45s)
            </>
          ) : (
            `Analyze My Voice (${totalValidSamples}/2 samples)`
          )}
        </Button>
      )}
    </div>
  );
}
