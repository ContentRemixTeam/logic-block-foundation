import { useState } from 'react';
import { CustomField, useCustomFieldMutations } from '@/hooks/useProjectCustomFields';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, Plus, GripVertical, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomFieldManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  fields: CustomField[];
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Select (Dropdown)' },
  { value: 'date', label: 'Date' },
  { value: 'checkbox', label: 'Checkbox' },
];

export function CustomFieldManager({ open, onOpenChange, projectId, fields }: CustomFieldManagerProps) {
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<string>('text');
  const [newFieldOptions, setNewFieldOptions] = useState<string[]>([]);
  const [optionInput, setOptionInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const { createField, deleteField, updateField } = useCustomFieldMutations(projectId);

  const handleCreateField = async () => {
    if (!newFieldName.trim()) return;

    await createField.mutateAsync({
      field_name: newFieldName.trim(),
      field_type: newFieldType,
      field_options: newFieldType === 'select' ? newFieldOptions : [],
    });

    setNewFieldName('');
    setNewFieldType('text');
    setNewFieldOptions([]);
    setIsCreating(false);
  };

  const handleAddOption = () => {
    if (optionInput.trim() && !newFieldOptions.includes(optionInput.trim())) {
      setNewFieldOptions([...newFieldOptions, optionInput.trim()]);
      setOptionInput('');
    }
  };

  const handleRemoveOption = (option: string) => {
    setNewFieldOptions(newFieldOptions.filter(o => o !== option));
  };

  const handleDeleteField = async (fieldId: string) => {
    if (confirm('Are you sure you want to delete this field? All values will be lost.')) {
      await deleteField.mutateAsync(fieldId);
    }
  };

  const handleToggleVisibility = async (field: CustomField) => {
    await updateField.mutateAsync({
      fieldId: field.id,
      updates: { is_visible: !field.is_visible },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Custom Fields</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing fields */}
          {fields.length > 0 && (
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase">Existing Fields</Label>
              {fields.map(field => (
                <div
                  key={field.id}
                  className="flex items-center gap-3 p-2 rounded-lg border bg-muted/30"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{field.field_name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{field.field_type}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleVisibility(field)}
                  >
                    {field.is_visible ? 'Hide' : 'Show'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteField(field.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Create new field */}
          {isCreating ? (
            <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
              <div className="space-y-2">
                <Label>Field Name</Label>
                <Input
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  placeholder="e.g., Client Name, Budget, Approval Status"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label>Field Type</Label>
                <Select value={newFieldType} onValueChange={setNewFieldType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {newFieldType === 'select' && (
                <div className="space-y-2">
                  <Label>Options</Label>
                  <div className="flex gap-2">
                    <Input
                      value={optionInput}
                      onChange={(e) => setOptionInput(e.target.value)}
                      placeholder="Add option..."
                      onKeyDown={(e) => e.key === 'Enter' && handleAddOption()}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={handleAddOption}>
                      Add
                    </Button>
                  </div>
                  {newFieldOptions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {newFieldOptions.map(option => (
                        <div
                          key={option}
                          className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded text-sm"
                        >
                          {option}
                          <button onClick={() => handleRemoveOption(option)}>
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button onClick={handleCreateField} disabled={!newFieldName.trim()}>
                  Create Field
                </Button>
                <Button variant="ghost" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsCreating(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Custom Field
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
