import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, FileText, BarChart3, Target, CheckCircle2, Share2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Layout } from '@/components/Layout';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, eachWeekOfInterval } from 'date-fns';

interface ReviewCard {
  title: string;
  description: string;
  href: string;
  icon: typeof Sparkles;
  iconBgClass: string;
  iconColorClass: string;
}

const reviewCards: ReviewCard[] = [
  {
    title: 'Daily Review',
    description: 'Reflect on your day and celebrate wins.',
    href: '/daily-review',
    icon: Sparkles,
    iconBgClass: 'bg-rose-100 dark:bg-rose-900/30',
    iconColorClass: 'text-rose-600 dark:text-rose-400',
  },
  {
    title: 'Weekly Review',
    description: 'Review your week and plan ahead.',
    href: '/weekly-review',
    icon: FileText,
    iconBgClass: 'bg-blue-100 dark:bg-blue-900/30',
    iconColorClass: 'text-blue-600 dark:text-blue-400',
  },
  {
    title: 'Weekly Reflection (Share)',
    description: 'Share your wins and lessons with the group.',
    href: '/weekly-reflection',
    icon: Share2,
    iconBgClass: 'bg-teal-100 dark:bg-teal-900/30',
    iconColorClass: 'text-teal-600 dark:text-teal-400',
  },
  {
    title: 'Monthly Review',
    description: 'Assess your monthly progress and lessons.',
    href: '/monthly-review',
    icon: BarChart3,
    iconBgClass: 'bg-amber-100 dark:bg-amber-900/30',
    iconColorClass: 'text-amber-600 dark:text-amber-400',
  },
  {
    title: 'Quarterly Review',
    description: 'Summarize your 90-day cycle results.',
    href: '/cycle-summary',
    icon: Target,
    iconBgClass: 'bg-purple-100 dark:bg-purple-900/30',
    iconColorClass: 'text-purple-600 dark:text-purple-400',
  },
];

interface ReviewStats {
  dailyReviewsCompleted: number;
  dailyReviewsTotal: number;
  weeklyReviewsCompleted: number;
  weeklyReviewsTotal: number;
  monthlyReviewExists: boolean;
  quarterlyReviewExists: boolean;
}

export default function Reviews() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ReviewStats>({
    dailyReviewsCompleted: 0,
    dailyReviewsTotal: 0,
    weeklyReviewsCompleted: 0,
    weeklyReviewsTotal: 0,
    monthlyReviewExists: false,
    quarterlyReviewExists: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      if (!user) return;

      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      // Calculate days in month up to today
      const daysUpToToday = eachDayOfInterval({ start: monthStart, end: now });
      const weeksInMonth = eachWeekOfInterval({ start: monthStart, end: now });

      try {
        // Fetch daily reviews for this month by joining with daily_plans
        const { data: dailyReviews } = await supabase
          .from('daily_reviews')
          .select('review_id, created_at')
          .eq('user_id', user.id)
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', now.toISOString());

        // Fetch weekly reviews for this month
        const { data: weeklyReviews } = await supabase
          .from('weekly_reviews')
          .select('review_id, week_start_date')
          .eq('user_id', user.id)
          .gte('week_start_date', format(monthStart, 'yyyy-MM-dd'))
          .lte('week_start_date', format(monthEnd, 'yyyy-MM-dd'));

        // Check for monthly review (month is stored as a number: YYYYMM)
        const monthNumber = parseInt(format(now, 'yyyyMM'));
        const { data: monthlyReview } = await supabase
          .from('monthly_reviews')
          .select('review_id')
          .eq('user_id', user.id)
          .eq('month', monthNumber)
          .maybeSingle();

        // Check for quarterly review (cycle summary stored in supporting_projects)
        const { data: currentCycle } = await supabase
          .from('cycles_90_day')
          .select('cycle_id, supporting_projects')
          .eq('user_id', user.id)
          .lte('start_date', format(now, 'yyyy-MM-dd'))
          .gte('end_date', format(now, 'yyyy-MM-dd'))
          .maybeSingle();

        // Parse supporting_projects to check if summary exists
        let hasQuarterlyReview = false;
        if (currentCycle?.supporting_projects) {
          try {
            const summary = typeof currentCycle.supporting_projects === 'string' 
              ? JSON.parse(currentCycle.supporting_projects) 
              : currentCycle.supporting_projects;
            hasQuarterlyReview = !!(summary?.identity_shifts || summary?.final_results || summary?.cycle_score);
          } catch {
            hasQuarterlyReview = false;
          }
        }

        setStats({
          dailyReviewsCompleted: dailyReviews?.length || 0,
          dailyReviewsTotal: daysUpToToday.length,
          weeklyReviewsCompleted: weeklyReviews?.length || 0,
          weeklyReviewsTotal: weeksInMonth.length,
          monthlyReviewExists: !!monthlyReview,
          quarterlyReviewExists: hasQuarterlyReview,
        });
      } catch (error) {
        console.error('Error fetching review stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [user]);

  const dailyProgress = stats.dailyReviewsTotal > 0 
    ? Math.round((stats.dailyReviewsCompleted / stats.dailyReviewsTotal) * 100) 
    : 0;

  const weeklyProgress = stats.weeklyReviewsTotal > 0 
    ? Math.round((stats.weeklyReviewsCompleted / stats.weeklyReviewsTotal) * 100) 
    : 0;

  return (
    <Layout>
      <div className="max-w-4xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Reviews</h1>
          <p className="text-muted-foreground">Your reflection command center</p>
        </div>

        {/* Reviews Tracker */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">This Month's Review Progress</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Daily Reviews */}
            <div className="text-center p-4 rounded-lg bg-rose-50 dark:bg-rose-900/20">
              <p className="text-sm text-muted-foreground mb-1">Daily</p>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                {stats.dailyReviewsCompleted}/{stats.dailyReviewsTotal}
              </p>
              <p className="text-xs text-muted-foreground">{dailyProgress}%</p>
            </div>

            {/* Weekly Reviews */}
            <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <p className="text-sm text-muted-foreground mb-1">Weekly</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.weeklyReviewsCompleted}/{stats.weeklyReviewsTotal}
              </p>
              <p className="text-xs text-muted-foreground">{weeklyProgress}%</p>
            </div>

            {/* Monthly Review */}
            <div className="text-center p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20">
              <p className="text-sm text-muted-foreground mb-1">Monthly</p>
              {stats.monthlyReviewExists ? (
                <CheckCircle2 className="h-8 w-8 mx-auto text-amber-600 dark:text-amber-400" />
              ) : (
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">—</p>
              )}
              <p className="text-xs text-muted-foreground">
                {stats.monthlyReviewExists ? 'Complete' : 'Not started'}
              </p>
            </div>

            {/* Quarterly Review */}
            <div className="text-center p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20">
              <p className="text-sm text-muted-foreground mb-1">Quarterly</p>
              {stats.quarterlyReviewExists ? (
                <CheckCircle2 className="h-8 w-8 mx-auto text-purple-600 dark:text-purple-400" />
              ) : (
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">—</p>
              )}
              <p className="text-xs text-muted-foreground">
                {stats.quarterlyReviewExists ? 'Complete' : 'Not started'}
              </p>
            </div>
          </div>
        </Card>

        {/* Review Options */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Review Options</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviewCards.map((card) => (
              <Link
                key={card.href}
                to={card.href}
                className="block"
              >
                <Card className={cn(
                  "p-6 h-full transition-all duration-200",
                  "hover:shadow-lg hover:border-primary/50",
                  "cursor-pointer"
                )}>
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "p-3 rounded-lg",
                      card.iconBgClass
                    )}>
                      <card.icon className={cn("h-6 w-6", card.iconColorClass)} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold hover:text-primary transition-colors">
                        {card.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {card.description}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
