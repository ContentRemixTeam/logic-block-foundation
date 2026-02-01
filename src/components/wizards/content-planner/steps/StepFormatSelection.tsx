import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ContentPlannerData, ContentFormat } from '@/types/contentPlanner';
import { FORMAT_METADATA, getCategories, getCategoryLabel, getCategoryIcon, formatDuration, calculateTotalTime } from '../utils/formatHelpers';
import { cn } from '@/lib/utils';
import * as LucideIcons from 'lucide-react';

interface StepFormatSelectionProps {
  data: ContentPlannerData;
  onChange: (updates: Partial<ContentPlannerData>) => void;
}

export function StepFormatSelection({ data, onChange }: StepFormatSelectionProps) {
  const categories = getCategories();
  
  const toggleFormat = (format: ContentFormat) => {
    const current = data.selectedFormats || [];
    const updated = current.includes(format)
      ? current.filter(f => f !== format)
      : [...current, format];
    onChange({ selectedFormats: updated });
  };

  const selectCategory = (category: string) => {
    const formatsInCategory = FORMAT_METADATA
      .filter(f => f.category === category)
      .map(f => f.id);
    
    const allSelected = formatsInCategory.every(f => data.selectedFormats.includes(f));
    
    if (allSelected) {
      // Deselect all in category
      onChange({
        selectedFormats: data.selectedFormats.filter(f => !formatsInCategory.includes(f)),
      });
    } else {
      // Select all in category
      const newFormats = [...new Set([...data.selectedFormats, ...formatsInCategory])];
      onChange({ selectedFormats: newFormats });
    }
  };

  const getIcon = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon ? <Icon className="h-4 w-4" /> : null;
  };

  const totalTime = calculateTotalTime(data.selectedFormats);

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Which content formats will you use?</h2>
        <p className="text-muted-foreground">
          Select the types of content you want to create
        </p>
      </div>

      {/* Summary Badge */}
      {data.selectedFormats.length > 0 && (
        <div className="flex items-center justify-center gap-4 p-4 bg-muted/50 rounded-lg">
          <Badge variant="secondary" className="text-sm">
            {data.selectedFormats.length} formats selected
          </Badge>
          <Badge variant="outline" className="text-sm">
            Est. {formatDuration(totalTime)} total
          </Badge>
        </div>
      )}

      {/* Categories */}
      <div className="space-y-6">
        {categories.map((category) => {
          const formatsInCategory = FORMAT_METADATA.filter(f => f.category === category);
          const selectedInCategory = formatsInCategory.filter(f => 
            data.selectedFormats.includes(f.id)
          ).length;

          return (
            <div key={category} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getIcon(getCategoryIcon(category))}
                  <h3 className="font-semibold">{getCategoryLabel(category)}</h3>
                  {selectedInCategory > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {selectedInCategory}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => selectCategory(category)}
                >
                  {selectedInCategory === formatsInCategory.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {formatsInCategory.map((format) => {
                  const isSelected = data.selectedFormats.includes(format.id);
                  
                  return (
                    <Card
                      key={format.id}
                      className={cn(
                        "cursor-pointer transition-all hover:border-primary/50",
                        isSelected && "border-primary bg-primary/5"
                      )}
                      onClick={() => toggleFormat(format.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "p-2 rounded-lg shrink-0",
                            isSelected 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-muted"
                          )}>
                            {getIcon(format.icon)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium truncate">{format.label}</p>
                              <Checkbox checked={isSelected} className="shrink-0" />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {format.description}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              ~{formatDuration(format.estimatedMinutes)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
