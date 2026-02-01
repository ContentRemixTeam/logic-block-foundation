import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Clock, Eye, ArrowRight, Database } from 'lucide-react';
import { ContentPlannerData, ContentFormat, RepurposeSuggestion } from '@/types/contentPlanner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getFormatMetadata, formatDuration } from '../utils/formatHelpers';
import { cn } from '@/lib/utils';

interface StepVaultReviewProps {
  data: ContentPlannerData;
  onChange: (updates: Partial<ContentPlannerData>) => void;
}

export function StepVaultReview({ data, onChange }: StepVaultReviewProps) {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<RepurposeSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [vaultStats, setVaultStats] = useState({ total: 0, recommended: 0 });

  // Fetch content from vault and generate suggestions
  useEffect(() => {
    if (!user) return;

    const fetchVaultContent = async () => {
      setIsLoading(true);
      
      try {
        // Fetch existing content items
        const { data: contentItems } = await supabase
          .from('content_items')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (contentItems) {
          setVaultStats({ total: contentItems.length, recommended: 0 });
          
          // Generate smart suggestions based on selected formats
          const smartSuggestions: RepurposeSuggestion[] = contentItems
            .filter(item => {
              // Filter to items that can be repurposed into selected formats
              return data.selectedFormats.length > 0;
            })
            .slice(0, 12)
            .map(item => ({
              contentId: item.id,
              title: item.title,
              type: item.type,
              performance: {
                openRate: item.open_rate || undefined,
                clickRate: item.click_rate || undefined,
              },
              suggestedFormats: getSuggestedFormatsForType(item.type, data.selectedFormats),
              timeSavedMinutes: 60, // Estimate
            }));

          setSuggestions(smartSuggestions);
          setVaultStats(prev => ({ ...prev, recommended: smartSuggestions.length }));
        }
      } catch (error) {
        console.error('Error fetching vault content:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVaultContent();
  }, [user, data.selectedFormats]);

  const toggleRepurpose = (contentId: string) => {
    const current = data.selectedRepurposeIds || [];
    const updated = current.includes(contentId)
      ? current.filter(id => id !== contentId)
      : [...current, contentId];
    onChange({ selectedRepurposeIds: updated });
  };

  const toggleTargetFormat = (contentId: string, format: ContentFormat) => {
    const current = data.repurposeTargetFormats || {};
    const currentFormats = current[contentId] || [];
    
    const updated = currentFormats.includes(format)
      ? currentFormats.filter(f => f !== format)
      : [...currentFormats, format];
    
    onChange({
      repurposeTargetFormats: {
        ...current,
        [contentId]: updated,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Smart Repurposing Suggestions</h2>
          <p className="text-muted-foreground">Searching your content vault...</p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Smart Repurposing Suggestions</h2>
        <p className="text-muted-foreground">
          We found {vaultStats.recommended} pieces from your vault to reuse
        </p>
      </div>

      {/* Vault Stats */}
      <div className="flex items-center justify-center gap-6 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{vaultStats.total} total items</span>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span className="text-sm">{vaultStats.recommended} recommended</span>
        </div>
        {data.selectedRepurposeIds.length > 0 && (
          <Badge variant="default">
            {data.selectedRepurposeIds.length} selected
          </Badge>
        )}
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 ? (
        <div className="space-y-4">
          {suggestions.map((suggestion) => {
            const isSelected = data.selectedRepurposeIds.includes(suggestion.contentId);
            const selectedFormats = data.repurposeTargetFormats?.[suggestion.contentId] || [];

            return (
              <Card 
                key={suggestion.contentId}
                className={cn(
                  "transition-all",
                  isSelected && "border-primary ring-1 ring-primary/20"
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleRepurpose(suggestion.contentId)}
                        className="mt-1"
                      />
                      <div>
                        <CardTitle className="text-base">{suggestion.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {suggestion.type}
                          </Badge>
                          {suggestion.performance.openRate && (
                            <span className="text-xs text-muted-foreground">
                              {suggestion.performance.openRate}% open rate
                            </span>
                          )}
                          {suggestion.launchName && (
                            <span className="text-xs text-muted-foreground">
                              from {suggestion.launchName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Save ~{formatDuration(suggestion.timeSavedMinutes)}
                    </div>
                  </div>
                </CardHeader>
                
                {isSelected && suggestion.suggestedFormats.length > 0 && (
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Repurpose as:</p>
                      <div className="flex flex-wrap gap-2">
                        {suggestion.suggestedFormats.map((format) => {
                          const metadata = getFormatMetadata(format);
                          const isFormatSelected = selectedFormats.includes(format);
                          
                          return (
                            <Button
                              key={format}
                              variant={isFormatSelected ? "default" : "outline"}
                              size="sm"
                              onClick={() => toggleTargetFormat(suggestion.contentId, format)}
                            >
                              {metadata?.label || format}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              No content found in your vault yet.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Content you create will be saved here for future repurposing.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Skip Option */}
      <div className="flex justify-center gap-4">
        <Button 
          variant="ghost"
          onClick={() => onChange({ selectedRepurposeIds: [], repurposeTargetFormats: {} })}
        >
          Skip Repurposing
        </Button>
        {suggestions.length > 0 && (
          <Button variant="outline">
            <Eye className="h-4 w-4 mr-2" />
            Browse Full Vault
          </Button>
        )}
      </div>
    </div>
  );
}

// Helper to suggest formats based on source type
function getSuggestedFormatsForType(sourceType: string, selectedFormats: ContentFormat[]): ContentFormat[] {
  const suggestions: ContentFormat[] = [];
  
  // Map source types to compatible target formats
  const compatibilityMap: Record<string, ContentFormat[]> = {
    email: ['linkedin-post', 'blog-post', 'twitter-thread'],
    blog: ['email-sequence', 'linkedin-post', 'twitter-thread', 'infographic', 'carousel'],
    video: ['youtube-short', 'instagram-reel', 'tiktok', 'blog-post'],
    podcast: ['blog-post', 'email-single', 'linkedin-post', 'youtube-video'],
    webinar: ['email-sequence', 'blog-post', 'podcast-episode', 'pdf-guide'],
  };
  
  const compatibleFormats = compatibilityMap[sourceType.toLowerCase()] || [];
  
  // Return intersection of compatible and selected formats
  return compatibleFormats.filter(f => selectedFormats.includes(f));
}
