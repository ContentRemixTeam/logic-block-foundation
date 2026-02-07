import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useGenerations, useDeleteGeneration } from '@/hooks/useAICopywriting';
import { AICopyGeneration, CONTENT_TYPE_OPTIONS, ContentType } from '@/types/aiCopywriting';
import { AddToCalendarModal } from './AddToCalendarModal';
import { 
  FileText, 
  Search, 
  Trash2, 
  Copy, 
  Star,
  Loader2,
  CheckCircle2,
  Sparkles,
  CalendarPlus
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

type DateFilter = 'all' | '7days' | '30days';
type RatingFilter = 'all' | '8+' | '9+';

export function CopyLibrary() {
  const navigate = useNavigate();
  const { data: generations, isLoading } = useGenerations(100);
  const deleteGeneration = useDeleteGeneration();

  const [searchQuery, setSearchQuery] = useState('');
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');
  const [selectedGeneration, setSelectedGeneration] = useState<AICopyGeneration | null>(null);
  const [copied, setCopied] = useState(false);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);

  // Apply filters
  const filteredGenerations = generations?.filter((gen) => {
    // Content type filter
    if (contentTypeFilter !== 'all' && gen.content_type !== contentTypeFilter) {
      return false;
    }

    // Date filter
    if (dateFilter !== 'all') {
      const genDate = new Date(gen.created_at);
      const now = new Date();
      const daysAgo = dateFilter === '7days' ? 7 : 30;
      const cutoff = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      if (genDate < cutoff) return false;
    }

    // Rating filter
    if (ratingFilter !== 'all') {
      const minRating = ratingFilter === '8+' ? 8 : 9;
      if (!gen.user_rating || gen.user_rating < minRating) return false;
    }

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return gen.generated_copy.toLowerCase().includes(query);
    }

    return true;
  }) || [];

  const getContentTypeLabel = (type: string) => {
    return CONTENT_TYPE_OPTIONS.find(o => o.value === type)?.label || type;
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async (id: string) => {
    await deleteGeneration.mutateAsync(id);
    setSelectedGeneration(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!generations || generations.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No generated copy yet</h3>
            <p className="text-muted-foreground mb-4">
              Start generating copy to build your library
            </p>
            <Button onClick={() => navigate('/ai-copywriting/generate')}>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Your First Copy
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search copy..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={contentTypeFilter} onValueChange={setContentTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Content Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {CONTENT_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7days">Last 7 days</SelectItem>
                <SelectItem value="30days">Last 30 days</SelectItem>
              </SelectContent>
            </Select>

            <Select value={ratingFilter} onValueChange={(v) => setRatingFilter(v as RatingFilter)}>
              <SelectTrigger className="w-full sm:w-[120px]">
                <SelectValue placeholder="Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="8+">8+ Only</SelectItem>
                <SelectItem value="9+">9+ Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-3">
        {filteredGenerations.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No results match your filters
            </CardContent>
          </Card>
        ) : (
          filteredGenerations.map((gen) => (
            <Card 
              key={gen.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setSelectedGeneration(gen as AICopyGeneration)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary">
                        {getContentTypeLabel(gen.content_type)}
                      </Badge>
                      {gen.user_rating && (
                        <Badge variant="outline" className="gap-1">
                          <Star className="h-3 w-3" />
                          {gen.user_rating}/10
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {gen.generated_copy.slice(0, 150)}...
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(gen.created_at), { addSuffix: true })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog 
        open={!!selectedGeneration} 
        onOpenChange={(open) => !open && setSelectedGeneration(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedGeneration && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <DialogTitle>
                    {getContentTypeLabel(selectedGeneration.content_type)}
                  </DialogTitle>
                  {selectedGeneration.user_rating && (
                    <Badge variant="outline" className="gap-1">
                      <Star className="h-3 w-3" />
                      {selectedGeneration.user_rating}/10
                    </Badge>
                  )}
                </div>
                <DialogDescription>
                  Generated {format(new Date(selectedGeneration.created_at), 'PPpp')}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Copy */}
                <div className="bg-muted/50 rounded-lg p-4 whitespace-pre-wrap text-sm max-h-[400px] overflow-y-auto">
                  {selectedGeneration.generated_copy}
                </div>

                {/* Metadata */}
                {selectedGeneration.tokens_used && (
                  <p className="text-xs text-muted-foreground">
                    {selectedGeneration.tokens_used} tokens • 
                    {selectedGeneration.generation_time_ms && 
                      ` ${Math.round(selectedGeneration.generation_time_ms / 1000)}s generation time`}
                  </p>
                )}

                {/* Feedback */}
                {(selectedGeneration.feedback_text || selectedGeneration.feedback_tags?.length > 0) && (
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-2">Feedback</p>
                    {selectedGeneration.feedback_tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {selectedGeneration.feedback_tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {selectedGeneration.feedback_text && (
                      <p className="text-sm text-muted-foreground">
                        {selectedGeneration.feedback_text}
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t flex-wrap">
                  <Button 
                    onClick={() => handleCopy(selectedGeneration.generated_copy)}
                    className="flex-1"
                  >
                    {copied ? (
                      <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 mr-2" />
                    )}
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>

                  <Button 
                    variant="outline"
                    onClick={() => setCalendarModalOpen(true)}
                    className="flex-1"
                  >
                    <CalendarPlus className="h-4 w-4 mr-2" />
                    Add to Calendar
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this generation?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDelete(selectedGeneration.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add to Calendar Modal */}
      {selectedGeneration && (
        <AddToCalendarModal
          open={calendarModalOpen}
          onOpenChange={setCalendarModalOpen}
          generatedCopy={selectedGeneration.generated_copy}
          contentType={selectedGeneration.content_type as ContentType}
          generationId={selectedGeneration.id}
          onSuccess={() => setSelectedGeneration(null)}
        />
      )}
    </div>
  );
}
