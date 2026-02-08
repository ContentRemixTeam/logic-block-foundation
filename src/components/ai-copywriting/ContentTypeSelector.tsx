import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CONTENT_TYPES, getContentTypesByCategory, ContentCategory, CATEGORY_LABELS } from '@/types/contentTypes';
import { cn } from '@/lib/utils';

interface ContentTypeSelectorProps {
  value: string;
  onChange: (contentTypeId: string) => void;
}

export function ContentTypeSelector({ value, onChange }: ContentTypeSelectorProps) {
  const categories: ContentCategory[] = ['email', 'social', 'ad', 'sales', 'other'];
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Content Type</CardTitle>
        <CardDescription>
          Select what you want to create
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {categories.map((category) => {
          const types = getContentTypesByCategory(category);
          if (types.length === 0) return null;
          
          return (
            <div key={category} className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                {CATEGORY_LABELS[category]}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {types.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => onChange(type.id)}
                    className={cn(
                      'flex items-start gap-2 p-3 rounded-lg border-2 text-left transition-all',
                      value === type.id
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-muted-foreground/30'
                    )}
                  >
                    <span className="text-lg">{type.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{type.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {type.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
