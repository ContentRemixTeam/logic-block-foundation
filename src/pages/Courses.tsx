import { useState } from 'react';
import { Plus, Search, BookOpen, Loader2 } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { CourseCard, CourseFormDrawer } from '@/components/courses';
import { useCourses } from '@/hooks/useCourses';
import type { CourseStatus } from '@/types/course';

const STATUS_TABS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'implementing', label: 'Implementing' },
  { value: 'complete', label: 'Complete' },
  { value: 'archived', label: 'Archived' },
];

export default function Courses() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data, isLoading, error } = useCourses({
    page,
    search,
    status: statusFilter,
  });

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  return (
    <Layout>
      <div className="container max-w-4xl py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              Courses
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Track your learning and implementation
            </p>
          </div>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Course
          </Button>
        </div>

        {/* Search & Filters */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Tabs value={statusFilter} onValueChange={handleStatusChange}>
            <TabsList className="w-full justify-start overflow-x-auto">
              {STATUS_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="shrink-0">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Course List */}
        <div className="space-y-3">
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))
          ) : error ? (
            <div className="text-center py-12 text-destructive">
              Failed to load courses. Please try again.
            </div>
          ) : data?.courses.length === 0 ? (
            // Empty state
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No courses yet</h3>
              <p className="text-muted-foreground mb-4">
                {search || statusFilter 
                  ? 'No courses match your filters'
                  : 'Add your first course to start tracking your learning'}
              </p>
              {!search && !statusFilter && (
                <Button onClick={() => setIsFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Course
                </Button>
              )}
            </div>
          ) : (
            <>
              {data?.courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}

              {/* Load more */}
              {data?.has_more && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Load More'
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <CourseFormDrawer
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
      />
    </Layout>
  );
}
