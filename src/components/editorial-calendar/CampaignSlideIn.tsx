import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays, parseISO } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Rocket, Edit, Filter, DollarSign, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getPlatformLabel } from '@/lib/calendarConstants';

interface CampaignSlideInProps {
  campaignId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFilterToCampaign?: (campaignId: string) => void;
}

export function CampaignSlideIn({ campaignId, open, onOpenChange, onFilterToCampaign }: CampaignSlideInProps) {
  const navigate = useNavigate();
  
  // Fetch campaign details
  const { data: campaign, isLoading: campaignLoading } = useQuery({
    queryKey: ['campaign-details', campaignId],
    queryFn: async () => {
      if (!campaignId) return null;
      
      const { data, error } = await supabase
        .from('launches')
        .select('id, name, cart_opens, cart_closes, status, revenue_goal')
        .eq('id', campaignId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!campaignId && open,
  });
  
  // Fetch content items for this campaign
  const { data: contentItems, isLoading: contentLoading } = useQuery({
    queryKey: ['campaign-content', campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      
      const { data, error } = await supabase
        .from('content_items')
        .select('id, title, type, channel, planned_publish_date, status')
        .eq('launch_id', campaignId)
        .order('planned_publish_date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!campaignId && open,
  });
  
  if (!open) return null;
  
  const isLoading = campaignLoading || contentLoading;
  
  // Calculate duration
  const duration = campaign?.cart_opens && campaign?.cart_closes
    ? differenceInDays(parseISO(campaign.cart_closes), parseISO(campaign.cart_opens)) + 1
    : 0;
  
  // Group content by platform
  const contentByPlatform: Record<string, number> = {};
  const contentByStatus: Record<string, number> = {};
  
  contentItems?.forEach(item => {
    const platform = item.channel || 'other';
    const status = item.status || 'draft';
    contentByPlatform[platform] = (contentByPlatform[platform] || 0) + 1;
    contentByStatus[status] = (contentByStatus[status] || 0) + 1;
  });
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : campaign ? (
          <>
            <SheetHeader className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Rocket className="h-5 w-5 text-primary" />
                </div>
                <SheetTitle className="text-xl">{campaign.name}</SheetTitle>
              </div>
              {campaign.cart_opens && campaign.cart_closes && (
                <SheetDescription className="text-sm">
                  {format(parseISO(campaign.cart_opens), 'MMM d')} – {format(parseISO(campaign.cart_closes), 'MMM d, yyyy')}
                </SheetDescription>
              )}
            </SheetHeader>
            
            <div className="mt-6 space-y-6">
              {/* Campaign Stats */}
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5" />
                      Revenue Goal
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-semibold">
                      ${(campaign.revenue_goal || 0).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      Duration
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-semibold">
                      {duration} day{duration !== 1 ? 's' : ''}
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              {/* Content Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">
                    Content ({contentItems?.length || 0} items)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* By Platform */}
                  {Object.keys(contentByPlatform).length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">By Platform:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(contentByPlatform).map(([platform, count]) => (
                          <Badge key={platform} variant="secondary" className="text-xs">
                            {getPlatformLabel(platform)}
                            <span className="ml-1 text-muted-foreground">{count}</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* By Status */}
                  {Object.keys(contentByStatus).length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">By Status:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(contentByStatus).map(([status, count]) => (
                          <Badge key={status} variant="outline" className="text-xs capitalize">
                            {status}
                            <span className="ml-1 text-muted-foreground">{count}</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {contentItems?.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No content scheduled for this campaign yet
                    </p>
                  )}
                </CardContent>
              </Card>
              
              {/* Actions */}
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    navigate(`/wizards/launch?edit=${campaignId}`);
                    onOpenChange(false);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Launch
                </Button>
                <Button 
                  className="flex-1"
                  onClick={() => {
                    if (campaignId && onFilterToCampaign) {
                      onFilterToCampaign(campaignId);
                    }
                    onOpenChange(false);
                  }}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filter to This
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            Campaign not found
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
