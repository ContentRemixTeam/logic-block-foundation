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

export async function exportAllUserData(userId: string): Promise<Blob> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  // Fetch all user data in parallel - using individual queries to avoid type issues
  const tasksRes = await supabase.from('tasks').select('*').eq('user_id', userId);
  const cyclesRes = await supabase.from('cycles_90_day').select('*').eq('user_id', userId);
  const dailyPlansRes = await supabase.from('daily_plans').select('*').eq('user_id', userId);
  const weeklyPlansRes = await supabase.from('weekly_plans').select('*').eq('user_id', userId);
  const sopsRes = await supabase.from('sops').select('*').eq('user_id', userId);
  const ideasRes = await supabase.from('ideas').select('*').eq('user_id', userId);
  const habitsRes = await supabase.from('habits').select('*').eq('user_id', userId);
  const weeklyReviewsRes = await supabase.from('weekly_reviews').select('*').eq('user_id', userId);
  const monthlyReviewsRes = await supabase.from('monthly_reviews').select('*').eq('user_id', userId);
  const beliefsRes = await supabase.from('beliefs').select('*').eq('user_id', userId);
  const identityAnchorsRes = await supabase.from('identity_anchors').select('*').eq('user_id', userId);
  const thoughtsRes = await supabase.from('useful_thoughts').select('*').eq('user_id', userId);
  const coachingRes = await supabase.from('coaching_entries').select('*').eq('user_id', userId);
  const contentRes = await supabase.from('content_items').select('*').eq('user_id', userId);
  const projectsRes = await supabase.from('projects').select('*').eq('user_id', userId);

  const exportData: ExportData = {
    exportDate: new Date().toISOString(),
    userId,
    version: '1.0',
    data: {
      tasks: (tasksRes.data || []).filter((t: any) => !t.deleted_at),
      cycles: cyclesRes.data || [],
      dailyPlans: dailyPlansRes.data || [],
      weeklyPlans: weeklyPlansRes.data || [],
      sops: (sopsRes.data || []).filter((s: any) => !s.deleted_at),
      ideas: (ideasRes.data || []).filter((i: any) => !i.deleted_at),
      notes: [],
      habits: (habitsRes.data || []).filter((h: any) => !h.deleted_at),
      weeklyReviews: weeklyReviewsRes.data || [],
      monthlyReviews: monthlyReviewsRes.data || [],
      beliefs: beliefsRes.data || [],
      identityAnchors: identityAnchorsRes.data || [],
      thoughts: thoughtsRes.data || [],
      coachingEntries: coachingRes.data || [],
      contentItems: contentRes.data || [],
      projects: projectsRes.data || [],
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
