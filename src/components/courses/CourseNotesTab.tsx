import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { FileText, Plus, ExternalLink, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCourseNotes } from '@/hooks/useCourseNotes';

interface CourseNotesTabProps {
  courseId: string;
  courseName: string;
}

const getPreview = (content: string, maxLength: number = 150): string => {
  if (!content) return '';
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength) + '...';
};

export function CourseNotesTab({ courseId, courseName }: CourseNotesTabProps) {
  const { data, isLoading } = useCourseNotes(courseId);
  const notes = data?.pages || [];

  if (isLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Loading notes...
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">No notes for this course yet</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Create a note linked to this course to capture key learnings
          </p>
          <Button asChild>
            <Link to={`/notes?newPage=true&courseId=${courseId}&courseName=${encodeURIComponent(courseName)}`}>
              <Plus className="h-4 w-4 mr-2" />
              Add Note
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">
          {notes.length} note{notes.length !== 1 ? 's' : ''}
        </h3>
        <Button asChild>
          <Link to={`/notes?newPage=true&courseId=${courseId}&courseName=${encodeURIComponent(courseName)}`}>
            <Plus className="h-4 w-4 mr-2" />
            Add Note
          </Link>
        </Button>
      </div>

      <div className="space-y-2">
        {notes.map((note) => (
          <Card key={note.id} className="hover:shadow-md transition-shadow">
            <CardContent className="py-4">
              <Link 
                to={`/notes?page=${note.id}`}
                className="block"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <h4 className="font-medium truncate">{note.title}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {getPreview(note.content, 120)}
                    </p>
                    {Array.isArray(note.tags) && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {note.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {note.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{note.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Updated {format(parseISO(note.updated_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center">
        <Button variant="outline" asChild>
          <Link to={`/notes?courseFilter=${courseId}`}>
            <BookOpen className="h-4 w-4 mr-2" />
            View All in Notes
          </Link>
        </Button>
      </div>
    </div>
  );
}
