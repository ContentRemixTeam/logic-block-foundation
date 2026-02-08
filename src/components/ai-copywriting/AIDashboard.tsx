import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  useRecentGenerations, 
  useBrandProfile, 
  useProducts, 
  useAPIKey,
  useGenerations
} from '@/hooks/useAICopywriting';
import { LearningInsightsCard } from './LearningInsightsCard';
import { 
  Sparkles, 
  FileText, 
  Package, 
  Settings, 
  TrendingUp,
  Lightbulb,
  ArrowRight,
  Star,
  Loader2,
  Brain
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { CONTENT_TYPE_OPTIONS } from '@/types/aiCopywriting';
import { HelpButton } from '@/components/ui/help-button';

export function AIDashboard() {
  const navigate = useNavigate();
  const { data: recentGenerations, isLoading: genLoading } = useRecentGenerations(5);
  const { data: allGenerations } = useGenerations(100);
  const { data: brandProfile } = useBrandProfile();
  const { data: products } = useProducts();
  const { data: apiKey } = useAPIKey();

  // Calculate stats
  const thisMonthGenerations = allGenerations?.filter(g => {
    const date = new Date(g.created_at);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }) || [];

  const ratedGenerations = allGenerations?.filter(g => g.user_rating !== null) || [];
  const avgRating = ratedGenerations.length > 0
    ? ratedGenerations.reduce((sum, g) => sum + (g.user_rating || 0), 0) / ratedGenerations.length
    : 0;

  const totalTokens = thisMonthGenerations.reduce((sum, g) => sum + (g.tokens_used || 0), 0);
  const estimatedCost = (totalTokens / 1000) * 0.03; // Approximate GPT-4 pricing

  const getContentTypeLabel = (type: string) => {
    return CONTENT_TYPE_OPTIONS.find(o => o.value === type)?.label || type;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">{thisMonthGenerations.length}</p>
                <p className="text-xs text-muted-foreground">generations</p>
              </div>
              <FileText className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Rating</p>
                <p className="text-2xl font-bold">
                  {avgRating > 0 ? avgRating.toFixed(1) : '—'}
                </p>
                <p className="text-xs text-muted-foreground">/10</p>
              </div>
              <Star className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-sm text-muted-foreground">Est. Cost</p>
                  <HelpButton
                    title="Estimated Cost"
                    description="This estimate is based on your token usage this month."
                    tips={[
                      'Each generation uses ~3,000-8,000 tokens',
                      'Actual costs depend on content length',
                      'GPT-4o pricing: ~$0.0025/1K input, $0.01/1K output',
                      'Set spending limits in your OpenAI dashboard'
                    ]}
                    side="bottom"
                    size="sm"
                  />
                </div>
                <p className="text-2xl font-bold">${estimatedCost.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">this month</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">API Status</p>
                <p className="text-2xl font-bold">
                  {apiKey?.key_status === 'valid' ? '✅' : '❌'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {apiKey?.key_status === 'valid' ? 'Connected' : 'Invalid'}
                </p>
              </div>
              <Settings className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Learning Insights + Quick Actions Row */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Learning Insights Card */}
        <LearningInsightsCard />

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => navigate('/ai-copywriting/generate')}
              >
                <Sparkles className="h-5 w-5" />
                <span>Generate Copy</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => navigate('/ai-copywriting/library')}
              >
                <FileText className="h-5 w-5" />
                <span>View Library</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => navigate('/ai-copywriting/brand-dna')}
              >
                <Brain className="h-5 w-5" />
                <span>Brand DNA</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => navigate('/ai-copywriting/settings')}
              >
                <Settings className="h-5 w-5" />
                <span>Settings</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent Generations</CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/ai-copywriting/library')}
          >
            View All
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {genLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : recentGenerations && recentGenerations.length > 0 ? (
            <div className="space-y-3">
              {recentGenerations.map((gen) => (
                <div 
                  key={gen.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate('/ai-copywriting/library')}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm break-words">
                      {getContentTypeLabel(gen.content_type)}
                    </p>
                    <p className="text-sm text-muted-foreground break-words">
                      {gen.generated_copy.slice(0, 60)}...
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    {gen.user_rating && (
                      <span className="text-sm font-medium">
                        {gen.user_rating}/10
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(gen.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No generations yet</p>
              <Button 
                className="mt-4"
                onClick={() => navigate('/ai-copywriting/generate')}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Your First Copy
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            Improve Your Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Rate every generation to help AI learn your preferences</li>
            <li>• Add more voice samples for better accuracy</li>
            <li>• Use specific context for each piece</li>
            <li>• Test different products to promote</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
