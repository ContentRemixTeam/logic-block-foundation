import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { CalendarIcon, Link as LinkIcon, ChevronRight } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Course, CourseFormData, ROIType } from '@/types/course';
import { ROI_TYPE_LABELS } from '@/types/course';
import { useCourseMutations, useStudyPlanMutations } from '@/hooks/useCourses';
import { CourseStudyPlanStep } from './CourseStudyPlanStep';
import { useProjectMutations } from '@/hooks/useProjects';
import { PROJECT_COLORS } from '@/types/project';

interface CourseFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course?: Course | null;
}

type Step = 'course' | 'study-plan';

export function CourseFormDrawer({ open, onOpenChange, course }: CourseFormDrawerProps) {
  const { createCourse, updateCourse } = useCourseMutations();
  const { savePlan, generateSessions } = useStudyPlanMutations();
  const { createProject } = useProjectMutations();
  const isEditing = !!course;

  const [step, setStep] = useState<Step>('course');
  const [pendingCourseData, setPendingCourseData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<CourseFormData>({
    defaultValues: {
      title: '',
      provider: '',
      course_url: '',
      intention: '',
      roi_type: undefined,
      roi_target: '',
      success_criteria: '',
      roi_checkin_days: 30,
    },
  });

  const [startDate, setStartDate] = useState<Date | undefined>();
  const [targetFinishDate, setTargetFinishDate] = useState<Date | undefined>();
  const [purchaseDate, setPurchaseDate] = useState<Date | undefined>();

  // Reset form when drawer opens/closes or course changes
  useEffect(() => {
    if (!open) {
      setStep('course');
      setPendingCourseData(null);
      setIsSubmitting(false);
    }
    
    if (course) {
      reset({
        title: course.title,
        provider: course.provider || '',
        course_url: course.course_url || '',
        intention: course.intention || '',
        roi_type: course.roi_type as ROIType | undefined,
        roi_target: course.roi_target || '',
        success_criteria: course.success_criteria || '',
        roi_checkin_days: course.roi_checkin_days,
      });
      setStartDate(course.start_date ? new Date(course.start_date) : undefined);
      setTargetFinishDate(course.target_finish_date ? new Date(course.target_finish_date) : undefined);
      setPurchaseDate(course.purchase_date ? new Date(course.purchase_date) : undefined);
    } else {
      reset({
        title: '',
        provider: '',
        course_url: '',
        intention: '',
        roi_type: undefined,
        roi_target: '',
        success_criteria: '',
        roi_checkin_days: 30,
      });
      setStartDate(undefined);
      setTargetFinishDate(undefined);
      setPurchaseDate(undefined);
    }
  }, [course, reset, open]);

  const onCourseSubmit = async (data: CourseFormData) => {
    const formData = {
      ...data,
      start_date: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
      target_finish_date: targetFinishDate ? format(targetFinishDate, 'yyyy-MM-dd') : undefined,
      purchase_date: purchaseDate ? format(purchaseDate, 'yyyy-MM-dd') : undefined,
    };

    if (isEditing && course) {
      // For editing, just save the course
      await updateCourse.mutateAsync({ id: course.id, ...formData });
      onOpenChange(false);
    } else {
      // For new courses, go to study plan step
      setPendingCourseData(formData);
      setStep('study-plan');
    }
  };

  const handleStudyPlanComplete = async (studyPlanData: any) => {
    if (!pendingCourseData) return;
    
    setIsSubmitting(true);
    
    try {
      // Step 1: Create the course
      const newCourse = await createCourse.mutateAsync(pendingCourseData);
      
      if (!newCourse?.id) {
        throw new Error('Failed to create course');
      }

      // Step 2: If study plan requested, create project and study plan
      if (studyPlanData) {
        let projectId = studyPlanData.projectId;

        // Create a new project if requested
        if (studyPlanData.createNewProject) {
          const suggestedName = `Study: ${pendingCourseData.title}`;
          const newProject = await createProject.mutateAsync({
            name: suggestedName,
            color: PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)],
            status: 'active',
            start_date: format(studyPlanData.startDate, 'yyyy-MM-dd'),
            end_date: studyPlanData.targetFinishDate ? format(studyPlanData.targetFinishDate, 'yyyy-MM-dd') : null,
          });
          projectId = newProject?.id || null;
        }

        // Calculate sessions per week based on study mode
        let sessionsPerWeek = studyPlanData.sessionsPerWeek;
        if (studyPlanData.studyMode === 'hours_weekly') {
          sessionsPerWeek = Math.ceil((studyPlanData.hoursPerWeek * 60) / studyPlanData.sessionMinutes);
        } else if (studyPlanData.studyMode === 'hours_monthly') {
          const weeklyHours = studyPlanData.hoursPerMonth / 4;
          sessionsPerWeek = Math.ceil((weeklyHours * 60) / studyPlanData.sessionMinutes);
        }

        // Save the study plan
        const plan = await savePlan.mutateAsync({
          courseId: newCourse.id,
          sessions_per_week: sessionsPerWeek,
          session_minutes: studyPlanData.sessionMinutes,
          preferred_days: studyPlanData.preferredDays,
          start_date: format(studyPlanData.startDate, 'yyyy-MM-dd'),
          target_finish_date: studyPlanData.targetFinishDate 
            ? format(studyPlanData.targetFinishDate, 'yyyy-MM-dd') 
            : undefined,
          project_id: projectId,
          study_mode: studyPlanData.studyMode,
          study_hours_per_week: studyPlanData.studyMode === 'hours_weekly' ? studyPlanData.hoursPerWeek : null,
          study_hours_per_month: studyPlanData.studyMode === 'hours_monthly' ? studyPlanData.hoursPerMonth : null,
        });

        // Generate study sessions
        if (plan?.id) {
          await generateSessions.mutateAsync({
            courseId: newCourse.id,
            planId: plan.id,
            projectId: projectId,
          });
        }
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create course with study plan:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPending = createCourse.isPending || updateCourse.isPending || isSubmitting;
  const watchedTitle = watch('title');

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>
            {isEditing ? 'Edit Course' : step === 'course' ? 'Add Course' : 'Create Study Plan'}
          </DrawerTitle>
        </DrawerHeader>

        <ScrollArea className="flex-1 px-4">
          {step === 'course' && (
            <form id="course-form" onSubmit={handleSubmit(onCourseSubmit)} className="space-y-6 pb-4">
              {/* Basic Info */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">Basic Info</h4>
                
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="Course name"
                    {...register('title', { required: 'Title is required' })}
                  />
                  {errors.title && (
                    <p className="text-sm text-destructive">{errors.title.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="provider">Provider</Label>
                    <Input
                      id="provider"
                      placeholder="e.g., Udemy, Coursera"
                      {...register('provider')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="course_url">URL</Label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="course_url"
                        placeholder="https://..."
                        className="pl-9"
                        {...register('course_url')}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Purchase Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !purchaseDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {purchaseDate ? format(purchaseDate, 'PPP') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={purchaseDate}
                        onSelect={setPurchaseDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Intention & ROI */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">Intention & ROI</h4>

                <div className="space-y-2">
                  <Label htmlFor="intention">Intention</Label>
                  <Textarea
                    id="intention"
                    placeholder="Why are you taking this course? What will you learn?"
                    rows={3}
                    {...register('intention')}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>ROI Type</Label>
                    <Select
                      value={watch('roi_type') || ''}
                      onValueChange={(value) => setValue('roi_type', value as ROIType)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ROI_TYPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="roi_target">ROI Target</Label>
                    <Input
                      id="roi_target"
                      placeholder="e.g., $5k/mo, 10 leads"
                      {...register('roi_target')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="success_criteria">Success Criteria</Label>
                  <Textarea
                    id="success_criteria"
                    placeholder="How will you know it worked?"
                    rows={2}
                    {...register('success_criteria')}
                  />
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">Timeline</h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !startDate && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, 'PPP') : 'Select date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Target Finish</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !targetFinishDate && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {targetFinishDate ? format(targetFinishDate, 'PPP') : 'Select date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={targetFinishDate}
                          onSelect={setTargetFinishDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>ROI Check-in Cadence</Label>
                  <Select
                    value={String(watch('roi_checkin_days'))}
                    onValueChange={(value) => setValue('roi_checkin_days', Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days after start</SelectItem>
                      <SelectItem value="60">60 days after start</SelectItem>
                      <SelectItem value="90">90 days after start</SelectItem>
                    </SelectContent>
                  </Select>
                  {startDate && (
                    <p className="text-xs text-muted-foreground">
                      ROI check-in: {format(
                        new Date(startDate.getTime() + watch('roi_checkin_days') * 24 * 60 * 60 * 1000),
                        'MMM d, yyyy'
                      )}
                    </p>
                  )}
                </div>
              </div>
            </form>
          )}

          {step === 'study-plan' && (
            <CourseStudyPlanStep
              courseTitle={watchedTitle || pendingCourseData?.title || 'Course'}
              courseStartDate={startDate}
              courseTargetFinish={targetFinishDate}
              onComplete={handleStudyPlanComplete}
              onBack={() => setStep('course')}
              isSubmitting={isSubmitting}
            />
          )}
        </ScrollArea>

        {step === 'course' && (
          <DrawerFooter className="border-t pt-4">
            <div className="flex gap-2">
              <DrawerClose asChild>
                <Button variant="outline" className="flex-1">Cancel</Button>
              </DrawerClose>
              <Button 
                type="submit" 
                form="course-form" 
                className="flex-1"
                disabled={isPending}
              >
                {isPending ? 'Saving...' : isEditing ? 'Save Changes' : (
                  <>
                    Next: Study Plan
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
