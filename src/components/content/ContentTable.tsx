import { useState } from 'react';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { MoreHorizontal, Copy, Edit, Trash2, CheckCircle2, Send, ExternalLink, FileText } from 'lucide-react';
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
  'Newsletter': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'Post': 'bg-pink-500/10 text-pink-600 border-pink-500/20',
  'Reel/Short': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  'Video': 'bg-red-500/10 text-red-600 border-red-500/20',
  'Carousel': 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  'Story': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  'Live Session': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  'Podcast Episode': 'bg-green-500/10 text-green-600 border-green-500/20',
  'Blog Article': 'bg-teal-500/10 text-teal-600 border-teal-500/20',
  'Webinar': 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  'Challenge': 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  'DM/Message': 'bg-sky-500/10 text-sky-600 border-sky-500/20',
  'Ad': 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  'Landing Page': 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  'Other': 'bg-gray-500/10 text-gray-600 border-gray-500/20',
};

const statusColors: Record<ContentStatus, string> = {
  'Draft': 'bg-muted text-muted-foreground',
  'Ready': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  'Published': 'bg-green-500/10 text-green-600 border-green-500/20',
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
            <TableHead className="w-[300px]">Title</TableHead>
            <TableHead className="w-[100px]">Type</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead className="w-[100px]">Channel</TableHead>
            <TableHead className="w-[120px]">Topic</TableHead>
            <TableHead className="w-[150px]">Tags</TableHead>
            <TableHead className="w-[120px]">Published</TableHead>
            <TableHead className="w-[100px]">Offer</TableHead>
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
                  <span className="text-sm text-muted-foreground line-clamp-1">
                    {item.topic || '—'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {item.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {item.tags.length > 2 && (
                      <Badge variant="secondary" className="text-xs">
                        +{item.tags.length - 2}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {item.published_at ? format(new Date(item.published_at), 'MMM d, yyyy') : '—'}
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
