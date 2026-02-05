import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProjectDesignerData } from '@/types/projectDesigner';
import { CheckCircle2, LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepReviewProps {
  data: ProjectDesignerData;
}

// Sample data for preview
const SAMPLE_ITEMS = [
  { name: 'Jane Doe', subtitle: 'Coaching consult', value: '$2,500' },
  { name: 'Bob Smith', subtitle: 'Discovery call Tuesday', value: '$3,000' },
  { name: 'Acme Corp', subtitle: 'Proposal pending', value: '$5,000' },
  { name: 'XYZ Inc', subtitle: 'Active client', value: '$4,000' },
];

export function StepReview({ data }: StepReviewProps) {
  const cardFields = data.fields.filter(f => f.showOnCard && f.key !== 'name' && f.key !== 'description');
  const hasRevenue = data.settings.showRevenue && data.fields.some(f => f.type === 'currency');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-2">Review Your Board</h2>
        <p className="text-muted-foreground">
          Here's a preview of how your board will look. Ready to create it?
        </p>
      </div>

      {/* Board Header Preview */}
      <div 
        className="p-4 rounded-lg text-white"
        style={{ backgroundColor: data.settings.themeColor }}
      >
        <h3 className="text-lg font-bold">{data.boardName || 'Untitled Board'}</h3>
        <div className="flex items-center gap-2 mt-1 text-white/80 text-sm">
          {data.settings.defaultView === 'kanban' ? (
            <><LayoutGrid className="h-4 w-4" /> Kanban View</>
          ) : (
            <><List className="h-4 w-4" /> List View</>
          )}
          <span>•</span>
          <span>{data.columns.length} stages</span>
          <span>•</span>
          <span>{data.fields.length} fields</span>
        </div>
      </div>

      {/* Board Preview */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-3 min-w-max">
          {data.columns.map((column, colIdx) => (
            <div key={column.id} className="w-56 shrink-0">
              {/* Column Header */}
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: column.color }}
                />
                <span className="font-medium text-sm">{column.name}</span>
                <Badge variant="secondary" className="ml-auto text-xs">
                  {colIdx === 0 ? 2 : colIdx === 1 ? 1 : colIdx === 2 ? 1 : 0}
                </Badge>
              </div>

              {/* Sample Cards */}
              <div className="space-y-2">
                {SAMPLE_ITEMS.slice(colIdx, colIdx + (colIdx === 0 ? 2 : 1)).map((item, idx) => (
                  <Card 
                    key={idx}
                    className={cn(
                      'transition-shadow',
                      data.settings.compactCards ? 'p-2' : 'p-3'
                    )}
                  >
                    <CardContent className="p-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: column.color }}
                        />
                        <span className={cn(
                          'font-medium truncate',
                          data.settings.compactCards ? 'text-xs' : 'text-sm'
                        )}>
                          {item.name}
                        </span>
                      </div>

                      {!data.settings.compactCards && (
                        <p className="text-xs text-muted-foreground pl-4">
                          {item.subtitle}
                        </p>
                      )}

                      {hasRevenue && (
                        <p className="text-xs font-medium text-primary pl-4">
                          {item.value}
                        </p>
                      )}

                      {data.settings.showProgressBar && (
                        <div className="h-1 bg-muted rounded-full overflow-hidden mt-2">
                          <div 
                            className="h-full rounded-full"
                            style={{ 
                              width: `${(colIdx + 1) * 25}%`,
                              backgroundColor: column.color 
                            }}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="space-y-4 pt-4 border-t">
        <h4 className="font-medium">Configuration Summary</h4>
        
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Workflow Stages</p>
            <div className="flex flex-wrap gap-1">
              {data.columns.map(col => (
                <Badge
                  key={col.id}
                  variant="outline"
                  className="text-xs"
                  style={{ borderColor: col.color, color: col.color }}
                >
                  {col.name}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Fields to Track</p>
            <div className="flex flex-wrap gap-1">
              {data.fields.map(field => (
                <Badge key={field.key} variant="secondary" className="text-xs">
                  {field.name}
                  {field.showOnCard && (
                    <CheckCircle2 className="h-3 w-3 ml-1 text-primary" />
                  )}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Display Options</p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {data.settings.showProgressBar && <span>✓ Progress bar</span>}
            {data.settings.showDueDate && <span>✓ Due dates</span>}
            {data.settings.showRevenue && <span>✓ Revenue display</span>}
            {data.settings.compactCards && <span>✓ Compact mode</span>}
          </div>
        </div>

        {data.saveAsTemplate && (
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-sm">
              <span className="font-medium">Saving as template:</span>{' '}
              {data.templateName || data.boardName || 'Untitled'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
