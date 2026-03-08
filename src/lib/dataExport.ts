import { supabase } from '@/integrations/supabase/client';

interface ExportData {
  exportDate: string;
  userId: string;
  version: string;
  data: {
    tasks: any[];
    cycles: any[];
    dailyPlans: any[];
    weeklyPlans: any[];
    sops: any[];
    ideas: any[];
    notes: any[];
    habits: any[];
    weeklyReviews: any[];
    monthlyReviews: any[];
    beliefs: any[];
    identityAnchors: any[];
    thoughts: any[];
    coachingEntries: any[];
    contentItems: any[];
    projects: any[];
  };
}

// Paginated fetch to handle tables with >1000 rows (Supabase default limit)
async function fetchAll(table: string, userId: string): Promise<any[]> {
  const PAGE_SIZE = 1000;
  let all: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('user_id', userId)
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    all = all.concat(data || []);
    hasMore = (data?.length ?? 0) === PAGE_SIZE;
    from += PAGE_SIZE;
  }

  return all;
}

export async function exportAllUserData(userId: string): Promise<Blob> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  // Fetch all user data in parallel with pagination support
  const [
    tasks, cycles, dailyPlans, weeklyPlans, sops, ideas, habits,
    weeklyReviews, monthlyReviews, beliefs, identityAnchors, thoughts,
    coachingEntries, contentItems, projects
  ] = await Promise.all([
    fetchAll('tasks', userId),
    fetchAll('cycles_90_day', userId),
    fetchAll('daily_plans', userId),
    fetchAll('weekly_plans', userId),
    fetchAll('sops', userId),
    fetchAll('ideas', userId),
    fetchAll('habits', userId),
    fetchAll('weekly_reviews', userId),
    fetchAll('monthly_reviews', userId),
    fetchAll('beliefs', userId),
    fetchAll('identity_anchors', userId),
    fetchAll('useful_thoughts', userId),
    fetchAll('coaching_entries', userId),
    fetchAll('content_items', userId),
    fetchAll('projects', userId),
  ]);

  const exportData: ExportData = {
    exportDate: new Date().toISOString(),
    userId,
    version: '1.0',
    data: {
      tasks: tasks.filter((t: any) => !t.deleted_at),
      cycles,
      dailyPlans,
      weeklyPlans,
      sops: sops.filter((s: any) => !s.deleted_at),
      ideas: ideas.filter((i: any) => !i.deleted_at),
      notes: [],
      habits: habits.filter((h: any) => !h.deleted_at),
      weeklyReviews,
      monthlyReviews,
      beliefs,
      identityAnchors,
      thoughts,
      coachingEntries,
      contentItems,
      projects,
    }
  };

  // Create formatted JSON blob
  const json = JSON.stringify(exportData, null, 2);
  return new Blob([json], { type: 'application/json' });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function getExportStats(exportData: ExportData): Record<string, number> {
  return Object.entries(exportData.data).reduce((acc, [key, value]) => {
    acc[key] = value.length;
    return acc;
  }, {} as Record<string, number>);
}
