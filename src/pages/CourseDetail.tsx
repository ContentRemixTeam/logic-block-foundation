import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  BookOpen,
  Target,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Plus,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { 
  CourseFormDrawer, 
  StudyPlanForm, 
  CheckinFormModal 
} from '@/components/courses';
import { useCourse, useCourseMutations, useCourseCheckins } from '@/hooks/useCourses';
import { 
  COURSE_STATUS_LABELS, 
  ROI_TYPE_LABELS, 
  CHECKIN_TYPE_LABELS,
  type CourseStatus 
} from '@/types/course';
import { cn } from '@/lib/utils';


export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: course, isLoading, error } = useCourse(id || '');
  const { deleteCourse, updateProgress, updateStatus, updateNotes } = useCourseMutations();
  const { data: checkinsData } = useCourseCheckins(id || '', 1);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCheckinOpen, setIsCheckinOpen] = useState(false);
  const [localProgress, setLocalProgress] = useState<number | null>(null);
  const [localNotes, setLocalNotes] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!id) return;
    await deleteCourse.mutateAsync(id);
    navigate('/courses');
  };

  const handleProgressChange = (value: number[]) => {
    setLocalProgress(value[0]);
  };

  const handleProgressCommit = () => {
    if (localProgress !== null && id) {
      updateProgress.mutate({ id, progress_percent: localProgress });
    }
  };

  const handleStatusChange = (status: CourseStatus) => {
    if (id) {
      updateStatus.mutate({ id, status });
    }
  };

  const handleNotesBlur = () => {
    if (localNotes !== null && id && localNotes !== course?.notes) {
      updateNotes.mutate({ id, notes: localNotes });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container max-w-4xl py-6 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  if (error || !course) {
    return (
      <Layout>
        <div className="container max-w-4xl py-6">
          <div className="text-center py-12">
            <p className="text-destructive mb-4">Course not found</p>
            <Button asChild>
              <Link to="/courses">Back to Courses</Link>
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const displayProgress = localProgress ?? course.progress_percent;
  const displayNotes = localNotes ?? course.notes ?? '';

  return (
    <Layout>
      <div className="container max-w-4xl py-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Button variant="ghost" size="sm" className="mb-2 -ml-2" asChild>
              <Link to="/courses">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Courses
              </Link>
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              {course.title}
            </h1>
            {course.provider && (
              <p className="text-muted-foreground">{course.provider}</p>
            )}
            {course.course_url && (
              <a
                href={course.course_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline inline-flex items-center gap-1"
              >
                Open course <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => setIsEditOpen(true)}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Course?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this course and all associated study plans.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Status & Progress Card */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Status</label>
                <Select value={course.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(COURSE_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[200px] space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{displayProgress}%</span>
                </div>
                <Slider
                  value={[displayProgress]}
                  onValueChange={handleProgressChange}
                  onValueCommit={handleProgressCommit}
                  max={100}
                  step={5}
                />
              </div>
            </div>

            {course.next_session_date && (
              <div className="flex items-center gap-2 text-sm p-3 bg-muted/50 rounded-lg">
                <Clock className="h-4 w-4 text-primary" />
                <span>
                  Next session: <strong>{course.next_session_title}</strong>
                  {' — '}
                  {format(new Date(course.next_session_date), 'MMM d')}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="plan">Study Plan</TabsTrigger>
            <TabsTrigger value="takeaways">Takeaways</TabsTrigger>
            <TabsTrigger value="checkins">Check-ins</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {course.intention && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">📋 Intention</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{course.intention}</p>
                </CardContent>
              </Card>
            )}

            {(course.roi_target || course.success_criteria) && (
              <div className="grid sm:grid-cols-2 gap-4">
                {course.roi_target && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        ROI Target
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {course.roi_type && (
                        <Badge variant="secondary" className="mb-2">
                          {ROI_TYPE_LABELS[course.roi_type]}
                        </Badge>
                      )}
                      <p className="font-medium">{course.roi_target}</p>
                    </CardContent>
                  </Card>
                )}

                {course.success_criteria && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">✅ Success Criteria</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{course.success_criteria}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-6 text-sm">
                  {course.start_date && (
                    <div>
                      <span className="text-muted-foreground">Start: </span>
                      <span className="font-medium">
                        {format(new Date(course.start_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}
                  {course.target_finish_date && (
                    <div>
                      <span className="text-muted-foreground">Target Finish: </span>
                      <span className="font-medium">
                        {format(new Date(course.target_finish_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}
                  {course.roi_checkin_date && (
                    <div>
                      <span className="text-muted-foreground">ROI Check-in: </span>
                      <span className="font-medium">
                        {format(new Date(course.roi_checkin_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Study Plan Tab */}
          <TabsContent value="plan">
            <StudyPlanForm courseId={course.id} />
          </TabsContent>

          {/* Takeaways Tab */}
          <TabsContent value="takeaways" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Notes & Takeaways</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Capture key insights, implementation ideas, and notes from this course..."
                  value={displayNotes}
                  onChange={(e) => setLocalNotes(e.target.value)}
                  onBlur={handleNotesBlur}
                  rows={10}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Auto-saves when you click away
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Check-ins Tab */}
          <TabsContent value="checkins" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Check-ins</h3>
              <Button onClick={() => setIsCheckinOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Log Check-in
              </Button>
            </div>

            {checkinsData?.checkins.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  No check-ins yet. Log your first check-in to track your progress.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {checkinsData?.checkins.map((checkin) => (
                  <Card key={checkin.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {CHECKIN_TYPE_LABELS[checkin.checkin_type]}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(checkin.checkin_date), 'MMM d, yyyy')}
                            </span>
                          </div>
                          {checkin.notes && (
                            <p className="text-sm text-muted-foreground">{checkin.notes}</p>
                          )}
                        </div>
                        <div className="shrink-0">
                          {checkin.on_track === true && (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          )}
                          {checkin.on_track === null && (
                            <AlertCircle className="h-5 w-5 text-yellow-500" />
                          )}
                          {checkin.on_track === false && (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <CourseFormDrawer
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        course={course}
      />

      <CheckinFormModal
        open={isCheckinOpen}
        onOpenChange={setIsCheckinOpen}
        courseId={course.id}
      />
    </Layout>
  );
}
