import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { 
  Course, 
  CourseStudyPlan, 
  CourseCheckin, 
  CourseFormData, 
  StudyPlanFormData,
  CheckinFormData,
  CourseWithNextSession,
  CourseStatus 
} from '@/types/course';

// Query keys
export const courseQueryKeys = {
  all: (page: number, search: string, status: string) => 
    ['courses', page, search, status] as const,
  single: (id: string) => ['course', id] as const,
  studyPlan: (courseId: string) => ['course-study-plan', courseId] as const,
  checkins: (courseId: string, page: number) => ['course-checkins', courseId, page] as const,
  weeklyProgress: () => ['course-weekly-progress'] as const,
  roiDue: () => ['courses-roi-due'] as const,
};

interface CoursesResponse {
  courses: CourseWithNextSession[];
  total_count: number;
  has_more: boolean;
}

// Hook: Fetch paginated courses list
export function useCourses({ 
  page = 1, 
  search = '', 
  status = '' 
}: { 
  page?: number; 
  search?: string; 
  status?: string;
}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: courseQueryKeys.all(page, search, status),
    queryFn: async (): Promise<CoursesResponse> => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('get-courses', {
        body: { page, search, status, limit: 20 },
      });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

// Hook: Fetch single course with study plan and next session
export function useCourse(courseId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: courseQueryKeys.single(courseId),
    queryFn: async (): Promise<CourseWithNextSession> => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('manage-course', {
        body: { action: 'get', course_id: courseId },
      });

      if (error) throw error;
      return data.course;
    },
    enabled: !!user && !!courseId,
  });
}

// Hook: Fetch study plan for a course
export function useCourseStudyPlan(courseId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: courseQueryKeys.studyPlan(courseId),
    queryFn: async (): Promise<CourseStudyPlan | null> => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('course_study_plans')
        .select('*')
        .eq('course_id', courseId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as CourseStudyPlan | null;
    },
    enabled: !!user && !!courseId,
  });
}

// Hook: Fetch checkins for a course
export function useCourseCheckins(courseId: string, page: number = 1) {
  const { user } = useAuth();

  return useQuery({
    queryKey: courseQueryKeys.checkins(courseId, page),
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const limit = 10;
      const offset = (page - 1) * limit;

      const { data, error, count } = await supabase
        .from('course_checkins')
        .select('*', { count: 'exact' })
        .eq('course_id', courseId)
        .eq('user_id', user.id)
        .order('checkin_date', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      
      return {
        checkins: data as CourseCheckin[],
        total_count: count || 0,
        has_more: (count || 0) > offset + limit,
      };
    },
    enabled: !!user && !!courseId,
  });
}

// Hook: Weekly progress for reviews
export function useCourseWeeklyProgress() {
  const { user } = useAuth();

  return useQuery({
    queryKey: courseQueryKeys.weeklyProgress(),
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('get-courses', {
        body: { action: 'weekly_progress' },
      });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

// Hook: Courses with ROI check-ins due
export function useCoursesROIDue() {
  const { user } = useAuth();

  return useQuery({
    queryKey: courseQueryKeys.roiDue(),
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('get-courses', {
        body: { action: 'roi_due' },
      });

      if (error) throw error;
      return data.courses as Course[];
    },
    enabled: !!user,
  });
}

// Mutations hook
export function useCourseMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const createCourse = useMutation({
    mutationFn: async (formData: CourseFormData) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('manage-course', {
        body: { action: 'create', ...formData },
      });

      if (error) throw error;
      return data.course as Course;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success('Course added successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to add course', { description: error.message });
    },
  });

  const updateCourse = useMutation({
    mutationFn: async ({ id, ...formData }: CourseFormData & { id: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('manage-course', {
        body: { action: 'update', course_id: id, ...formData },
      });

      if (error) throw error;
      return data.course as Course;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: courseQueryKeys.single(data.id) });
      toast.success('Course updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update course', { description: error.message });
    },
  });

  const deleteCourse = useMutation({
    mutationFn: async (courseId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.functions.invoke('manage-course', {
        body: { action: 'delete', course_id: courseId },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success('Course deleted');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete course', { description: error.message });
    },
  });

  const updateProgress = useMutation({
    mutationFn: async ({ id, progress_percent }: { id: string; progress_percent: number }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('manage-course', {
        body: { action: 'update', course_id: id, progress_percent },
      });

      if (error) throw error;
      return data.course as Course;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: courseQueryKeys.single(data.id) });
    },
    onError: (error: Error) => {
      toast.error('Failed to update progress', { description: error.message });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CourseStatus }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('manage-course', {
        body: { action: 'update', course_id: id, status },
      });

      if (error) throw error;
      return data.course as Course;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: courseQueryKeys.single(data.id) });
    },
    onError: (error: Error) => {
      toast.error('Failed to update status', { description: error.message });
    },
  });

  const updateNotes = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('manage-course', {
        body: { action: 'update', course_id: id, notes },
      });

      if (error) throw error;
      return data.course as Course;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: courseQueryKeys.single(data.id) });
    },
    onError: (error: Error) => {
      toast.error('Failed to save notes', { description: error.message });
    },
  });

  return {
    createCourse,
    updateCourse,
    deleteCourse,
    updateProgress,
    updateStatus,
    updateNotes,
  };
}

// Study Plan mutations
export function useStudyPlanMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const savePlan = useMutation({
    mutationFn: async ({ courseId, ...formData }: StudyPlanFormData & { courseId: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('manage-study-plan', {
        body: { action: 'save', course_id: courseId, ...formData },
      });

      if (error) throw error;
      return data.plan as CourseStudyPlan;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: courseQueryKeys.studyPlan(data.course_id) });
      toast.success('Study plan saved');
    },
    onError: (error: Error) => {
      toast.error('Failed to save study plan', { description: error.message });
    },
  });

  const generateSessions = useMutation({
    mutationFn: async ({ courseId, planId, weeks = 6, projectId }: { courseId: string; planId: string; weeks?: number; projectId?: string | null }) => {
      if (!user) throw new Error('Not authenticated');

      const clientOpId = crypto.randomUUID();

      const { data, error } = await supabase.functions.invoke('manage-study-plan', {
        body: { 
          action: 'generate_sessions', 
          course_id: courseId, 
          plan_id: planId,
          client_op_id: clientOpId,
          weeks,
          project_id: projectId,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
       queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      if (data.created_count > 0) {
        toast.success(`Generated ${data.created_count} study session${data.created_count > 1 ? 's' : ''}`);
      } else {
        toast.info('No new sessions to generate');
      }
    },
    onError: (error: Error) => {
      toast.error('Failed to generate sessions', { description: error.message });
    },
  });

  const regenerateFutureSessions = useMutation({
    mutationFn: async ({ courseId, planId }: { courseId: string; planId: string }) => {
      if (!user) throw new Error('Not authenticated');

      const clientOpId = crypto.randomUUID();

      const { data, error } = await supabase.functions.invoke('manage-study-plan', {
        body: { 
          action: 'regenerate_future', 
          course_id: courseId, 
          plan_id: planId,
          client_op_id: clientOpId,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
       queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      toast.success(`Regenerated ${data.created_count} future session${data.created_count !== 1 ? 's' : ''}`);
    },
    onError: (error: Error) => {
      toast.error('Failed to regenerate sessions', { description: error.message });
    },
  });

  return {
    savePlan,
    generateSessions,
    regenerateFutureSessions,
  };
}

// Checkin mutations
export function useCheckinMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const createCheckin = useMutation({
    mutationFn: async ({ courseId, ...formData }: CheckinFormData & { courseId: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('course_checkins')
        .insert({
          user_id: user.id,
          course_id: courseId,
          checkin_type: formData.checkin_type,
          checkin_date: new Date().toISOString().split('T')[0],
          on_track: formData.on_track,
          notes: formData.notes || null,
          blocker: formData.blocker || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as CourseCheckin;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['course-checkins', data.course_id] });
      toast.success('Check-in logged');
    },
    onError: (error: Error) => {
      toast.error('Failed to log check-in', { description: error.message });
    },
  });

  return { createCheckin };
}
