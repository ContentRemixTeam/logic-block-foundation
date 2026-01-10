import { useEffect, useState } from 'react';
import { PremiumCard, PremiumCardHeader, PremiumCardTitle, PremiumCardContent } from '@/components/ui/premium-card';
import { Calendar, Clock, Target, Megaphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { differenceInDays, format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface Promotion {
  name: string;
  offer: string;
  startDate: string;
  endDate: string;
  goal: string;
  launchType: string;
  notes?: string;
}

export function PromotionCountdown() {
  const { user } = useAuth();
  const [nextPromotion, setNextPromotion] = useState<Promotion | null>(null);
  const [activePromotion, setActivePromotion] = useState<Promotion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPromotions();
  }, [user]);

  const loadPromotions = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      const { data: cycle } = await supabase
        .from('cycles_90_day')
        .select('promotions')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      const rawPromotions = cycle?.promotions;
      const promotions = (Array.isArray(rawPromotions) ? rawPromotions : []) as unknown as Promotion[];
      
      if (promotions.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Find active promotion (happening now)
        const active = promotions.find((p: Promotion) => {
          if (!p.startDate) return false;
          const start = new Date(p.startDate);
          start.setHours(0, 0, 0, 0);
          const end = p.endDate ? new Date(p.endDate) : null;
          if (end) end.setHours(23, 59, 59, 999);
          return start <= today && (!end || end >= today);
        });
        
        // Find next upcoming promotion
        const upcoming = promotions
          .filter((p: Promotion) => p.startDate && new Date(p.startDate) > today)
          .sort((a: Promotion, b: Promotion) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0];
        
        setActivePromotion(active || null);
        setNextPromotion(upcoming || null);
      }
    } catch (error) {
      console.error('Error loading promotions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  // If there's an active promotion, show that
  if (activePromotion) {
    const start = new Date(activePromotion.startDate);
    const end = activePromotion.endDate ? new Date(activePromotion.endDate) : null;
    const today = new Date();
    const daysRemaining = end ? differenceInDays(end, today) : 0;
    const totalDays = end ? differenceInDays(end, start) + 1 : 1;
    const daysElapsed = totalDays - daysRemaining;
    const progress = end ? Math.min(100, (daysElapsed / totalDays) * 100) : 0;

    return (
      <PremiumCard category="do" className="border-green-500/30 bg-green-500/5">
        <PremiumCardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-green-600" />
              <PremiumCardTitle className="text-base">Active Launch!</PremiumCardTitle>
            </div>
            <Badge className="bg-green-500 text-white animate-pulse">LIVE NOW</Badge>
          </div>
        </PremiumCardHeader>
        <PremiumCardContent>
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">{activePromotion.name}</h3>
            {activePromotion.offer && (
              <p className="text-sm text-muted-foreground">Selling: {activePromotion.offer}</p>
            )}
            
            {end && (
              <>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Time Remaining</span>
                  <span className="font-bold text-green-600">{daysRemaining} days</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Ends {format(end, 'MMMM d, yyyy')}
                </p>
              </>
            )}
            
            {activePromotion.goal && (
              <div className="flex items-center gap-2 mt-2 text-sm bg-green-500/10 p-2 rounded">
                <Target className="h-4 w-4 text-green-600" />
                <span>Goal: {activePromotion.goal}</span>
              </div>
            )}
          </div>
        </PremiumCardContent>
      </PremiumCard>
    );
  }

  // Otherwise show next upcoming promotion
  if (!nextPromotion) return null;

  const startDate = new Date(nextPromotion.startDate);
  const daysUntil = differenceInDays(startDate, new Date());

  return (
    <PremiumCard category="plan">
      <PremiumCardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <PremiumCardTitle className="text-base">Next Launch</PremiumCardTitle>
        </div>
      </PremiumCardHeader>
      <PremiumCardContent>
        <div className="space-y-3">
          <h3 className="font-semibold">{nextPromotion.name}</h3>
          {nextPromotion.offer && (
            <p className="text-sm text-muted-foreground">{nextPromotion.offer}</p>
          )}
          
          <div className="text-center py-2">
            <p className="text-4xl font-bold text-primary">{daysUntil}</p>
            <p className="text-xs text-muted-foreground">days until launch</p>
          </div>
          
          <p className="text-xs text-muted-foreground text-center">
            <Clock className="h-3 w-3 inline mr-1" />
            Starts {format(startDate, 'EEEE, MMMM d, yyyy')}
          </p>
          
          {nextPromotion.goal && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Target className="h-3 w-3" />
              Goal: {nextPromotion.goal}
            </div>
          )}
        </div>
      </PremiumCardContent>
    </PremiumCard>
  );
}
