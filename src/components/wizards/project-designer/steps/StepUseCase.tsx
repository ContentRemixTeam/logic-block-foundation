import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ProjectDesignerData, USE_CASE_OPTIONS, UseCaseType } from '@/types/projectDesigner';
import { Users, FileText, Package, Calendar, Briefcase, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepUseCaseProps {
  data: ProjectDesignerData;
  onChange: (updates: Partial<ProjectDesignerData>) => void;
  onUseCaseSelect: (useCase: UseCaseType) => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Users: <Users className="h-6 w-6" />,
  FileText: <FileText className="h-6 w-6" />,
  Package: <Package className="h-6 w-6" />,
  Calendar: <Calendar className="h-6 w-6" />,
  Briefcase: <Briefcase className="h-6 w-6" />,
  Wand2: <Wand2 className="h-6 w-6" />,
};

export function StepUseCase({ data, onChange, onUseCaseSelect }: StepUseCaseProps) {
  const handleSelect = (useCase: UseCaseType) => {
    onChange({ useCase });
    onUseCaseSelect(useCase);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-2">What would you like to track?</h2>
        <p className="text-muted-foreground">
          Choose the type of work you want to manage. We'll suggest the best workflow for you.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {USE_CASE_OPTIONS.map(option => (
          <Card
            key={option.value}
            className={cn(
              'cursor-pointer transition-all hover:border-primary/50',
              data.useCase === option.value && 'border-primary ring-2 ring-primary/20'
            )}
            onClick={() => handleSelect(option.value)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={cn(
                  'p-2 rounded-lg shrink-0',
                  data.useCase === option.value 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                )}>
                  {ICON_MAP[option.icon]}
                </div>
                <div>
                  <p className="font-medium">{option.label}</p>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {data.useCase === 'custom' && (
        <div className="space-y-2">
          <Label htmlFor="custom-description">Describe your workflow (optional)</Label>
          <Textarea
            id="custom-description"
            placeholder="e.g., I want to track podcast episode production from concept to publishing..."
            value={data.customDescription}
            onChange={(e) => onChange({ customDescription: e.target.value })}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            This helps us suggest relevant columns and fields.
          </p>
        </div>
      )}
    </div>
  );
}
