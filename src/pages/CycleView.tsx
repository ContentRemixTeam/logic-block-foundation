import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Edit, Target, Users, Megaphone, Mail, DollarSign, TrendingUp, Calendar, Brain, Lightbulb, BarChart3, Download, FileJson } from 'lucide-react';
import { format } from 'date-fns';
import { loadCycleForExport, exportCycleAsJSON, exportCycleAsPDF } from '@/lib/cycleExport';
import { useToast } from '@/hooks/use-toast';

interface CycleData {
  cycle_id: string;
  goal: string;
  why: string | null;
  identity: string | null;
  target_feeling: string | null;
  start_date: string;
  end_date: string;
  discover_score: number | null;
  nurture_score: number | null;
  convert_score: number | null;
  biggest_bottleneck: string | null;
  audience_target: string | null;
  audience_frustration: string | null;
  signature_message: string | null;
  things_to_remember: unknown;
  metric_1_name: string | null;
  metric_1_start: number | null;
  metric_2_name: string | null;
  metric_2_start: number | null;
  metric_3_name: string | null;
  metric_3_start: number | null;
  weekly_planning_day: string | null;
  weekly_debrief_day: string | null;
  office_hours_start: string | null;
  office_hours_end: string | null;
  office_hours_days: unknown;
}

interface CycleStrategy {
  lead_primary_platform: string | null;
  lead_content_type: string | null;
  lead_frequency: string | null;
  nurture_method: string | null;
  nurture_frequency: string | null;
  free_transformation: string | null;
  proof_methods: unknown;
  posting_days: unknown;
  batch_day: string | null;
  batch_frequency: string | null;
}

interface CycleRevenue {
  revenue_goal: number | null;
  price_per_sale: number | null;
  launch_schedule: string | null;
}

interface CycleOffer {
  offer_name: string;
  price: number | null;
  transformation: string | null;
  is_primary: boolean | null;
}

export default function CycleView() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cycle, setCycle] = useState<CycleData | null>(null);
  const [strategy, setStrategy] = useState<CycleStrategy | null>(null);
  const [revenue, setRevenue] = useState<CycleRevenue | null>(null);
  const [offers, setOffers] = useState<CycleOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const handleExportJSON = async () => {
    if (!id) return;
    setExporting(true);
    try {
      const data = await loadCycleForExport(id, supabase);
      if (data) {
        exportCycleAsJSON(data);
        toast({ title: 'JSON exported!', description: 'Your plan has been downloaded.' });
      }
    } catch (error) {
      toast({ title: 'Export failed', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!id) return;
    setExporting(true);
    try {
      const data = await loadCycleForExport(id, supabase);
      if (data) {
        const result = await exportCycleAsPDF(data);
        if (result.success) {
          toast({ 
            title: '✅ PDF Downloaded!', 
            description: result.message || 'Check your Downloads folder.' 
          });
        } else {
          toast({ 
            title: 'Export Issue', 
            description: result.message || 'Please try again.',
            variant: 'destructive' 
          });
        }
      }
    } catch (error) {
      toast({ title: 'Export failed', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    loadCycle();
  }, [id, user]);

  const loadCycle = async () => {
    if (!user || !id) return;

    try {
      // Load main cycle data
      const { data: cycleData, error: cycleError } = await supabase
        .from('cycles_90_day')
        .select('*')
        .eq('cycle_id', id)
        .eq('user_id', user.id)
        .single();

      if (cycleError) throw cycleError;
      setCycle(cycleData);

      // Load strategy
      const { data: strategyData } = await supabase
        .from('cycle_strategy')
        .select('*')
        .eq('cycle_id', id)
        .single();
      
      if (strategyData) setStrategy(strategyData);

      // Load revenue plan
      const { data: revenueData } = await supabase
        .from('cycle_revenue_plan')
        .select('*')
        .eq('cycle_id', id)
        .single();
      
      if (revenueData) setRevenue(revenueData);

      // Load offers
      const { data: offersData } = await supabase
        .from('cycle_offers')
        .select('*')
        .eq('cycle_id', id)
        .order('sort_order');
      
      if (offersData) setOffers(offersData);

    } catch (error) {
      console.error('Error loading cycle:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container max-w-4xl mx-auto py-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </Layout>
    );
  }

  if (!cycle) {
    return (
      <Layout>
        <div className="container max-w-4xl mx-auto py-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Cycle not found</p>
            <Button asChild>
              <Link to="/cycles">Back to Cycles</Link>
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const startDate = new Date(cycle.start_date);
  const endDate = new Date(cycle.end_date);

  return (
    <Layout>
      <div className="container max-w-4xl mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
              <Link to="/cycles">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to All Cycles
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">{cycle.goal}</h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {format(startDate, 'MMMM d, yyyy')} - {format(endDate, 'MMMM d, yyyy')}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleExportJSON} disabled={exporting} className="gap-2">
              <FileJson className="h-4 w-4" />
              Export JSON
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={exporting} className="gap-2">
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
            <Button onClick={() => navigate(`/cycle-setup?edit=${cycle.cycle_id}`)} className="gap-2">
              <Edit className="h-4 w-4" />
              Edit Plan
            </Button>
          </div>
        </div>

        {/* Identity & Why */}
        {(cycle.identity || cycle.why || cycle.target_feeling) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Identity & Motivation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cycle.identity && (
                <div>
                  <p className="text-sm text-muted-foreground">I am becoming</p>
                  <p className="font-medium">{cycle.identity}</p>
                </div>
              )}
              {cycle.why && (
                <div>
                  <p className="text-sm text-muted-foreground">Because</p>
                  <p className="font-medium">{cycle.why}</p>
                </div>
              )}
              {cycle.target_feeling && (
                <div>
                  <p className="text-sm text-muted-foreground">I want to feel</p>
                  <p className="font-medium">{cycle.target_feeling}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Business Diagnostic */}
        {(cycle.discover_score || cycle.nurture_score || cycle.convert_score) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Business Diagnostic
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {cycle.discover_score && (
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">Discover</p>
                    <p className="text-2xl font-bold text-primary">{cycle.discover_score}/10</p>
                  </div>
                )}
                {cycle.nurture_score && (
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">Nurture</p>
                    <p className="text-2xl font-bold text-primary">{cycle.nurture_score}/10</p>
                  </div>
                )}
                {cycle.convert_score && (
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">Convert</p>
                    <p className="text-2xl font-bold text-primary">{cycle.convert_score}/10</p>
                  </div>
                )}
              </div>
              {cycle.biggest_bottleneck && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-1">Biggest Bottleneck</p>
                  <p className="font-medium">{cycle.biggest_bottleneck}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Audience & Message */}
        {(cycle.audience_target || cycle.signature_message) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                Audience & Message
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cycle.audience_target && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Target Audience</p>
                  <p>{cycle.audience_target}</p>
                </div>
              )}
              {cycle.audience_frustration && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Their Frustration</p>
                  <p>{cycle.audience_frustration}</p>
                </div>
              )}
              {cycle.signature_message && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Signature Message</p>
                  <p className="font-medium italic">"{cycle.signature_message}"</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Lead Gen Strategy */}
        {strategy?.lead_primary_platform && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-blue-600" />
                Lead Generation Strategy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Platform</p>
                  <p className="font-medium capitalize">{strategy.lead_primary_platform}</p>
                </div>
                {strategy.lead_content_type && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Content Type</p>
                    <p className="font-medium capitalize">{strategy.lead_content_type.replace(/-/g, ' ')}</p>
                  </div>
                )}
                {Array.isArray(strategy.posting_days) && strategy.posting_days.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Posting Days</p>
                    <p className="font-medium">{(strategy.posting_days as string[]).join(', ')}</p>
                  </div>
                )}
                {strategy.batch_day && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Batch Day</p>
                    <p className="font-medium">{strategy.batch_day} ({strategy.batch_frequency || 'weekly'})</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Nurture Strategy */}
        {strategy?.nurture_method && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-green-600" />
                Nurture Strategy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Method</p>
                  <p className="font-medium capitalize">{strategy.nurture_method}</p>
                </div>
                {strategy.nurture_frequency && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Frequency</p>
                    <p className="font-medium capitalize">{strategy.nurture_frequency}</p>
                  </div>
                )}
              </div>
              {strategy.free_transformation && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-1">Free Transformation</p>
                  <p>{strategy.free_transformation}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Offers */}
        {offers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-amber-600" />
                Your Offers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {offers.map((offer, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                    <div>
                      <p className="font-medium">{offer.offer_name}</p>
                      {offer.transformation && (
                        <p className="text-sm text-muted-foreground">{offer.transformation}</p>
                      )}
                    </div>
                    {offer.price && (
                      <p className="text-lg font-semibold">${offer.price.toLocaleString()}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Revenue Goal */}
        {revenue?.revenue_goal && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                Revenue Goal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">${revenue.revenue_goal.toLocaleString()}</p>
              {revenue.price_per_sale && (
                <p className="text-muted-foreground mt-1">
                  Average sale: ${revenue.price_per_sale.toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Success Metrics */}
        {(cycle.metric_1_name || cycle.metric_2_name || cycle.metric_3_name) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Success Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {cycle.metric_1_name && (
                  <div className="p-4 rounded-lg border text-center">
                    <p className="text-sm text-muted-foreground mb-1">{cycle.metric_1_name}</p>
                    <p className="text-xl font-semibold">{cycle.metric_1_start ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Starting</p>
                  </div>
                )}
                {cycle.metric_2_name && (
                  <div className="p-4 rounded-lg border text-center">
                    <p className="text-sm text-muted-foreground mb-1">{cycle.metric_2_name}</p>
                    <p className="text-xl font-semibold">{cycle.metric_2_start ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Starting</p>
                  </div>
                )}
                {cycle.metric_3_name && (
                  <div className="p-4 rounded-lg border text-center">
                    <p className="text-sm text-muted-foreground mb-1">{cycle.metric_3_name}</p>
                    <p className="text-xl font-semibold">{cycle.metric_3_start ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Starting</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Things to Remember */}
        {Array.isArray(cycle.things_to_remember) && cycle.things_to_remember.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                Key Reminders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {(cycle.things_to_remember as string[]).map((reminder: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>{reminder}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
