import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ProjectDesignerData } from '@/types/projectDesigner';
import { LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepSettingsProps {
  data: ProjectDesignerData;
  onChange: (updates: Partial<ProjectDesignerData>) => void;
}

const THEME_COLORS = [
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
];

export function StepSettings({ data, onChange }: StepSettingsProps) {
  const updateSettings = (updates: Partial<ProjectDesignerData['settings']>) => {
    onChange({
      settings: { ...data.settings, ...updates },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-2">Board Settings</h2>
        <p className="text-muted-foreground">
          Customize how your board looks and behaves.
        </p>
      </div>

      {/* Board Name */}
      <div className="space-y-2">
        <Label htmlFor="board-name">Board Name</Label>
        <Input
          id="board-name"
          placeholder="e.g., Client Pipeline"
          value={data.boardName}
          onChange={(e) => onChange({ boardName: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Give your board a descriptive name
        </p>
      </div>

      {/* Default View */}
      <div className="space-y-3">
        <Label>Default View</Label>
        <RadioGroup
          value={data.settings.defaultView}
          onValueChange={(v) => updateSettings({ defaultView: v as 'kanban' | 'list' })}
          className="grid grid-cols-2 gap-4"
        >
          <label
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-lg border cursor-pointer transition-all',
              data.settings.defaultView === 'kanban' && 'border-primary ring-2 ring-primary/20'
            )}
          >
            <RadioGroupItem value="kanban" className="sr-only" />
            <LayoutGrid className="h-8 w-8 text-muted-foreground" />
            <span className="font-medium">Kanban Board</span>
            <span className="text-xs text-muted-foreground text-center">
              Drag cards between columns
            </span>
          </label>
          <label
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-lg border cursor-pointer transition-all',
              data.settings.defaultView === 'list' && 'border-primary ring-2 ring-primary/20'
            )}
          >
            <RadioGroupItem value="list" className="sr-only" />
            <List className="h-8 w-8 text-muted-foreground" />
            <span className="font-medium">List View</span>
            <span className="text-xs text-muted-foreground text-center">
              Sortable table layout
            </span>
          </label>
        </RadioGroup>
      </div>

      {/* Card Display Options */}
      <div className="space-y-3">
        <Label>Card Display</Label>
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={data.settings.showProgressBar}
              onCheckedChange={(c) => updateSettings({ showProgressBar: !!c })}
              className="mt-0.5"
            />
            <div>
              <p className="font-medium text-sm">Show progress bar</p>
              <p className="text-xs text-muted-foreground">Visual indicator of completion status</p>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={data.settings.showDueDate}
              onCheckedChange={(c) => updateSettings({ showDueDate: !!c })}
              className="mt-0.5"
            />
            <div>
              <p className="font-medium text-sm">Show due date</p>
              <p className="text-xs text-muted-foreground">Display deadlines on cards</p>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={data.settings.showRevenue}
              onCheckedChange={(c) => updateSettings({ showRevenue: !!c })}
              className="mt-0.5"
            />
            <div>
              <p className="font-medium text-sm">Show revenue/value</p>
              <p className="text-xs text-muted-foreground">Display monetary values on cards</p>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={data.settings.compactCards}
              onCheckedChange={(c) => updateSettings({ compactCards: !!c })}
              className="mt-0.5"
            />
            <div>
              <p className="font-medium text-sm">Compact cards</p>
              <p className="text-xs text-muted-foreground">Less padding for denser view</p>
            </div>
          </label>
        </div>
      </div>

      {/* Theme Color */}
      <div className="space-y-3">
        <Label>Theme Color</Label>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="w-10 h-10 rounded-lg border-2 border-background shadow-sm"
                style={{ backgroundColor: data.settings.themeColor }}
              />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="start">
              <div className="grid grid-cols-4 gap-2">
                {THEME_COLORS.map(color => (
                  <button
                    key={color}
                    className={cn(
                      'w-8 h-8 rounded-lg border-2',
                      data.settings.themeColor === color ? 'border-foreground' : 'border-transparent'
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => updateSettings({ themeColor: color })}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <span className="text-sm text-muted-foreground">
            Accent color for headers and highlights
          </span>
        </div>
      </div>

      {/* Save as Template */}
      <div className="pt-4 border-t space-y-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox
            checked={data.saveAsTemplate}
            onCheckedChange={(c) => onChange({ saveAsTemplate: !!c })}
            className="mt-0.5"
          />
          <div>
            <p className="font-medium text-sm">Save as template</p>
            <p className="text-xs text-muted-foreground">
              Reuse this configuration for future boards
            </p>
          </div>
        </label>

        {data.saveAsTemplate && (
          <div className="ml-6 space-y-2">
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              placeholder="e.g., My Lead Pipeline Template"
              value={data.templateName}
              onChange={(e) => onChange({ templateName: e.target.value })}
            />
          </div>
        )}
      </div>
    </div>
  );
}
