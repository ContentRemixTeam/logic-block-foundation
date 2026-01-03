import { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CalendarIcon, CheckCircle2, Loader2, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DailyReview() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(subDays(new Date(), 1));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasPlan, setHasPlan] = useState(false);
  
  const [whatWorked, setWhatWorked] = useState('');
  const [whatDidnt, setWhatDidnt] = useState('');
  const [wins, setWins] = useState('');

  useEffect(() => {
    if (user) {
      loadReview();
    }
  }, [user, selectedDate]);

  const loadReview = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-daily-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ date: format(selectedDate, 'yyyy-MM-dd') }),
      });

      const data = await res.json();
      
      if (data.error) {
        console.error('Error loading review:', data.error);
        return;
      }

      setHasPlan(data.hasPlan);
      
      if (data.review) {
        setWhatWorked(data.review.what_worked || '');
        setWhatDidnt(data.review.what_didnt || '');
        setWins(data.review.wins || '');
      } else {
        setWhatWorked('');
        setWhatDidnt('');
        setWins('');
      }
    } catch (error) {
      console.error('Error loading review:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveReview = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-daily-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          date: format(selectedDate, 'yyyy-MM-dd'),
          what_worked: whatWorked,
          what_didnt: whatDidnt,
          wins,
        }),
      });

      const data = await res.json();

      if (data.error) {
        toast.error('Failed to save review');
        return;
      }

      toast.success('Review saved!');
    } catch (error) {
      console.error('Error saving review:', error);
      toast.error('Failed to save review');
    } finally {
      setSaving(false);
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    setSelectedDate(prev => 
      direction === 'prev' ? subDays(prev, 1) : subDays(prev, -1)
    );
  };

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const isYesterday = format(selectedDate, 'yyyy-MM-dd') === format(subDays(new Date(), 1), 'yyyy-MM-dd');

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-primary" />
              Daily Review
            </h1>
            <p className="text-muted-foreground">Reflect on your day and celebrate your wins</p>
          </div>
        </div>

        {/* Date Navigation */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="icon" onClick={() => navigateDate('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="min-w-[200px]">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                      {isYesterday && <span className="ml-2 text-muted-foreground">(Yesterday)</span>}
                      {isToday && <span className="ml-2 text-muted-foreground">(Today)</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      disabled={(date) => date > new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => navigateDate('next')}
                disabled={isToday}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="py-12 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Review for {format(selectedDate, 'MMMM d')}</CardTitle>
              <CardDescription>
                Take a moment to reflect on this day
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* What did you accomplish? */}
              <div className="space-y-2">
                <Label htmlFor="wins" className="text-base font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  What did you accomplish?
                </Label>
                <Textarea
                  id="wins"
                  placeholder="List your wins and accomplishments for the day..."
                  value={wins}
                  onChange={(e) => setWins(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              {/* What went well? */}
              <div className="space-y-2">
                <Label htmlFor="whatWorked" className="text-base font-medium">
                  What went well?
                </Label>
                <Textarea
                  id="whatWorked"
                  placeholder="What worked well today? What are you proud of?"
                  value={whatWorked}
                  onChange={(e) => setWhatWorked(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              {/* What could have been better? */}
              <div className="space-y-2">
                <Label htmlFor="whatDidnt" className="text-base font-medium">
                  What could have been better?
                </Label>
                <Textarea
                  id="whatDidnt"
                  placeholder="What would you do differently? What lessons did you learn?"
                  value={whatDidnt}
                  onChange={(e) => setWhatDidnt(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4">
                <Button onClick={saveReview} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Save Review
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
