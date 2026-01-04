import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AlertTriangle, Clock, Eye, CheckCircle2, XCircle, Send, Bug } from 'lucide-react';
import { format } from 'date-fns';

interface IssueReport {
  id: string;
  ticket_number: string;
  title: string;
  what_happened: string;
  what_trying_to_do: string;
  page_section: string;
  severity: string;
  status: string;
  created_at: string;
}

const pageOptions = [
  'Dashboard',
  'Cycle Setup',
  'Daily Plan',
  'Weekly Plan',
  'Tasks',
  'Daily Review',
  'Weekly Review',
  'Monthly Review',
  'Progress',
  'Notes',
  'SOPs',
  'Habits',
  'Ideas',
  'Mindset - Useful Thoughts',
  'Mindset - Belief Builder',
  'Mindset - Identity Anchors',
  'Mindset - Self-Coaching',
  'Celebration Wall',
  'Settings',
  'Other'
];

const severityOptions = [
  { value: 'Minor annoyance', label: 'Minor annoyance - I can work around it' },
  { value: 'Blocks some functionality', label: 'Blocks some functionality - Part of the app doesn\'t work' },
  { value: 'Can\'t use the app', label: 'Can\'t use the app - Critical blocker' }
];

function getBrowserInfo(): string {
  const ua = navigator.userAgent;
  let browser = 'Unknown Browser';
  
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';
  
  return browser;
}

function getDeviceInfo(): string {
  const ua = navigator.userAgent;
  const isMobile = /Mobile|Android|iPhone|iPad/.test(ua);
  const platform = navigator.platform || 'Unknown';
  
  return `${isMobile ? 'Mobile' : 'Desktop'} - ${platform}`;
}

export function ReportIssueSection() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<IssueReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    what_happened: '',
    what_trying_to_do: '',
    page_section: 'Other',
    severity: 'Minor annoyance'
  });

  const fetchReports = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('issue_reports')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reports:', error);
    } else {
      setReports(data || []);
    }
    setLoadingReports(false);
  };

  useEffect(() => {
    fetchReports();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.title.trim() || !formData.what_happened.trim() || !formData.what_trying_to_do.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('issue_reports')
        .insert({
          user_id: user.id,
          ticket_number: 'TEMP', // Will be replaced by trigger
          title: formData.title.trim(),
          what_happened: formData.what_happened.trim(),
          what_trying_to_do: formData.what_trying_to_do.trim(),
          page_section: formData.page_section,
          severity: formData.severity,
          browser_info: getBrowserInfo(),
          device_info: getDeviceInfo()
        })
        .select('ticket_number')
        .single();

      if (error) throw error;

      toast.success(`Issue reported! Ticket: ${data.ticket_number}`, {
        description: 'Thank you for helping us improve. We\'ll look into this as soon as possible.'
      });
      
      setFormData({ title: '', what_happened: '', what_trying_to_do: '', page_section: 'Other', severity: 'Minor annoyance' });
      fetchReports();
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Submitted':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Submitted</Badge>;
      case 'Under Review':
        return <Badge variant="outline" className="border-amber-500 text-amber-500"><Eye className="h-3 w-3 mr-1" /> Under Review</Badge>;
      case 'Fixed':
        return <Badge className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" /> Fixed</Badge>;
      case 'Won\'t Fix':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Won't Fix</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'Minor annoyance':
        return <Badge variant="outline" className="text-muted-foreground">Minor</Badge>;
      case 'Blocks some functionality':
        return <Badge variant="outline" className="border-amber-500 text-amber-500">Partial Block</Badge>;
      case 'Can\'t use the app':
        return <Badge variant="destructive">Critical</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="report" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="report">Report an Issue</TabsTrigger>
          <TabsTrigger value="my-reports">My Reports ({reports.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="report" className="mt-6">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bug className="h-5 w-5 text-destructive" />
                Report a Bug or Issue
              </CardTitle>
              <CardDescription>
                Something not working right? Let us know so we can fix it. 
                The more detail you provide, the faster we can help!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Issue Title *</Label>
                  <Input
                    id="title"
                    placeholder="Brief summary of the problem"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="what_happened">What happened? *</Label>
                  <Textarea
                    id="what_happened"
                    placeholder="Describe what went wrong. Include any error messages you saw."
                    value={formData.what_happened}
                    onChange={(e) => setFormData({ ...formData, what_happened: e.target.value })}
                    rows={3}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="what_trying_to_do">What were you trying to do? *</Label>
                  <Textarea
                    id="what_trying_to_do"
                    placeholder="What action were you taking when this happened?"
                    value={formData.what_trying_to_do}
                    onChange={(e) => setFormData({ ...formData, what_trying_to_do: e.target.value })}
                    rows={2}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="page_section">Which page/section?</Label>
                    <Select
                      value={formData.page_section}
                      onValueChange={(value) => setFormData({ ...formData, page_section: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {pageOptions.map(page => (
                          <SelectItem key={page} value={page}>{page}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="severity">How severe is this?</Label>
                    <Select
                      value={formData.severity}
                      onValueChange={(value) => setFormData({ ...formData, severity: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {severityOptions.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="bg-secondary/50 rounded-lg p-4 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Auto-detected info:</p>
                  <p>Browser: {getBrowserInfo()} | Device: {getDeviceInfo()}</p>
                </div>

                <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                  <Send className="h-4 w-4 mr-2" />
                  {loading ? 'Submitting...' : 'Submit Bug Report'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my-reports" className="mt-6">
          {loadingReports ? (
            <Card className="border-border bg-card">
              <CardContent className="pt-6 text-center text-muted-foreground">
                Loading your reports...
              </CardContent>
            </Card>
          ) : reports.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="pt-6 text-center">
                <Bug className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No issues reported yet. If something's not working, let us know!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {reports.map(report => (
                <Card key={report.id} className="border-border bg-card">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="font-mono text-xs">
                            {report.ticket_number}
                          </Badge>
                          {getStatusBadge(report.status)}
                        </div>
                        <h3 className="font-semibold text-foreground">{report.title}</h3>
                      </div>
                      {getSeverityBadge(report.severity)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {report.what_happened}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{report.page_section}</span>
                      <span>•</span>
                      <span>{format(new Date(report.created_at), 'MMM d, yyyy')}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
