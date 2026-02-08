import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  useProducts, 
  useGenerateCopy, 
  useRateCopy,
  useRecentGenerations,
  useAPIKey
} from '@/hooks/useAICopywriting';
import { 
  ContentType, 
  CONTENT_TYPE_OPTIONS,
  FEEDBACK_TAGS
} from '@/types/aiCopywriting';
import { getAIDetectionAssessment } from '@/lib/ai-detection-checker';
import { AddToCalendarModal } from './AddToCalendarModal';
import { 
  Sparkles, 
  Loader2, 
  Copy, 
  RefreshCw,
  CheckCircle2,
  Star,
  AlertTriangle,
  Shield,
  ShieldCheck,
  ShieldAlert,
  CalendarPlus,
  Archive
} from 'lucide-react';
import { SaveToVaultModal } from './SaveToVaultModal';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export function ContentGenerator() {
  const { data: products } = useProducts();
  const { data: apiKey } = useAPIKey();
  const { data: recentGenerations } = useRecentGenerations(5);
  const generateCopy = useGenerateCopy();
  const rateCopy = useRateCopy();

  const [contentType, setContentType] = useState<ContentType>('welcome_email_1');
  const [productId, setProductId] = useState<string>('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [generatedCopy, setGeneratedCopy] = useState<{
    id: string;
    copy: string;
    tokensUsed: number;
    generationTime: number;
    aiDetectionScore: number;
  } | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [feedbackTags, setFeedbackTags] = useState<string[]>([]);
  const [feedbackText, setFeedbackText] = useState('');
  const [copied, setCopied] = useState(false);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [vaultModalOpen, setVaultModalOpen] = useState(false);

  const hasApiKey = apiKey?.key_status === 'valid';

  const handleGenerate = async () => {
    try {
      const result = await generateCopy.mutateAsync({
        contentType,
        productId: productId || undefined,
        additionalContext: additionalContext || undefined,
      });

      // Calculate AI detection score from the copy if not returned directly
      const { checkAIDetection } = await import('@/lib/ai-detection-checker');
      const aiCheck = checkAIDetection(result.generated_copy);

      setGeneratedCopy({
        id: result.id,
        copy: result.generated_copy,
        tokensUsed: result.tokens_used || 0,
        generationTime: result.generation_time_ms || 0,
        aiDetectionScore: aiCheck.score,
      });
      setRating(null);
      setFeedbackTags([]);
      setFeedbackText('');
    } catch (error) {
      console.error('Generation failed:', error);
      // Error toast is already shown by the mutation's onError handler
    }
  };

  const handleCopy = async () => {
    if (!generatedCopy) return;
    
    await navigator.clipboard.writeText(generatedCopy.copy);
    setCopied(true);
    toast.success('Copied to clipboard!');
    
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRate = async (newRating: number) => {
    if (!generatedCopy) return;
    
    setRating(newRating);
    
    if (newRating >= 8) {
      // Good rating - save immediately
      await rateCopy.mutateAsync({
        generationId: generatedCopy.id,
        rating: newRating,
      });
    }
  };

  const handleSubmitFeedback = async () => {
    if (!generatedCopy || !rating) return;
    
    await rateCopy.mutateAsync({
      generationId: generatedCopy.id,
      rating,
      feedbackText: feedbackText || undefined,
      feedbackTags: feedbackTags.length > 0 ? feedbackTags : undefined,
    });
    
    // Regenerate with the new feedback incorporated
    await handleGenerate();
  };

  const toggleFeedbackTag = (tag: string) => {
    setFeedbackTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const getContentTypeLabel = (type: string) => {
    return CONTENT_TYPE_OPTIONS.find(o => o.value === type)?.label || type;
  };

  if (!hasApiKey) {
    return (
      <Card className="border-amber-500/50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            <p>Please configure your OpenAI API key in Settings to generate copy.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Generator Form */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Generate Content</CardTitle>
            <CardDescription>
              Create elite copy that sounds like you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Content Type */}
            <div className="space-y-2">
              <Label>Content Type</Label>
              <Select 
                value={contentType} 
                onValueChange={(v) => setContentType(v as ContentType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select content type" />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Product to Promote */}
            <div className="space-y-2">
              <Label>What to promote? (Optional)</Label>
              <Select 
                value={productId} 
                onValueChange={(v) => setProductId(v === 'none' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None - Pure value, no pitch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None - Pure value, no pitch</SelectItem>
                  {products?.filter(p => p.id).map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.product_name}
                      {product.price && ` - $${product.price}`}
                      {product.product_type === 'affiliate' && ' (Affiliate)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Additional Context */}
            <div className="space-y-2">
              <Label>Additional Context (Optional)</Label>
              <Textarea
                placeholder="Any specific points to cover? Special offer? Deadline? Target outcome?"
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                className="min-h-[80px]"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {additionalContext.length}/500
              </p>
            </div>

            {/* Generate Button */}
            <Button 
              onClick={handleGenerate}
              disabled={generateCopy.isPending}
              className="w-full"
              size="lg"
            >
              {generateCopy.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating elite copy... (30-45s)
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Copy
                </>
              )}
            </Button>

            {/* Progress Steps */}
            {generateCopy.isPending && (
              <div className="text-sm text-muted-foreground space-y-1">
                <p>✓ Analyzing your voice</p>
                <p>✓ Drafting copy</p>
                <p>✓ Critiquing</p>
                <p className="animate-pulse">⏳ Refining...</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Generated Result */}
        {generatedCopy && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  📧 {getContentTypeLabel(contentType)}
                </CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <CheckCircle2 className="h-4 w-4 mr-1 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 mr-1" />
                    )}
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCalendarModalOpen(true)}
                  >
                    <CalendarPlus className="h-4 w-4 mr-1" />
                    Add to Calendar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setVaultModalOpen(true)}
                  >
                    <Archive className="h-4 w-4 mr-1" />
                    Save to Vault
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleGenerate}
                    disabled={generateCopy.isPending}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Regenerate
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CardDescription>
                  {generatedCopy.tokensUsed} tokens • {Math.round(generatedCopy.generationTime / 1000)}s
                </CardDescription>
                {/* AI Detection Score Badge */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge 
                        variant={generatedCopy.aiDetectionScore <= 2 ? 'default' : generatedCopy.aiDetectionScore <= 4 ? 'secondary' : 'destructive'}
                        className={cn(
                          "gap-1",
                          generatedCopy.aiDetectionScore <= 2 && "bg-green-500/10 text-green-600 border-green-500/20",
                          generatedCopy.aiDetectionScore > 2 && generatedCopy.aiDetectionScore <= 4 && "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        )}
                      >
                        {generatedCopy.aiDetectionScore <= 2 ? (
                          <ShieldCheck className="h-3 w-3" />
                        ) : generatedCopy.aiDetectionScore <= 4 ? (
                          <Shield className="h-3 w-3" />
                        ) : (
                          <ShieldAlert className="h-3 w-3" />
                        )}
                        AI Score: {generatedCopy.aiDetectionScore}/10
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">
                        {getAIDetectionAssessment(generatedCopy.aiDetectionScore).label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getAIDetectionAssessment(generatedCopy.aiDetectionScore).description}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Generated Copy */}
              <div className="bg-muted/50 rounded-lg p-4 whitespace-pre-wrap text-sm">
                {generatedCopy.copy}
              </div>

              {/* Rating Widget */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  How's this copy?
                </Label>
                <div className="flex gap-1 flex-wrap">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <Button
                      key={n}
                      variant={rating === n ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        "w-9 h-9",
                        rating === n && n >= 8 && "bg-green-500 hover:bg-green-600",
                        rating === n && n < 8 && "bg-amber-500 hover:bg-amber-600"
                      )}
                      onClick={() => handleRate(n)}
                    >
                      {n}
                    </Button>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Needs work</span>
                  <span>Good</span>
                  <span>Perfect!</span>
                </div>
              </div>

              {/* Feedback Form (for ratings < 8) */}
              {rating !== null && rating < 8 && (
                <div className="space-y-4 pt-4 border-t">
                  <Label>What would make this better?</Label>
                  
                  {/* Quick Tags */}
                  <div className="flex flex-wrap gap-2">
                    {FEEDBACK_TAGS.map((tag) => (
                      <Badge
                        key={tag}
                        variant={feedbackTags.includes(tag) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleFeedbackTag(tag)}
                      >
                        {tag.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>

                  {/* Additional Feedback */}
                  <Textarea
                    placeholder="Additional feedback (optional)"
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    className="min-h-[60px]"
                    maxLength={200}
                  />

                  <Button 
                    onClick={handleSubmitFeedback}
                    disabled={rateCopy.isPending || generateCopy.isPending}
                  >
                    {rateCopy.isPending || generateCopy.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    {rateCopy.isPending ? 'Saving...' : generateCopy.isPending ? 'Regenerating...' : 'Save Feedback & Regenerate'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sidebar - Recent Generations */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Generations</CardTitle>
          </CardHeader>
          <CardContent>
            {recentGenerations && recentGenerations.length > 0 ? (
              <div className="space-y-3">
                {recentGenerations.map((gen) => (
                  <div 
                    key={gen.id}
                    className="p-2 rounded border text-sm"
                  >
                    <p className="font-medium truncate">
                      {getContentTypeLabel(gen.content_type)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(gen.created_at), { addSuffix: true })}
                      {gen.user_rating && ` • ${gen.user_rating}/10`}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No recent generations
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add to Calendar Modal */}
      {generatedCopy && (
        <AddToCalendarModal
          open={calendarModalOpen}
          onOpenChange={setCalendarModalOpen}
          generatedCopy={generatedCopy.copy}
          contentType={contentType}
          generationId={generatedCopy.id}
        />
      )}

      {/* Save to Vault Modal */}
      {generatedCopy && (
        <SaveToVaultModal
          open={vaultModalOpen}
          onOpenChange={setVaultModalOpen}
          generatedCopy={generatedCopy.copy}
          contentType={contentType}
          generationId={generatedCopy.id}
        />
      )}
    </div>
  );
}
