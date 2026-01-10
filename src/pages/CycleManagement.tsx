import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Target, Plus, Edit, Eye, Calendar, TrendingUp, Download } from 'lucide-react';
import { loadCycleForExport, exportCycleAsPDF } from '@/lib/cycleExport';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Cycle {
  cycle_id: string;
  goal: string;
  identity: string | null;
  start_date: string;
  end_date: string;
  created_at: string | null;
}

export default function CycleManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadPDF = async (cycleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloadingId(cycleId);
    try {
      const data = await loadCycleForExport(cycleId, supabase);
      if (data) {
        const result = await exportCycleAsPDF(data);
        if (result.success) {
          toast({ 
            title: '✅ PDF Downloaded!', 
            description: 'Check your Downloads folder.' 
          });
        } else {
          toast({ 
            title: 'Download Issue', 
            description: result.message || 'Please try again.',
            variant: 'destructive'
          });
        }
      }
    } catch (error) {
      console.error('PDF download error:', error);
      toast({ 
        title: 'Download Failed', 
        description: 'Please try again.',
        variant: 'destructive'
      });
    } finally {
      setDownloadingId(null);
    }
  };

  useEffect(() => {
    loadCycles();
  }, [user]);

  const loadCycles = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('cycles_90_day')
        .select('cycle_id, goal, identity, start_date, end_date, created_at')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setCycles(data || []);
    } catch (error) {
      console.error('Error loading cycles:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCycleStatus = (cycle: Cycle) => {
    const startDate = new Date(cycle.start_date);
    const endDate = new Date(cycle.end_date);
    const now = new Date();

    if (now < startDate) return 'upcoming';
    if (now > endDate) return 'completed';
    return 'active';
  };

  const getQuarter = (date: string) => {
    const d = new Date(date);
    const month = d.getMonth();
    const year = d.getFullYear();
    const quarter = Math.floor(month / 3) + 1;
    return `Q${quarter} ${year}`;
  };

  return (
    <Layout>
      <div className="container max-w-4xl mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">My 90-Day Cycles</h1>
            </div>
            <p className="text-muted-foreground">
              View and manage your quarterly business plans
            </p>
          </div>

          <Button onClick={() => navigate('/cycle-setup')} className="gap-2">
            <Plus className="h-4 w-4" />
            Start New Cycle
          </Button>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-3/4 mb-4" />
                  <Skeleton className="h-4 w-1/2 mb-2" />
                  <Skeleton className="h-4 w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : cycles.length === 0 ? (
          /* Empty State */
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 rounded-full bg-muted mb-4">
                <Target className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No Cycles Yet</h2>
              <p className="text-muted-foreground mb-6 max-w-md">
                Create your first 90-day business plan to get started with strategic planning
              </p>
              <Button onClick={() => navigate('/cycle-setup')} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Your First Cycle
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Cycles List */
          <div className="space-y-4">
            {cycles.map((cycle) => {
              const status = getCycleStatus(cycle);
              const quarter = getQuarter(cycle.start_date);
              const startDate = new Date(cycle.start_date);
              const endDate = new Date(cycle.end_date);

              return (
                <Card key={cycle.cycle_id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6">
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-lg truncate">{cycle.goal}</h3>
                          {status === 'active' && (
                            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                              Active
                            </Badge>
                          )}
                          {status === 'completed' && (
                            <Badge variant="secondary">
                              Completed
                            </Badge>
                          )}
                          {status === 'upcoming' && (
                            <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                              Upcoming
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4" />
                            {quarter}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(startDate, 'MMM d, yyyy')} - {format(endDate, 'MMM d, yyyy')}
                          </div>
                        </div>

                        {cycle.identity && (
                          <p className="text-sm text-muted-foreground italic truncate">
                            "{cycle.identity}"
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => handleDownloadPDF(cycle.cycle_id, e)}
                          disabled={downloadingId === cycle.cycle_id}
                          className="gap-1"
                        >
                          <Download className="h-4 w-4" />
                          {downloadingId === cycle.cycle_id ? 'Downloading...' : 'PDF'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/cycle-view/${cycle.cycle_id}`)}
                          className="gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                        {status !== 'completed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/cycle-setup?edit=${cycle.cycle_id}`)}
                            className="gap-1"
                          >
                            <Edit className="h-4 w-4" />
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
