import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Archive as ArchiveIcon } from 'lucide-react';
import { CleanUpDialog } from '@/components/fresh-start/CleanUpDialog';

/**
 * Fresh Start settings surface. Two calm entry points:
 * - Clean up (opens the same bulk dialog available on /tasks)
 * - Browse archive
 */
export function FreshStartSettingsCard() {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Fresh start
        </CardTitle>
        <CardDescription>
          Life happens — your planner resets in one tap. Nothing is lost;
          everything can be restored from the archive.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row gap-2">
        <Button
          variant="secondary"
          onClick={() => setOpen(true)}
          className="min-h-11 flex-1"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Clean up
        </Button>
        <Button asChild variant="outline" className="min-h-11 flex-1">
          <Link to="/tasks/archive">
            <ArchiveIcon className="h-4 w-4 mr-2" />
            Browse archive
          </Link>
        </Button>
      </CardContent>
      <CleanUpDialog open={open} onOpenChange={setOpen} />
    </Card>
  );
}
