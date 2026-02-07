import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ScrollIndicator } from '@/components/ui/scroll-indicator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarIcon, Loader2, Sparkles, AlertTriangle, Rocket, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useMembership } from '@/hooks/useMembership';
import { useProducts, useAPIKey, useBrandProfile } from '@/hooks/useAICopywriting';
import { useLaunches } from '@/hooks/useLaunches';
import { useUserPlatforms } from '@/hooks/useUserPlatforms';
import { OpenAIService } from '@/lib/openai-service';
import { ContentType, CONTENT_TYPE_OPTIONS } from '@/types/aiCopywriting';
import { checkAIDetection } from '@/lib/ai-detection-checker';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

interface AIGenerateTabProps {
  initialDate?: Date;
  initialLane?: 'create' | 'publish';
  onSuccess: () => void;
}

export function AIGenerateTab({ initialDate, initialLane, onSuccess }: AIGenerateTabProps) {
  const { user } = useAuth();
  const { isMastermind } = useMembership();
  const { data: apiKey } = useAPIKey();
  const { data: brandProfile } = useBrandProfile();
  const { data: products } = useProducts();
  const { launches, formatLaunchOption } = useLaunches();
  const { activePlatforms, getPlatformLabel } = useUserPlatforms();
  const queryClient = useQueryClient();

  // Check tier access - Mastermind members have full access
  const canUseAI = isMastermind;
  const hasApiKey = apiKey?.key_status === 'valid';
  const hasBrandProfile = !!brandProfile?.business_name;

  // Form state
  const [contentType, setContentType] = useState<ContentType>('welcome_email_1');
  const [productId, setProductId] = useState<string>('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [platform, setPlatform] = useState('');
  const [creationDate, setCreationDate] = useState<Date | undefined>(
    initialLane === 'create' && initialDate ? initialDate : undefined
  );
  const [publishDate, setPublishDate] = useState<Date | undefined>(
    initialLane === 'publish' && initialDate ? initialDate : undefined
  );
  const [campaignId, setCampaignId] = useState('');
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCopy, setGeneratedCopy] = useState<string | null>(null);
  const [aiScore, setAiScore] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Get suggested title based on content type
  const getSuggestedTitle = () => {
    const option = CONTENT_TYPE_OPTIONS.find(o => o.value === contentType);
    return option?.label || contentType.replace(/_/g, ' ');
  };

  // Map AI content type to calendar type/channel
  const mapContentTypeToCalendar = () => {
    if (contentType.includes('email')) {
      return { type: 'email', channel: 'email' };
    }
    if (contentType.includes('sales_page')) {
      return { type: 'page', channel: 'website' };
    }
    return { type: 'post', channel: platform };
  };

  const handleGenerate = async () => {
    if (!user || !hasApiKey) return;

    setIsGenerating(true);
    setGeneratedCopy(null);
    setAiScore(null);

    try {
      // Get product if selected
      let product = null;
      if (productId) {
        const { data } = await supabase
          .from('user_products')
          .select('*')
          .eq('id', productId)
          .single();
        product = data;
      }

      // Generate copy
      const result = await OpenAIService.generateCopy(user.id, {
        contentType,
        context: {
          businessProfile: brandProfile || undefined,
          productToPromote: product,
          additionalContext: additionalContext || undefined,
        },
      });

      setGeneratedCopy(result.copy);
      
      // Check AI detection score
      const detection = checkAIDetection(result.copy);
      setAiScore(detection.score);
      
      toast.success('Copy generated!');
    } catch (error) {
      console.error('Generation failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate copy');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddToCalendar = async () => {
    if (!user || !generatedCopy) return;
    if (!creationDate && !publishDate) {
      toast.error('Please set at least one date');
      return;
    }

    setIsSaving(true);

    try {
      const { type, channel } = mapContentTypeToCalendar();
      const title = getSuggestedTitle();

      // Create content_items record
      const { error } = await supabase
        .from('content_items')
        .insert({
          user_id: user.id,
          title: title,
          body: generatedCopy,
          type: type,
          channel: channel || platform || null,
          status: 'Draft',
          planned_creation_date: creationDate ? format(creationDate, 'yyyy-MM-dd') : null,
          planned_publish_date: publishDate ? format(publishDate, 'yyyy-MM-dd') : null,
          launch_id: campaignId || null,
          show_in_vault: true,
        });

      if (error) throw error;

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['editorial-calendar-content'] });
      queryClient.invalidateQueries({ queryKey: ['editorial-calendar-unscheduled'] });
      queryClient.invalidateQueries({ queryKey: ['content-vault-items'] });

      toast.success('Added to calendar!');
      onSuccess();
    } catch (error) {
      console.error('Failed to add to calendar:', error);
      toast.error('Failed to add to calendar. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Tier gate
  if (!canUseAI) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Lock className="h-10 w-10 text-muted-foreground mb-4" />
        <h3 className="font-semibold mb-2">AI Copywriting</h3>
        <p className="text-sm text-muted-foreground mb-4">
          This feature is available for Mastermind members.
        </p>
        <Button variant="outline" asChild>
          <Link to="/settings/subscription">Upgrade Plan</Link>
        </Button>
      </div>
    );
  }

  // API Key required
  if (!hasApiKey) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-500 mb-4" />
        <h3 className="font-semibold mb-2">API Key Required</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Please configure your OpenAI API key to use AI generation.
        </p>
        <Button variant="outline" asChild>
          <Link to="/ai-copywriting">Configure API Key</Link>
        </Button>
      </div>
    );
  }

  return (
    <ScrollIndicator className="h-full">
      <ScrollArea className="h-full -mx-2 px-2">
        <div className="space-y-4 py-2 pb-4">
          {/* Brand Profile Warning */}
          {!hasBrandProfile && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Set up your brand profile for better results.{' '}
                <Link to="/ai-copywriting/setup" className="underline font-medium">
                  Complete setup
                </Link>
              </AlertDescription>
            </Alert>
          )}

          {/* Content Type */}
          <div className="space-y-2">
            <Label>Content Type</Label>
            <Select value={contentType} onValueChange={(v) => setContentType(v as ContentType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select content type" />
              </SelectTrigger>
              <SelectContent>
                {CONTENT_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Product to Promote */}
          <div className="space-y-2">
            <Label>Promote (Optional)</Label>
            <Select value={productId} onValueChange={(v) => setProductId(v === 'none' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="None - Pure value" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None - Pure value</SelectItem>
                {products?.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.product_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Additional Context */}
          <div className="space-y-2">
            <Label>Additional Context (Optional)</Label>
            <Textarea
              placeholder="Any specific points to cover?"
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              className="min-h-[60px]"
              maxLength={500}
            />
          </div>

          {/* Generate Button */}
          <Button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating... (30-45s)
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Copy
              </>
            )}
          </Button>

          {/* Generated Copy Preview */}
          {generatedCopy && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <Label>Generated Copy</Label>
                {aiScore !== null && (
                  <span className={cn(
                    "text-xs px-2 py-1 rounded",
                    aiScore <= 3 ? "bg-green-100 text-green-700" : 
                    aiScore <= 5 ? "bg-amber-100 text-amber-700" : 
                    "bg-red-100 text-red-700"
                  )}>
                    AI Score: {aiScore}/10
                  </span>
                )}
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-sm max-h-[200px] overflow-y-auto whitespace-pre-wrap">
                {generatedCopy}
              </div>

              {/* Schedule Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground">Schedule</h3>

                {/* Platform for social posts */}
                {contentType === 'social_post' && (
                  <div className="space-y-2">
                    <Label>Platform</Label>
                    <Select value={platform} onValueChange={setPlatform}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                      <SelectContent>
                        {activePlatforms.map((p) => (
                          <SelectItem key={p.platform} value={p.platform}>
                            {getPlatformLabel(p.platform)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary/70" />
                      Create Date
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !creationDate && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {creationDate ? format(creationDate, 'MMM d') : 'Optional'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={creationDate}
                          onSelect={setCreationDate}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-accent" />
                      Publish Date
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !publishDate && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {publishDate ? format(publishDate, 'MMM d') : 'Optional'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={publishDate}
                          onSelect={setPublishDate}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Campaign */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Rocket className="h-3 w-3" />
                    Campaign (Optional)
                  </Label>
                  <Select value={campaignId || 'none'} onValueChange={(v) => setCampaignId(v === 'none' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {launches.map((launch) => (
                        <SelectItem key={launch.id} value={launch.id}>
                          {formatLaunchOption(launch)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Add to Calendar Button */}
                <Button 
                  onClick={handleAddToCalendar}
                  disabled={isSaving || (!creationDate && !publishDate)}
                  className="w-full"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add to Calendar'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </ScrollIndicator>
  );
}
