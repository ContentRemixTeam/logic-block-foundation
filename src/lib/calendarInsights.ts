import { addDays, format, isWithinInterval, startOfDay } from 'date-fns';
import { CalendarItem } from './calendarConstants';

export interface WeekInsight {
  id: string;
  tone: 'positive' | 'gentle' | 'caution';
  icon: '✨' | '🌱' | '🌿' | '⚠️' | '💡' | '🎯' | '🔁';
  message: string;
}

export interface WeekSummary {
  totalThisWeek: number;
  scheduledThisWeek: number;
  publishedThisWeek: number;
  emptyDays: string[]; // formatted "EEE"
  byChannel: Array<{ channel: string; count: number }>;
  insights: WeekInsight[];
}

const LOW_EFFORT_TYPE_RE = /repurpose|repost|story|quote|short|reel|carousel|template|recycle|round\s*up/i;

export function isLowEffortItem(item: CalendarItem): boolean {
  return LOW_EFFORT_TYPE_RE.test(item.type ?? '') || LOW_EFFORT_TYPE_RE.test(item.title ?? '');
}

export function buildWeekSummary(
  items: CalendarItem[],
  weekStart: Date,
  opts: { lowEnergyMode?: boolean } = {}
): WeekSummary {
  const start = startOfDay(weekStart);
  const end = addDays(start, 6);
  const within = (d: string | null) => {
    if (!d) return false;
    const dt = startOfDay(new Date(d));
    return isWithinInterval(dt, { start, end });
  };

  const weekItems = items.filter(i => within(i.publishDate) || within(i.creationDate));

  // Empty days (no publish + no create scheduled)
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const emptyDays = days
    .filter(day => {
      const key = format(day, 'yyyy-MM-dd');
      return !weekItems.some(i => i.publishDate === key || i.creationDate === key);
    })
    .map(d => format(d, 'EEE'));

  // Channel breakdown (publish-side)
  const channelMap = new Map<string, number>();
  weekItems.forEach(i => {
    if (!i.publishDate || !within(i.publishDate)) return;
    const ch = (i.channel || 'unspecified').toLowerCase();
    channelMap.set(ch, (channelMap.get(ch) ?? 0) + 1);
  });
  const byChannel = Array.from(channelMap.entries())
    .map(([channel, count]) => ({ channel, count }))
    .sort((a, b) => b.count - a.count);

  const scheduledThisWeek = weekItems.filter(i => within(i.publishDate)).length;
  const publishedThisWeek = weekItems.filter(
    i => (i.status === 'published' || i.status === 'completed') && within(i.publishDate)
  ).length;

  // Deterministic insights — keep gentle in tone
  const insights: WeekInsight[] = [];

  if (weekItems.length === 0) {
    insights.push({
      id: 'empty-week',
      tone: 'gentle',
      icon: '🌱',
      message: 'A blank week. Drop one idea in the Inbox to get started.',
    });
  } else {
    if (publishedThisWeek > 0 && publishedThisWeek === scheduledThisWeek) {
      insights.push({
        id: 'all-published',
        tone: 'positive',
        icon: '✨',
        message: `You shipped everything you planned this week (${publishedThisWeek}). Beautiful.`,
      });
    }

    if (emptyDays.length >= 4) {
      insights.push({
        id: 'lots-empty',
        tone: 'gentle',
        icon: '🌿',
        message: `${emptyDays.length} quiet days this week — plenty of room to breathe or batch.`,
      });
    } else if (emptyDays.length > 0 && emptyDays.length <= 2) {
      insights.push({
        id: 'few-empty',
        tone: 'gentle',
        icon: '💡',
        message: `Only ${emptyDays.join(', ')} empty. A repurpose could fill it without effort.`,
      });
    }

    if (byChannel.length === 1 && byChannel[0].count >= 3) {
      insights.push({
        id: 'one-channel',
        tone: 'caution',
        icon: '🎯',
        message: `All ${byChannel[0].count} posts are on ${byChannel[0].channel}. One bonus channel could compound reach.`,
      });
    }

    if (byChannel.length >= 2) {
      const top = byChannel[0];
      const total = byChannel.reduce((s, c) => s + c.count, 0);
      if (top.count / total >= 0.7 && total >= 4) {
        insights.push({
          id: 'channel-imbalance',
          tone: 'caution',
          icon: '⚠️',
          message: `${Math.round((top.count / total) * 100)}% of this week sits on ${top.channel}. Worth balancing?`,
        });
      }
    }

    const lowEffortCount = weekItems.filter(isLowEffortItem).length;
    if (opts.lowEnergyMode) {
      insights.push({
        id: 'low-energy-mode',
        tone: 'gentle',
        icon: '🔁',
        message: lowEffortCount > 0
          ? `Low-energy week: ${lowEffortCount} repurpose-friendly piece${lowEffortCount === 1 ? '' : 's'} already planned.`
          : 'Low-energy week: try repurposing a past post instead of creating new.',
      });
    }
  }

  return {
    totalThisWeek: weekItems.length,
    scheduledThisWeek,
    publishedThisWeek,
    emptyDays,
    byChannel,
    insights,
  };
}
