import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Mail, Check, X, Calendar as CalendarIcon, Heart, ArrowRight, Sparkles, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { format, addDays, nextTuesday } from 'date-fns';
import { ContentSaveModal } from '@/components/content/ContentSaveModal';
import { cn } from '@/lib/utils';

interface NurtureCheckin {
  id: string;
  user_id: string;
  commitment_id: string;
  expected_date: string;
  checkin_date: string;
  status: 'pending' | 'completed' | 'missed';
  commitment?: {
    id: string;
    commitment_type: string;
    cycle_id: string | null;
    preferred_time_block: string | null;
  };
}

export function NurtureCheckinCard() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [checkin, setCheckin] = useState<NurtureCheckin | null>(null);
  const [showCoachDrawer, setShowCoachDrawer] = useState(false);
  const [showContentModal, setShowContentModal] = useState(false);
  const [coachResponse, setCoachResponse] = useState('');
  const [selectedRescheduleDate, setSelectedRescheduleDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadPendingCheckin();
    }
  }, [user]);

  const loadPendingCheckin = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('get-pending-nurture-checkin');
      
      if (error) throw error;
      
      if (data?.checkins && data.checkins.length > 0) {
        setCheckin(data.checkins[0]);
      } else {
        setCheckin(null);
      }
    } catch (error) {
      console.error('Error loading pending checkin:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleYesSent = () => {
    // Open content modal prefilled with email type and expected date
    setShowContentModal(true);
  };

  const handleContentSaved = async () => {
    if (!checkin) return;

    try {
      setSaving(true);
      // Mark checkin as completed
      await supabase.functions.invoke('update-nurture-checkin', {
        body: {
          checkin_id: checkin.id,
          status: 'completed',
          commitment_id: checkin.commitment_id,
        },
      });

      toast.success('Logged ✅ Nice work.');
      setCheckin(null);
    } catch (error) {
      console.error('Error updating checkin:', error);
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleReschedule = async (date: Date) => {
    if (!checkin) return;

    try {
      setSaving(true);
      
      await supabase.functions.invoke('update-nurture-checkin', {
        body: {
          checkin_id: checkin.id,
          status: 'missed',
          coach_response: coachResponse,
          reschedule_date: format(date, 'yyyy-MM-dd'),
          create_task: true,
          commitment_id: checkin.commitment_id,
        },
      });

      toast.success("Rescheduled. You're back on track.");
      setShowCoachDrawer(false);
      setCheckin(null);
      setCoachResponse('');
    } catch (error) {
      console.error('Error rescheduling:', error);
      toast.error('Failed to reschedule');
    } finally {
      setSaving(false);
    }
  };

  const handleSkipWeek = async () => {
    if (!checkin) return;

    try {
      setSaving(true);
      
      await supabase.functions.invoke('update-nurture-checkin', {
        body: {
          checkin_id: checkin.id,
          status: 'missed',
          coach_response: 'Skipped this week',
          commitment_id: checkin.commitment_id,
        },
      });

      toast.success('Week skipped. No judgment.');
      setShowCoachDrawer(false);
      setCheckin(null);
    } catch (error) {
      console.error('Error skipping:', error);
      toast.error('Failed to skip');
    } finally {
      setSaving(false);
    }
  };

  const handleDisableCheckins = async () => {
    if (!checkin?.commitment_id) return;

    try {
      setSaving(true);
      
      // Disable the commitment
      const { error } = await supabase
        .from('nurture_commitments')
        .update({ enabled: false })
        .eq('id', checkin.commitment_id);

      if (error) throw error;

      // Also mark current checkin as missed
      await supabase.functions.invoke('update-nurture-checkin', {
        body: {
          checkin_id: checkin.id,
          status: 'missed',
          commitment_id: checkin.commitment_id,
        },
      });

      toast.success('Check-ins disabled. You can re-enable in your 90-Day Cycle settings.');
      setShowCoachDrawer(false);
      setCheckin(null);
    } catch (error) {
      console.error('Error disabling:', error);
      toast.error('Failed to disable');
    } finally {
      setSaving(false);
    }
  };

  // Don't render if loading or no pending checkin
  if (loading || !checkin) {
    return null;
  }

  const today = new Date();
  const tomorrow = addDays(today, 1);
  const nextTues = nextTuesday(today);

  const CoachContent = (
    <div className="space-y-6">
      <div className="text-center py-2">
        <p className="text-lg font-medium">No drama. Let's get you back on track.</p>
      </div>

      {/* Self-coach question */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">What did your brain say?</Label>
        <Textarea
          value={coachResponse}
          onChange={(e) => setCoachResponse(e.target.value)}
          placeholder="e.g., I didn't have time, I didn't know what to write, I was scared no one would read it..."
          rows={3}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          No judgment—just notice the thought. This helps you coach yourself.
        </p>
      </div>

      {/* Quick reschedule buttons */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">When will you send it?</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button 
            variant="outline" 
            onClick={() => handleReschedule(today)}
            disabled={saving}
            className="h-12"
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            Today
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleReschedule(tomorrow)}
            disabled={saving}
            className="h-12"
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            Tomorrow
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleReschedule(nextTues)}
            disabled={saving}
            className="h-12"
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            Next Tuesday
          </Button>
          <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-12">
                <CalendarIcon className="h-4 w-4 mr-2" />
                Pick a date...
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={selectedRescheduleDate || undefined}
                onSelect={(date) => {
                  if (date) {
                    setSelectedRescheduleDate(date);
                    setShowDatePicker(false);
                    handleReschedule(date);
                  }
                }}
                disabled={(date) => date < today}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Secondary actions */}
      <div className="pt-4 border-t space-y-3">
        <Button 
          variant="ghost" 
          onClick={handleSkipWeek}
          disabled={saving}
          className="w-full text-muted-foreground"
        >
          <X className="h-4 w-4 mr-2" />
          Skip this week
        </Button>

        <div className="flex items-center justify-between px-2">
          <Label htmlFor="disable-checkins" className="text-sm text-muted-foreground cursor-pointer">
            Disable check-ins
          </Label>
          <Switch
            id="disable-checkins"
            onCheckedChange={(checked) => {
              if (checked) handleDisableCheckins();
            }}
          />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-secondary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Heart className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-base">Quick check-in</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            Did you send your email yesterday?
          </p>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleYesSent}
              className="flex-1 gap-2"
              disabled={saving}
            >
              <Check className="h-4 w-4" />
              Yes, I sent it
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowCoachDrawer(true)}
              className="flex-1"
              disabled={saving}
            >
              No
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Self-Coach Drawer (mobile) / Dialog (desktop) */}
      {isMobile ? (
        <Drawer open={showCoachDrawer} onOpenChange={setShowCoachDrawer}>
          <DrawerContent className="px-4 pb-8">
            <DrawerHeader className="text-left">
              <DrawerTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Self-Coach + Reschedule
              </DrawerTitle>
            </DrawerHeader>
            {CoachContent}
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={showCoachDrawer} onOpenChange={setShowCoachDrawer}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Self-Coach + Reschedule
            </DialogTitle>
            </DialogHeader>
            {CoachContent}
          </DialogContent>
        </Dialog>
      )}

      {/* Content Save Modal */}
      <ContentSaveModal
        open={showContentModal}
        onOpenChange={setShowContentModal}
        defaultType="Newsletter"
        onSaved={() => {
          handleContentSaved();
          setShowContentModal(false);
        }}
      />
    </>
  );
}
