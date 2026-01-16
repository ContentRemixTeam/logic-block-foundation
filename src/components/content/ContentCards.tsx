import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Copy, Edit, Trash2, CheckCircle2, Send, ExternalLink, Mail, FileText } from 'lucide-react';
import { ContentItem, ContentType, ContentStatus } from '@/lib/contentService';
import { toast } from 'sonner';

interface ContentCardsProps {
  items: ContentItem[];
  onEdit: (item: ContentItem) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onMarkPublished: (id: string) => void;
  onLogSend: (item: ContentItem) => void;
}

const typeIcons: Partial<Record<ContentType, React.ReactNode>> = {
  'Newsletter': <Mail className="h-4 w-4" />,
  'Blog Article': <FileText className="h-4 w-4" />,
};

const typeColors: Record<ContentType, string> = {
  'Newsletter': 'bg-info/10 text-info border-info/20',
  'Post': 'bg-primary/10 text-primary border-primary/20',
  'Reel/Short': 'bg-status-waiting/10 text-status-waiting border-status-waiting/20',
  'Video': 'bg-destructive/10 text-destructive border-destructive/20',
  'Carousel': 'bg-status-waiting/10 text-status-waiting border-status-waiting/20',
  'Story': 'bg-warning/10 text-warning border-warning/20',
  'Live Session': 'bg-warning/10 text-warning border-warning/20',
  'Podcast Episode': 'bg-success/10 text-success border-success/20',
  'Blog Article': 'bg-info/10 text-info border-info/20',
  'Webinar': 'bg-status-scheduled/10 text-status-scheduled border-status-scheduled/20',
  'Challenge': 'bg-primary/10 text-primary border-primary/20',
  'DM/Message': 'bg-info/10 text-info border-info/20',
  'Ad': 'bg-info/10 text-info border-info/20',
  'Landing Page': 'bg-status-scheduled/10 text-status-scheduled border-status-scheduled/20',
  'Other': 'bg-muted text-muted-foreground',
};

const statusColors: Record<ContentStatus, string> = {
  'Draft': 'bg-muted text-muted-foreground',
  'Ready': 'bg-warning/10 text-warning border-warning/20',
  'Published': 'bg-success/10 text-success border-success/20',
};

export function ContentCards({ items, onEdit, onDuplicate, onDelete, onMarkPublished, onLogSend }: ContentCardsProps) {
  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => (
        <Card key={item.id} className="group hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant="outline" className={`text-xs shrink-0 ${typeColors[item.type]}`}>
                  {typeIcons[item.type]}
                  <span className="ml-1">{item.type}</span>
                </Badge>
                <Badge variant="outline" className={`text-xs shrink-0 ${statusColors[item.status]}`}>
                  {item.status}
                </Badge>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => onEdit(item)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDuplicate(item.id)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  {item.body && (
                    <DropdownMenuItem onClick={() => copyToClipboard(item.body!)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Body
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {item.status !== 'Published' && (
                    <DropdownMenuItem onClick={() => onMarkPublished(item.id)}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Mark Published
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onLogSend(item)}>
                    <Send className="h-4 w-4 mr-2" />
                    Log Send
                  </DropdownMenuItem>
                  {item.link_url && (
                    <DropdownMenuItem asChild>
                      <a href={item.link_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open Link
                      </a>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => onDelete(item.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Title */}
            <button
              onClick={() => onEdit(item)}
              className="text-left w-full"
            >
              <h3 className="font-semibold text-foreground hover:text-primary transition-colors line-clamp-2 mb-2">
                {item.title}
              </h3>
            </button>

            {/* Subject line for emails */}
            {item.type === 'Newsletter' && item.subject_line && (
              <div className="mb-2 p-2 rounded bg-muted/50">
                <p className="text-xs text-muted-foreground mb-0.5">Subject:</p>
                <p className="text-sm font-medium line-clamp-1">{item.subject_line}</p>
              </div>
            )}

            {/* Body preview */}
            {item.body && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {item.body}
              </p>
            )}

            {/* Meta row */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
              {item.channel && <span>{item.channel}</span>}
              {item.channel && item.topic && <span>•</span>}
              {item.topic && <span className="line-clamp-1">{item.topic}</span>}
            </div>

            {/* Tags */}
            {item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {item.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {item.tags.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{item.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
              <span>
                {item.published_at 
                  ? `Published ${format(new Date(item.published_at), 'MMM d')}`
                  : `Updated ${format(new Date(item.updated_at), 'MMM d')}`
                }
              </span>
              {item.offer && (
                <span className="text-primary font-medium">💰 {item.offer}</span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
