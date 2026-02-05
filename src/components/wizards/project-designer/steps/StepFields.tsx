import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { ProjectDesignerData, FieldDefinition, FieldType } from '@/types/projectDesigner';
import { BASE_FIELDS, COMMON_FIELDS } from '@/lib/projectDesignerTemplates';
import { Plus, X, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepFieldsProps {
  data: ProjectDesignerData;
  onChange: (updates: Partial<ProjectDesignerData>) => void;
}

const FIELD_TYPE_OPTIONS: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'url', label: 'URL' },
  { value: 'currency', label: 'Currency' },
  { value: 'select', label: 'Dropdown' },
];

export function StepFields({ data, onChange }: StepFieldsProps) {
  const [showAddField, setShowAddField] = useState(false);
  const [newField, setNewField] = useState<Partial<FieldDefinition>>({
    name: '',
    type: 'text',
    required: false,
    showOnCard: true,
    options: [],
  });
  const [optionsInput, setOptionsInput] = useState('');

  const isFieldSelected = (key: string) => {
    return data.fields.some(f => f.key === key);
  };

  const toggleField = (field: FieldDefinition) => {
    if (field.key === 'name') return; // Name is always required
    
    if (isFieldSelected(field.key)) {
      onChange({
        fields: data.fields.filter(f => f.key !== field.key),
      });
    } else {
      onChange({
        fields: [...data.fields, field],
      });
    }
  };

  const toggleShowOnCard = (key: string) => {
    onChange({
      fields: data.fields.map(f => 
        f.key === key ? { ...f, showOnCard: !f.showOnCard } : f
      ),
    });
  };

  const removeField = (key: string) => {
    if (key === 'name') return;
    onChange({
      fields: data.fields.filter(f => f.key !== key),
    });
  };

  const addCustomField = () => {
    if (!newField.name?.trim()) return;

    const key = newField.name.toLowerCase().replace(/\s+/g, '_');
    const field: FieldDefinition = {
      id: String(Date.now()),
      key,
      name: newField.name,
      type: newField.type || 'text',
      required: newField.required || false,
      showOnCard: newField.showOnCard ?? true,
      options: newField.type === 'select' ? optionsInput.split(',').map(s => s.trim()).filter(Boolean) : undefined,
    };

    onChange({
      fields: [...data.fields, field],
    });

    setNewField({ name: '', type: 'text', required: false, showOnCard: true, options: [] });
    setOptionsInput('');
    setShowAddField(false);
  };

  // All available fields (base + common + use-case suggested)
  const availableFields = [...BASE_FIELDS, ...COMMON_FIELDS];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-2">What Information Do You Need?</h2>
        <p className="text-muted-foreground">
          Choose what data to track for each item. Selected fields will appear in forms and can be shown on cards.
        </p>
      </div>

      {/* Base Fields */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Essential Fields</Label>
        <div className="space-y-2">
          {BASE_FIELDS.map(field => (
            <div
              key={field.key}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg border',
                isFieldSelected(field.key) ? 'bg-primary/5 border-primary/30' : 'bg-muted/30'
              )}
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={isFieldSelected(field.key)}
                  onCheckedChange={() => toggleField(field)}
                  disabled={field.key === 'name'}
                />
                <div>
                  <p className="font-medium text-sm">{field.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{field.type}</p>
                </div>
              </div>
              {isFieldSelected(field.key) && field.key !== 'name' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => toggleShowOnCard(field.key)}
                >
                  {data.fields.find(f => f.key === field.key)?.showOnCard ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Use-case suggested fields (shown first if present) */}
      {data.fields.filter(f => !BASE_FIELDS.some(b => b.key === f.key) && !COMMON_FIELDS.some(c => c.key === f.key)).length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Suggested for Your Workflow</Label>
          <div className="space-y-2">
            {data.fields
              .filter(f => !BASE_FIELDS.some(b => b.key === f.key) && !COMMON_FIELDS.some(c => c.key === f.key))
              .map(field => (
                <div
                  key={field.key}
                  className="flex items-center justify-between p-3 rounded-lg border bg-primary/5 border-primary/30"
                >
                  <div className="flex items-center gap-3">
                    <Checkbox checked disabled />
                    <div>
                      <p className="font-medium text-sm">{field.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {field.type}
                        {field.options && ` (${field.options.join(', ')})`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleShowOnCard(field.key)}
                    >
                      {field.showOnCard ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeField(field.key)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Common fields */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Additional Fields</Label>
        <div className="space-y-2">
          {COMMON_FIELDS.map(field => (
            <div
              key={field.key}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg border',
                isFieldSelected(field.key) ? 'bg-primary/5 border-primary/30' : 'bg-muted/30'
              )}
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={isFieldSelected(field.key)}
                  onCheckedChange={() => toggleField(field)}
                />
                <div>
                  <p className="font-medium text-sm">{field.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{field.type}</p>
                </div>
              </div>
              {isFieldSelected(field.key) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => toggleShowOnCard(field.key)}
                >
                  {data.fields.find(f => f.key === field.key)?.showOnCard ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add Custom Field */}
      {showAddField ? (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="font-medium">Add Custom Field</Label>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowAddField(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Field Name</Label>
                <Input
                  placeholder="e.g., Budget"
                  value={newField.name}
                  onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Field Type</Label>
                <Select
                  value={newField.type}
                  onValueChange={(v) => setNewField({ ...newField, type: v as FieldType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {newField.type === 'select' && (
              <div className="space-y-2">
                <Label>Options (comma-separated)</Label>
                <Input
                  placeholder="Option 1, Option 2, Option 3"
                  value={optionsInput}
                  onChange={(e) => setOptionsInput(e.target.value)}
                />
              </div>
            )}

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={newField.showOnCard}
                  onCheckedChange={(c) => setNewField({ ...newField, showOnCard: !!c })}
                />
                Show on card
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={newField.required}
                  onCheckedChange={(c) => setNewField({ ...newField, required: !!c })}
                />
                Required
              </label>
            </div>

            <Button onClick={addCustomField} disabled={!newField.name?.trim()}>
              Add Field
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowAddField(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Custom Field
        </Button>
      )}

      <p className="text-xs text-muted-foreground text-center">
        <Eye className="h-3 w-3 inline mr-1" /> = shown on card preview
      </p>
    </div>
  );
}
