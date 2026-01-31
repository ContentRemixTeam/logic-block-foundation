import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  GripVertical,
  CheckSquare,
  Type,
  Hash,
  Star,
  Clock,
  List,
  MessageSquare
} from 'lucide-react';
import { CustomQuestion, CustomQuestionType } from '@/types/dailyPage';
import { toast } from 'sonner';

// Type configuration
const QUESTION_TYPES: { value: CustomQuestionType; label: string; icon: React.ElementType }[] = [
  { value: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { value: 'text', label: 'Text', icon: Type },
  { value: 'number', label: 'Number', icon: Hash },
  { value: 'rating', label: 'Rating', icon: Star },
  { value: 'time', label: 'Time', icon: Clock },
  { value: 'dropdown', label: 'Dropdown', icon: List },
];

// Icon options for question icons
const ICON_OPTIONS = [
  'MessageSquare', 'CheckSquare', 'Star', 'Heart', 'Target', 'Zap',
  'Brain', 'Sparkles', 'Sun', 'Moon', 'Coffee', 'Dumbbell',
  'Book', 'Pencil', 'Clock', 'Calendar', 'TrendingUp', 'Award'
];

interface CustomQuestionBuilderProps {
  customQuestions: CustomQuestion[];
  onQuestionsChange: (questions: CustomQuestion[]) => void;
  onSectionOrderChange?: (addSectionId: string) => void;
  onRemoveSectionFromOrder?: (sectionId: string) => void;
}

// Generate unique section_id
const generateSectionId = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `custom_question_${timestamp}_${random}`;
};

// Empty question template
const createEmptyQuestion = (): Partial<CustomQuestion> => ({
  question: '',
  type: 'text',
  placeholder: '',
  icon: 'MessageSquare',
  isRequired: false,
  showInDashboard: false,
  maxLength: 500,
});

export function CustomQuestionBuilder({
  customQuestions,
  onQuestionsChange,
  onSectionOrderChange,
  onRemoveSectionFromOrder,
}: CustomQuestionBuilderProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<CustomQuestion | null>(null);
  const [questionToDelete, setQuestionToDelete] = useState<CustomQuestion | null>(null);
  const [formData, setFormData] = useState<Partial<CustomQuestion>>(createEmptyQuestion());
  const [dropdownOptions, setDropdownOptions] = useState<string[]>(['']);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (dialogOpen && editingQuestion) {
      setFormData(editingQuestion);
      setDropdownOptions(editingQuestion.options || ['']);
    } else if (dialogOpen) {
      setFormData(createEmptyQuestion());
      setDropdownOptions(['']);
    }
  }, [dialogOpen, editingQuestion]);

  const handleOpenAdd = () => {
    setEditingQuestion(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (question: CustomQuestion) => {
    setEditingQuestion(question);
    setDialogOpen(true);
  };

  const handleOpenDelete = (question: CustomQuestion) => {
    setQuestionToDelete(question);
    setDeleteDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.question?.trim()) {
      toast.error('Question text is required');
      return;
    }

    if (formData.question.length > 200) {
      toast.error('Question must be 200 characters or less');
      return;
    }

    if (formData.type === 'dropdown') {
      const validOptions = dropdownOptions.filter(opt => opt.trim());
      if (validOptions.length < 2) {
        toast.error('Dropdown needs at least 2 options');
        return;
      }
    }

    const now = new Date().toISOString();
    
    if (editingQuestion) {
      // Update existing question
      const updatedQuestions = customQuestions.map(q =>
        q.id === editingQuestion.id
          ? {
              ...q,
              ...formData,
              options: formData.type === 'dropdown' 
                ? dropdownOptions.filter(opt => opt.trim()) 
                : undefined,
            }
          : q
      );
      onQuestionsChange(updatedQuestions);
      toast.success('Question updated');
    } else {
      // Create new question
      const newQuestion: CustomQuestion = {
        id: crypto.randomUUID(),
        section_id: generateSectionId(),
        question: formData.question!,
        type: formData.type || 'text',
        placeholder: formData.placeholder,
        icon: formData.icon,
        isRequired: formData.isRequired,
        showInDashboard: formData.showInDashboard,
        maxLength: formData.type === 'text' ? formData.maxLength : undefined,
        minValue: formData.type === 'number' || formData.type === 'rating' ? formData.minValue : undefined,
        maxValue: formData.type === 'number' || formData.type === 'rating' ? formData.maxValue : undefined,
        minLabel: formData.type === 'rating' ? formData.minLabel : undefined,
        maxLabel: formData.type === 'rating' ? formData.maxLabel : undefined,
        options: formData.type === 'dropdown' 
          ? dropdownOptions.filter(opt => opt.trim()) 
          : undefined,
        createdAt: now,
      };

      onQuestionsChange([...customQuestions, newQuestion]);
      
      // Add to section order
      if (onSectionOrderChange) {
        onSectionOrderChange(newQuestion.section_id);
      }
      
      toast.success('Custom question added');
    }

    setDialogOpen(false);
    setEditingQuestion(null);
    setFormData(createEmptyQuestion());
  };

  const handleDelete = () => {
    if (!questionToDelete) return;

    const updatedQuestions = customQuestions.filter(q => q.id !== questionToDelete.id);
    onQuestionsChange(updatedQuestions);
    
    // Remove from section order
    if (onRemoveSectionFromOrder) {
      onRemoveSectionFromOrder(questionToDelete.section_id);
    }
    
    toast.success('Question deleted');
    setDeleteDialogOpen(false);
    setQuestionToDelete(null);
  };

  const handleAddDropdownOption = () => {
    setDropdownOptions([...dropdownOptions, '']);
  };

  const handleRemoveDropdownOption = (index: number) => {
    if (dropdownOptions.length <= 2) return;
    setDropdownOptions(dropdownOptions.filter((_, i) => i !== index));
  };

  const handleDropdownOptionChange = (index: number, value: string) => {
    const updated = [...dropdownOptions];
    updated[index] = value;
    setDropdownOptions(updated);
  };

  const getTypeIcon = (type: CustomQuestionType) => {
    const config = QUESTION_TYPES.find(t => t.value === type);
    return config?.icon || MessageSquare;
  };

  const getTypeBadgeLabel = (type: CustomQuestionType) => {
    const config = QUESTION_TYPES.find(t => t.value === type);
    return config?.label || type;
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Custom Check-in Questions
              </CardTitle>
              <CardDescription>
                Add your own daily check-ins and tracking questions
              </CardDescription>
            </div>
            <Button onClick={handleOpenAdd} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Question
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {customQuestions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No custom questions yet</p>
              <p className="text-xs mt-1">Add questions to track habits, moods, or daily reflections</p>
            </div>
          ) : (
            <div className="space-y-2">
              {customQuestions.map((question) => {
                const TypeIcon = getTypeIcon(question.type);
                return (
                  <div
                    key={question.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center justify-center w-9 h-9 rounded-md bg-muted shrink-0">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{question.question}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          <TypeIcon className="h-3 w-3 mr-1" />
                          {getTypeBadgeLabel(question.type)}
                        </Badge>
                        {question.isRequired && (
                          <Badge variant="outline" className="text-xs">Required</Badge>
                        )}
                        {question.showInDashboard && (
                          <Badge variant="outline" className="text-xs text-primary">Dashboard</Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => handleOpenEdit(question)}
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive hover:text-destructive"
                        onClick={() => handleOpenDelete(question)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? 'Edit Question' : 'Add Custom Question'}
            </DialogTitle>
            <DialogDescription>
              Create a custom check-in question for your daily page
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Question Text */}
            <div className="space-y-2">
              <Label htmlFor="question">Question Text *</Label>
              <Input
                id="question"
                value={formData.question || ''}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                placeholder="e.g., How are you feeling today?"
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">
                {(formData.question?.length || 0)}/200 characters
              </p>
            </div>

            {/* Question Type */}
            <div className="space-y-2">
              <Label>Question Type</Label>
              <Select
                value={formData.type || 'text'}
                onValueChange={(value: CustomQuestionType) => 
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Icon Picker */}
            <div className="space-y-2">
              <Label>Icon (optional)</Label>
              <Select
                value={formData.icon || 'MessageSquare'}
                onValueChange={(value) => setFormData({ ...formData, icon: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map((iconName) => (
                    <SelectItem key={iconName} value={iconName}>
                      {iconName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Placeholder (for text/number inputs) */}
            {(formData.type === 'text' || formData.type === 'number') && (
              <div className="space-y-2">
                <Label htmlFor="placeholder">Placeholder Text</Label>
                <Input
                  id="placeholder"
                  value={formData.placeholder || ''}
                  onChange={(e) => setFormData({ ...formData, placeholder: e.target.value })}
                  placeholder="e.g., Enter your thoughts..."
                />
              </div>
            )}

            {/* Text-specific: Max Length */}
            {formData.type === 'text' && (
              <div className="space-y-2">
                <Label htmlFor="maxLength">Max Length</Label>
                <Input
                  id="maxLength"
                  type="number"
                  value={formData.maxLength || 500}
                  onChange={(e) => setFormData({ ...formData, maxLength: parseInt(e.target.value) || 500 })}
                  min={1}
                  max={5000}
                />
              </div>
            )}

            {/* Number/Rating: Min/Max Values */}
            {(formData.type === 'number' || formData.type === 'rating') && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="minValue">Min Value</Label>
                  <Input
                    id="minValue"
                    type="number"
                    value={formData.minValue ?? (formData.type === 'rating' ? 1 : 0)}
                    onChange={(e) => setFormData({ ...formData, minValue: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxValue">Max Value</Label>
                  <Input
                    id="maxValue"
                    type="number"
                    value={formData.maxValue ?? (formData.type === 'rating' ? 5 : 100)}
                    onChange={(e) => setFormData({ ...formData, maxValue: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            )}

            {/* Rating: Labels */}
            {formData.type === 'rating' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="minLabel">Min Label</Label>
                  <Input
                    id="minLabel"
                    value={formData.minLabel || ''}
                    onChange={(e) => setFormData({ ...formData, minLabel: e.target.value })}
                    placeholder="e.g., Poor"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxLabel">Max Label</Label>
                  <Input
                    id="maxLabel"
                    value={formData.maxLabel || ''}
                    onChange={(e) => setFormData({ ...formData, maxLabel: e.target.value })}
                    placeholder="e.g., Excellent"
                  />
                </div>
              </div>
            )}

            {/* Dropdown: Options List */}
            {formData.type === 'dropdown' && (
              <div className="space-y-2">
                <Label>Options</Label>
                <div className="space-y-2">
                  {dropdownOptions.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={option}
                        onChange={(e) => handleDropdownOptionChange(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                      />
                      {dropdownOptions.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveDropdownOption(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddDropdownOption}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Option
                  </Button>
                </div>
              </div>
            )}

            {/* Toggles */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="isRequired"
                  checked={formData.isRequired || false}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, isRequired: checked === true })
                  }
                />
                <Label htmlFor="isRequired" className="cursor-pointer">
                  Required question
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="showInDashboard"
                  checked={formData.showInDashboard || false}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, showInDashboard: checked === true })
                  }
                />
                <Label htmlFor="showInDashboard" className="cursor-pointer">
                  Show in dashboard summary
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingQuestion ? 'Save Changes' : 'Add Question'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{questionToDelete?.question}" and remove it from your daily page.
              Any saved responses will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
