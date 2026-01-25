import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { MoreHorizontal, Copy, Edit, Trash2, CheckCircle2, Send, ExternalLink, FileText, CalendarIcon } from 'lucide-react';
import { ContentItem, ContentType, ContentStatus } from '@/lib/contentService';
import { toast } from 'sonner';

interface ContentTableProps {
  items: ContentItem[];
  onEdit: (item: ContentItem) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onMarkPublished: (id: string) => void;
  onLogSend: (item: ContentItem) => void;
}

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

export function ContentTable({ items, onEdit, onDuplicate, onDelete, onMarkPublished, onLogSend }: ContentTableProps) {
  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[250px]">Title</TableHead>
            <TableHead className="w-[100px]">Type</TableHead>
            <TableHead className="w-[80px]">Status</TableHead>
            <TableHead className="w-[100px]">Channel</TableHead>
            <TableHead className="w-[100px]">Create Due</TableHead>
            <TableHead className="w-[100px]">Publish Due</TableHead>
            <TableHead className="w-[100px]">Published</TableHead>
            <TableHead className="w-[80px]">Offer</TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-12">
                <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No content yet</p>
                <p className="text-sm text-muted-foreground">Create your first content item to get started</p>
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={item.id} className="group">
                <TableCell>
                  <button
                    onClick={() => onEdit(item)}
                    className="text-left font-medium hover:text-primary transition-colors line-clamp-1"
                  >
                    {item.title}
                  </button>
                  {item.subject_line && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      📧 {item.subject_line}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs ${typeColors[item.type]}`}>
                    {item.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs ${statusColors[item.status]}`}>
                    {item.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {item.channel || '—'}
                  </span>
                </TableCell>
                <TableCell>
                  {item.planned_creation_date ? (
                    <span className="text-sm flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                      {format(parseISO(item.planned_creation_date), 'MMM d')}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {item.planned_publish_date ? (
                    <span className="text-sm flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                      {format(parseISO(item.planned_publish_date), 'MMM d')}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {item.published_at ? format(new Date(item.published_at), 'MMM d') : '—'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground line-clamp-1">
                    {item.offer || '—'}
                  </span>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="h-4 w-4" />
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
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
