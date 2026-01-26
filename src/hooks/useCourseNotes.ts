import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CourseNote {
  id: string;
  title: string;
  content: string;
  tags: string[];
  course_id: string | null;
  course_title: string | null;
  created_at: string;
  updated_at: string;
}

export function useCourseNotes(courseId: string) {
  return useQuery({
    queryKey: ['course-notes', courseId],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('get-journal-pages', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { course_id: courseId },
      });

      if (response.error) throw response.error;
      
      return {
        pages: (response.data?.pages || []) as CourseNote[],
        totalCount: response.data?.totalCount || 0,
      };
    },
    enabled: !!courseId,
  });
}
