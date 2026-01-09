import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Copy, Mail, Search, Loader2 } from 'lucide-react';
import { ContentItem, getContentItems } from '@/lib/contentService';
import { toast } from 'sonner';

interface SubjectLineLibraryProps {
  onDuplicate: (id: string) => void;
}

export function SubjectLineLibrary({ onDuplicate }: SubjectLineLibraryProps) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await getContentItems({ types: ['Email'] });
      // Filter to only show emails with subject lines
      setItems(data.filter(item => item.subject_line?.trim()));
    } catch (error) {
      console.error('Error loading emails:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const filteredItems = items.filter(item => {
    const searchLower = search.toLowerCase();
    return (
      item.subject_line?.toLowerCase().includes(searchLower) ||
      item.preview_text?.toLowerCase().includes(searchLower) ||
      item.topic?.toLowerCase().includes(searchLower) ||
      item.title.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search subject lines..."
          className="pl-10"
        />
      </div>

      {/* Results */}
      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No email subject lines found</p>
            <p className="text-sm">Create an Email content item with a subject line to see it here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <Card key={item.id} className="group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Subject Line */}
                    <div className="flex items-center gap-2 mb-2">
                      <Mail className="h-4 w-4 text-blue-500 shrink-0" />
                      <p className="font-medium text-foreground">{item.subject_line}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => copyToClipboard(item.subject_line!, 'Subject')}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Preview Text */}
                    {item.preview_text && (
                      <div className="flex items-center gap-2 mb-2 pl-6">
                        <p className="text-sm text-muted-foreground">{item.preview_text}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => copyToClipboard(item.preview_text!, 'Preview')}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    )}

                    {/* Meta */}
                    <div className="flex items-center gap-2 pl-6">
                      {item.topic && (
                        <Badge variant="secondary" className="text-xs">
                          {item.topic}
                        </Badge>
                      )}
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          item.status === 'Published' 
                            ? 'bg-green-500/10 text-green-600 border-green-500/20'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {item.status}
                      </Badge>
                      {item.published_at && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(item.published_at), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => onDuplicate(item.id)}
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    Duplicate
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Your saved email subject lines from the Content Vault. Click to copy or duplicate.
      </p>
    </div>
  );
}
