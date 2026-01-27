import { supabase } from '@/integrations/supabase/client';
import { subDays, format, differenceInDays } from 'date-fns';

export interface GapStatus {
  shouldShowAlert: boolean;
  missedDaysInRow: number;
  daysSinceLastCheckIn: number;
  message: string;
  severity: 'warning' | 'urgent' | 'critical';
}

export async function detectGap(userId: string): Promise<GapStatus> {
  // Get last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => 
    format(subDays(new Date(), i), 'yyyy-MM-dd')
  );
  
  // Check for activity in daily plans
  const { data: recentPlans } = await supabase
    .from('daily_plans')
    .select('date, thought, feeling, one_thing, brain_dump, updated_at')
    .eq('user_id', userId)
    .in('date', last7Days)
    .order('date', { ascending: false });
  
  // Count consecutive missed days
  let missedDaysInRow = 0;
  for (const date of last7Days) {
    const plan = recentPlans?.find(p => p.date === date);
    const hasActivity = plan && (
      plan.thought || 
      plan.feeling || 
      plan.one_thing || 
      plan.brain_dump ||
      format(new Date(plan.updated_at), 'yyyy-MM-dd') === date
    );
    
    if (!hasActivity) {
      missedDaysInRow++;
    } else {
      break; // Stop when we find activity
    }
  }
  
  // Get last activity date
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('last_activity_date')
    .eq('id', userId)
    .maybeSingle();
  
  const daysSinceLastCheckIn = profile?.last_activity_date 
    ? differenceInDays(new Date(), new Date(profile.last_activity_date))
    : 999;
  
  // Determine severity and message
  let message = '';
  let severity: 'warning' | 'urgent' | 'critical' = 'warning';
  
  if (missedDaysInRow >= 7 || daysSinceLastCheckIn >= 10) {
    severity = 'critical';
    message = `YOU'VE BEEN GONE FOR ${Math.max(missedDaysInRow, daysSinceLastCheckIn)} DAYS`;
  } else if (missedDaysInRow >= 5 || daysSinceLastCheckIn >= 7) {
    severity = 'urgent';
    message = `IT'S BEEN ${Math.max(missedDaysInRow, daysSinceLastCheckIn)} DAYS`;
  } else if (missedDaysInRow >= 3 || daysSinceLastCheckIn >= 5) {
    severity = 'warning';
    message = `YOU HAVEN'T CHECKED IN FOR ${Math.max(missedDaysInRow, daysSinceLastCheckIn)} DAYS`;
  }
  
  const shouldShowAlert = missedDaysInRow >= 3 || daysSinceLastCheckIn >= 5;
  
  return {
    shouldShowAlert,
    missedDaysInRow,
    daysSinceLastCheckIn,
    message,
    severity
  };
}
