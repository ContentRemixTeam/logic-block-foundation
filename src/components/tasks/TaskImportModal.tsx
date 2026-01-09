import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, Download, FileText, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TaskImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

interface ParsedTask {
  task_text: string;
  task_description?: string;
  scheduled_date?: string;
  priority?: string;
  is_completed?: boolean;
  estimated_minutes?: number;
  context_tags?: string[];
  error?: string;
}

const COLUMN_MAPPINGS: Record<string, keyof ParsedTask> = {
  // Task name variations
  'task': 'task_text',
  'title': 'task_text',
  'name': 'task_text',
  'task name': 'task_text',
  'task_name': 'task_text',
  'content': 'task_text',
  'subject': 'task_text',
  'todo': 'task_text',
  // Description variations
  'description': 'task_description',
  'notes': 'task_description',
  'details': 'task_description',
  'task_description': 'task_description',
  // Date variations
  'due date': 'scheduled_date',
  'due_date': 'scheduled_date',
  'date': 'scheduled_date',
  'scheduled_date': 'scheduled_date',
  'deadline': 'scheduled_date',
  'due': 'scheduled_date',
  // Priority variations
  'priority': 'priority',
  'importance': 'priority',
  'urgency': 'priority',
  // Status variations
  'status': 'is_completed',
  'completed': 'is_completed',
  'done': 'is_completed',
  'is_completed': 'is_completed',
  'complete': 'is_completed',
  // Duration variations
  'estimated_minutes': 'estimated_minutes',
  'duration': 'estimated_minutes',
  'time': 'estimated_minutes',
  'estimate': 'estimated_minutes',
  'minutes': 'estimated_minutes',
  // Tags variations
  'tags': 'context_tags',
  'labels': 'context_tags',
  'context_tags': 'context_tags',
  'categories': 'context_tags',
};

const PRIORITY_MAPPINGS: Record<string, string> = {
  'high': 'high',
  'p1': 'high',
  '1': 'high',
  'urgent': 'high',
  'critical': 'high',
  'medium': 'medium',
  'p2': 'medium',
  '2': 'medium',
  'normal': 'medium',
  'low': 'low',
  'p3': 'low',
  '3': 'low',
  'p4': 'low',
  '4': 'low',
};

const COMPLETED_VALUES = ['true', 'yes', '1', 'done', 'completed', 'complete', 'x', '✓', '✔'];

export function TaskImportModal({ open, onOpenChange, onImportComplete }: TaskImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const resetState = useCallback(() => {
    setFile(null);
    setParsedTasks([]);
    setErrors([]);
    setIsLoading(false);
    setIsParsing(false);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onOpenChange(false);
  }, [resetState, onOpenChange]);

  const parseCSV = (text: string): string[][] => {
    const lines: string[][] = [];
    let currentLine: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (inQuotes) {
        if (char === '"' && nextChar === '"') {
          currentField += '"';
          i++;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          currentField += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          currentLine.push(currentField.trim());
          currentField = '';
        } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
          currentLine.push(currentField.trim());
          if (currentLine.some(field => field !== '')) {
            lines.push(currentLine);
          }
          currentLine = [];
          currentField = '';
          if (char === '\r') i++;
        } else if (char !== '\r') {
          currentField += char;
        }
      }
    }

    if (currentField || currentLine.length > 0) {
      currentLine.push(currentField.trim());
      if (currentLine.some(field => field !== '')) {
        lines.push(currentLine);
      }
    }

    return lines;
  };

  const parseDate = (dateStr: string): string | undefined => {
    if (!dateStr) return undefined;
    
    // Try various date formats
    const formats = [
      /^(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
      /^(\d{2})\/(\d{2})\/(\d{4})/, // MM/DD/YYYY
      /^(\d{2})-(\d{2})-(\d{4})/, // MM-DD-YYYY
      /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/, // M/D/YY or M/D/YYYY
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        try {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
          }
        } catch {
          continue;
        }
      }
    }

    // Try native Date parsing as fallback
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch {
      return undefined;
    }

    return undefined;
  };

  const parseDuration = (value: string): number | undefined => {
    if (!value) return undefined;
    
    const numMatch = value.match(/(\d+)/);
    if (numMatch) {
      const num = parseInt(numMatch[1]);
      if (value.toLowerCase().includes('h')) {
        return num * 60;
      }
      return num;
    }
    return undefined;
  };

  const parseTags = (value: string): string[] | undefined => {
    if (!value) return undefined;
    return value.split(/[,;|]/).map(t => t.trim()).filter(t => t);
  };

  const handleFileUpload = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setIsParsing(true);
    setErrors([]);

    try {
      const text = await uploadedFile.text();
      const rows = parseCSV(text);

      if (rows.length < 2) {
        setErrors(['CSV file must have a header row and at least one data row']);
        setIsParsing(false);
        return;
      }

      const headers = rows[0].map(h => h.toLowerCase().trim());
      const columnMap: Record<number, keyof ParsedTask> = {};

      // Map columns
      headers.forEach((header, index) => {
        const mappedField = COLUMN_MAPPINGS[header];
        if (mappedField) {
          columnMap[index] = mappedField;
        }
      });

      // Check for required task column
      const hasTaskColumn = Object.values(columnMap).includes('task_text');
      if (!hasTaskColumn) {
        setErrors(['CSV must have a task/title/name column. Found columns: ' + headers.join(', ')]);
        setIsParsing(false);
        return;
      }

      const tasks: ParsedTask[] = [];
      const parseErrors: string[] = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const task: ParsedTask = { task_text: '' };

        Object.entries(columnMap).forEach(([indexStr, field]) => {
          const index = parseInt(indexStr);
          const value = row[index]?.trim() || '';

          switch (field) {
            case 'task_text':
              task.task_text = value;
              break;
            case 'task_description':
              task.task_description = value || undefined;
              break;
            case 'scheduled_date':
              task.scheduled_date = parseDate(value);
              break;
            case 'priority':
              task.priority = PRIORITY_MAPPINGS[value.toLowerCase()] || undefined;
              break;
            case 'is_completed':
              task.is_completed = COMPLETED_VALUES.includes(value.toLowerCase());
              break;
            case 'estimated_minutes':
              task.estimated_minutes = parseDuration(value);
              break;
            case 'context_tags':
              task.context_tags = parseTags(value);
              break;
          }
        });

        if (!task.task_text) {
          parseErrors.push(`Row ${i + 1}: Missing task name`);
          continue;
        }

        tasks.push(task);
      }

      setParsedTasks(tasks);
      if (parseErrors.length > 0) {
        setErrors(parseErrors);
      }
    } catch (error) {
      setErrors(['Failed to parse CSV file: ' + (error as Error).message]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'text/csv' || droppedFile?.name.endsWith('.csv')) {
      handleFileUpload(droppedFile);
    } else {
      setErrors(['Please upload a CSV file']);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileUpload(selectedFile);
    }
  };

  const downloadTemplate = () => {
    const template = `task,description,due_date,priority,estimated_minutes,tags
"Complete project proposal","Write up the Q1 goals",2024-01-15,high,60,"work,important"
"Review team updates","Check Slack messages",2024-01-16,medium,30,communication
"Weekly planning session","Plan the week ahead",2024-01-17,low,45,planning
"Send invoice to client","",2024-01-18,high,15,admin
"Research new tools","Look into project management options",2024-01-20,medium,90,research`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'task_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (parsedTasks.length === 0) return;

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in to import tasks');
        return;
      }

      const response = await supabase.functions.invoke('import-tasks', {
        body: { tasks: parsedTasks }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { imported, failed } = response.data;
      
      if (failed > 0) {
        toast.success(`Imported ${imported} tasks. ${failed} failed.`);
      } else {
        toast.success(`Successfully imported ${imported} tasks!`);
      }

      onImportComplete();
      handleClose();
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import tasks: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const validTasks = parsedTasks.filter(t => !t.error);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Tasks from CSV
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file from Todoist, Asana, Trello, ClickUp, or any other task manager
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Template Download */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>Need a template? Download our example CSV</span>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>

          {/* File Upload Area */}
          {!file && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
            >
              <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop your CSV file here, or
              </p>
              <label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileInput}
                  className="hidden"
                />
                <Button variant="secondary" asChild>
                  <span className="cursor-pointer">Browse Files</span>
                </Button>
              </label>
            </div>
          )}

          {/* Parsing Indicator */}
          {isParsing && (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-muted-foreground">Parsing CSV...</span>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside">
                  {errors.slice(0, 5).map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                  {errors.length > 5 && <li>...and {errors.length - 5} more errors</li>}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Preview Table */}
          {parsedTasks.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">
                    {validTasks.length} tasks ready to import
                  </span>
                  {file && (
                    <Badge variant="outline" className="ml-2">
                      {file.name}
                    </Badge>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={resetState}>
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>

              <ScrollArea className="flex-1 border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Task</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedTasks.slice(0, 50).map((task, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          <div className="max-w-[280px] truncate">{task.task_text}</div>
                          {task.task_description && (
                            <div className="text-xs text-muted-foreground truncate max-w-[280px]">
                              {task.task_description}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {task.scheduled_date || <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell>
                          {task.priority ? (
                            <Badge variant={
                              task.priority === 'high' ? 'destructive' :
                              task.priority === 'medium' ? 'default' : 'secondary'
                            }>
                              {task.priority}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {task.estimated_minutes ? `${task.estimated_minutes}m` : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell>
                          {task.is_completed ? (
                            <Badge variant="outline" className="text-green-600">Done</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {parsedTasks.length > 50 && (
                  <div className="p-2 text-center text-sm text-muted-foreground border-t">
                    Showing 50 of {parsedTasks.length} tasks
                  </div>
                )}
              </ScrollArea>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={validTasks.length === 0 || isLoading}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Import {validTasks.length} Tasks
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
