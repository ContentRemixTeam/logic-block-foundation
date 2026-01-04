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
import { Lightbulb, Clock, CheckCircle2, Send } from 'lucide-react';
import { format } from 'date-fns';

interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
}

const categories = ['Planning', 'Reflection', 'Resources', 'Integration', 'Other'];
const priorities = [
  { value: 'Nice to have', label: 'Nice to have' },
  { value: 'Would improve my workflow', label: 'Would improve my workflow' },
  { value: 'Critical for my use', label: 'Critical for my use' }
];

export function FeatureRequestSection() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Other',
    priority: 'Nice to have'
  });

  const fetchRequests = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('feature_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching requests:', error);
    } else {
      setRequests(data || []);
    }
    setLoadingRequests(false);
  };

  useEffect(() => {
    fetchRequests();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('feature_requests')
        .insert({
          user_id: user.id,
          title: formData.title.trim(),
          description: formData.description.trim(),
          category: formData.category,
          priority: formData.priority
        });

      if (error) throw error;

      toast.success('Thank you! Your feature request has been submitted.', {
        description: 'We genuinely appreciate your input—it helps us build a better app for everyone.'
      });
      
      setFormData({ title: '', description: '', category: 'Other', priority: 'Nice to have' });
      fetchRequests();
    } catch (error) {
      console.error('Error submitting request:', error);
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
        return <Badge variant="outline" className="border-primary text-primary"><Lightbulb className="h-3 w-3 mr-1" /> Under Review</Badge>;
      case 'Planned':
        return <Badge className="bg-primary"><CheckCircle2 className="h-3 w-3 mr-1" /> Planned</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="submit" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="submit">Submit Request</TabsTrigger>
          <TabsTrigger value="my-requests">My Requests ({requests.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="submit" className="mt-6">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                Request a Feature
              </CardTitle>
              <CardDescription>
                Have an idea that would make your planning experience better? We'd love to hear it! 
                Every suggestion helps us improve the app.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Feature Title *</Label>
                  <Input
                    id="title"
                    placeholder="Give your idea a clear, short title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Detailed Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what you'd like to see. How would it work? What problem would it solve for you?"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">How important is this to you?</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) => setFormData({ ...formData, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {priorities.map(p => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                  <Send className="h-4 w-4 mr-2" />
                  {loading ? 'Submitting...' : 'Submit Feature Request'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my-requests" className="mt-6">
          {loadingRequests ? (
            <Card className="border-border bg-card">
              <CardContent className="pt-6 text-center text-muted-foreground">
                Loading your requests...
              </CardContent>
            </Card>
          ) : requests.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="pt-6 text-center">
                <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  You haven't submitted any feature requests yet. Share your ideas with us!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {requests.map(request => (
                <Card key={request.id} className="border-border bg-card">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="font-semibold text-foreground">{request.title}</h3>
                      {getStatusBadge(request.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {request.description}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <Badge variant="outline">{request.category}</Badge>
                      <span>•</span>
                      <span>{request.priority}</span>
                      <span>•</span>
                      <span>{format(new Date(request.created_at), 'MMM d, yyyy')}</span>
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
